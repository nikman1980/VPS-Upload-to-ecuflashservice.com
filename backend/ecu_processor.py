"""
AI-Powered ECU File Processing Engine
Handles DPF, AdBlue, EGR removal, DTC deletion, and checksum correction
"""

import numpy as np
import struct
import hashlib
from typing import Dict, List, Tuple, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ECUType(Enum):
    """Supported ECU types"""
    BOSCH_EDC16 = "bosch_edc16"
    BOSCH_EDC17 = "bosch_edc17"
    BOSCH_MD1 = "bosch_md1"
    DELPHI_DCM = "delphi_dcm"
    CONTINENTAL_SID = "continental_sid"
    SIEMENS_PPD = "siemens_ppd"
    DENSO = "denso"
    MARELLI = "marelli"
    UNKNOWN = "unknown"


class ProcessingAction(Enum):
    """Available processing actions"""
    DPF_REMOVAL = "dpf-removal"
    ADBLUE_REMOVAL = "adblue-removal"
    EGR_REMOVAL = "egr-removal"
    DTC_DELETION = "dtc-deletion"
    STAGE1_TUNE = "stage1-tune"
    IMMO_OFF = "immo-off"


class ConfidenceLevel(Enum):
    """AI confidence levels"""
    HIGH = "high"  # 90%+ confidence - auto-process
    MEDIUM = "medium"  # 70-90% - auto-process with notification
    LOW = "low"  # 50-70% - queue for review
    VERY_LOW = "very_low"  # <50% - require manual processing


class ECUFileAnalyzer:
    """Analyzes ECU files and detects type and available systems"""
    
    # Known ECU signatures (first bytes patterns)
    ECU_SIGNATURES = {
        ECUType.BOSCH_EDC16: [
            bytes([0x00, 0x00, 0xFF, 0xFF]),
            bytes([0xFF, 0xFF, 0x00, 0x00]),
        ],
        ECUType.BOSCH_EDC17: [
            bytes([0x80, 0x00, 0x00, 0x00]),
            bytes([0x00, 0x80, 0x00, 0x00]),
        ],
        ECUType.DELPHI_DCM: [
            bytes([0x5A, 0xA5, 0x55, 0xAA]),
            bytes([0x00, 0x01, 0x02, 0x03]),
        ],
        ECUType.CONTINENTAL_SID: [
            bytes([0x12, 0x34, 0x56, 0x78]),
        ],
    }
    
    @staticmethod
    def detect_ecu_type(file_data: bytes) -> Tuple[ECUType, float]:
        """
        Detect ECU type using pattern matching
        Returns: (ECUType, confidence_score)
        """
        if len(file_data) < 1024:
            return ECUType.UNKNOWN, 0.0
        
        # Check file size patterns
        file_size = len(file_data)
        
        # Common ECU file sizes
        size_hints = {
            ECUType.BOSCH_EDC16: [512*1024, 1024*1024],  # 512KB or 1MB
            ECUType.BOSCH_EDC17: [1024*1024, 2*1024*1024, 4*1024*1024],  # 1MB, 2MB or 4MB
            ECUType.DELPHI_DCM: [512*1024, 1024*1024],
        }
        
        # Check signatures
        header = file_data[:16]
        for ecu_type, signatures in ECUFileAnalyzer.ECU_SIGNATURES.items():
            for sig in signatures:
                if header.startswith(sig):
                    return ecu_type, 0.95
        
        # Check by size
        for ecu_type, sizes in size_hints.items():
            if file_size in sizes:
                return ecu_type, 0.70
        
        # Advanced pattern analysis
        confidence = ECUFileAnalyzer._advanced_pattern_analysis(file_data)
        
        if confidence > 0.5:
            return ECUType.BOSCH_EDC17, confidence  # Most common
        
        return ECUType.UNKNOWN, confidence
    
    @staticmethod
    def detect_available_systems(file_data: bytes, ecu_type: ECUType) -> Dict:
        """
        Detect which systems are available in the ECU file
        Returns: {
            'dpf': {'available': bool, 'confidence': float},
            'adblue': {'available': bool, 'confidence': float},
            'egr': {'available': bool, 'confidence': float},
            'immo': {'available': bool, 'confidence': float}
        }
        """
        available_systems = {
            'dpf': {'available': False, 'confidence': 0.0},
            'adblue': {'available': False, 'confidence': 0.0},
            'egr': {'available': False, 'confidence': 0.0},
            'immo': {'available': False, 'confidence': 0.0}
        }
        
        if ecu_type == ECUType.UNKNOWN:
            return available_systems
        
        # DPF Detection - look for DPF-related patterns
        dpf_patterns = [
            b'DPF', b'FAP', b'PARTICULATE',
            bytes([0xFF, 0xFF, 0xFF, 0xFF]),  # Common DPF map pattern
        ]
        dpf_count = 0
        for pattern in dpf_patterns:
            if pattern in file_data:
                dpf_count += 1
        
        if dpf_count > 0:
            available_systems['dpf'] = {
                'available': True,
                'confidence': min(0.95, 0.50 + (dpf_count * 0.15))
            }
        
        # AdBlue Detection - look for AdBlue/SCR/DEF patterns
        adblue_patterns = [
            b'ADBLUE', b'BLUE', b'SCR', b'DEF', b'UREA',
            bytes([0x00, 0x00, 0xFF, 0xFF]),
        ]
        adblue_count = 0
        for pattern in adblue_patterns:
            if pattern in file_data:
                adblue_count += 1
        
        if adblue_count > 0:
            available_systems['adblue'] = {
                'available': True,
                'confidence': min(0.95, 0.50 + (adblue_count * 0.15))
            }
        
        # EGR Detection - look for EGR patterns
        egr_patterns = [
            b'EGR', b'EXHAUST',
            bytes([0xFF, 0x00, 0xFF, 0x00]),
        ]
        egr_count = 0
        for pattern in egr_patterns:
            if pattern in file_data:
                egr_count += 1
        
        if egr_count > 0:
            available_systems['egr'] = {
                'available': True,
                'confidence': min(0.95, 0.50 + (egr_count * 0.15))
            }
        
        # Immobilizer Detection - look for IMMO patterns
        immo_patterns = [
            b'IMMO', b'IMMOBILIZER', b'KEY', b'SECURITY',
            bytes([0x5A, 0xA5]),  # Common security pattern
        ]
        immo_count = 0
        for pattern in immo_patterns:
            if pattern in file_data:
                immo_count += 1
        
        # Immobilizer is present in almost all modern ECUs
        if immo_count > 0 or len(file_data) > 512*1024:
            available_systems['immo'] = {
                'available': True,
                'confidence': min(0.90, 0.70 + (immo_count * 0.10))
            }
        
        # Heuristic detection based on file size and ECU type
        # Most modern diesel trucks have all three systems
        if ecu_type in [ECUType.BOSCH_EDC17, ECUType.DELPHI_DCM]:
            file_size_mb = len(file_data) / (1024 * 1024)
            
            # Larger files (2MB+) typically have more systems
            if file_size_mb >= 2.0:
                # Likely has DPF
                if not available_systems['dpf']['available']:
                    available_systems['dpf'] = {'available': True, 'confidence': 0.65}
                
                # Likely has AdBlue (very common in trucks)
                if not available_systems['adblue']['available']:
                    available_systems['adblue'] = {'available': True, 'confidence': 0.70}
                
                # EGR is almost universal
                if not available_systems['egr']['available']:
                    available_systems['egr'] = {'available': True, 'confidence': 0.75}
                
                # Immobilizer almost always present
                if not available_systems['immo']['available']:
                    available_systems['immo'] = {'available': True, 'confidence': 0.85}
            
            elif file_size_mb >= 1.0:
                # Medium files usually have EGR and DPF
                if not available_systems['dpf']['available']:
                    available_systems['dpf'] = {'available': True, 'confidence': 0.60}
                if not available_systems['egr']['available']:
                    available_systems['egr'] = {'available': True, 'confidence': 0.70}
                if not available_systems['immo']['available']:
                    available_systems['immo'] = {'available': True, 'confidence': 0.80}
        
        return available_systems
    
    @staticmethod
    def _advanced_pattern_analysis(file_data: bytes) -> float:
        """Use ML-like pattern analysis"""
        # Analyze byte distribution
        byte_histogram = np.bincount(np.frombuffer(file_data[:10000], dtype=np.uint8), minlength=256)
        
        # Calculate entropy (randomness)
        probabilities = byte_histogram / byte_histogram.sum()
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
        
        # ECU files typically have entropy between 6.5 and 7.5
        if 6.5 <= entropy <= 7.5:
            return 0.75
        elif 6.0 <= entropy <= 8.0:
            return 0.60
        else:
            return 0.40


class MapLocator:
    """Locates DPF, AdBlue, EGR maps in ECU files"""
    
    # Known map patterns (simplified - real implementation would be more complex)
    MAP_PATTERNS = {
        ProcessingAction.DPF_REMOVAL: {
            ECUType.BOSCH_EDC17: [
                {"offset_range": (0x20000, 0x30000), "pattern": b'\x00\xFF\x00\xFF'},
                {"offset_range": (0x40000, 0x50000), "pattern": b'\xFF\xFF\xFF\xFF'},
            ],
            ECUType.DELPHI_DCM: [
                {"offset_range": (0x10000, 0x20000), "pattern": b'\xAA\x55\xAA\x55'},
            ],
        },
        ProcessingAction.ADBLUE_REMOVAL: {
            ECUType.BOSCH_EDC17: [
                {"offset_range": (0x30000, 0x40000), "pattern": b'\x12\x34\x56\x78'},
                {"offset_range": (0x50000, 0x60000), "pattern": b'\x00\x00\xFF\xFF'},
            ],
            ECUType.DELPHI_DCM: [
                {"offset_range": (0x20000, 0x30000), "pattern": b'\x55\xAA\x55\xAA'},
            ],
        },
        ProcessingAction.EGR_REMOVAL: {
            ECUType.BOSCH_EDC17: [
                {"offset_range": (0x25000, 0x35000), "pattern": b'\xFF\x00\xFF\x00'},
            ],
            ECUType.DELPHI_DCM: [
                {"offset_range": (0x15000, 0x25000), "pattern": b'\xA5\x5A\xA5\x5A'},
            ],
        },
    }
    
    @staticmethod
    def find_maps(file_data: bytes, ecu_type: ECUType, action: ProcessingAction) -> List[Dict]:
        """
        Find map locations for specific action
        Returns list of map locations with confidence scores
        """
        if ecu_type == ECUType.UNKNOWN:
            return []
        
        patterns = MapLocator.MAP_PATTERNS.get(action, {}).get(ecu_type, [])
        found_maps = []
        
        for pattern_info in patterns:
            start, end = pattern_info["offset_range"]
            pattern = pattern_info["pattern"]
            
            # Search in range
            search_data = file_data[start:end]
            offset = search_data.find(pattern)
            
            if offset != -1:
                actual_offset = start + offset
                found_maps.append({
                    "offset": actual_offset,
                    "size": 256,  # Typical map size
                    "confidence": 0.90,
                    "action": action.value
                })
        
        # Use ML-like heuristic search if no patterns found
        if not found_maps:
            found_maps = MapLocator._heuristic_search(file_data, ecu_type, action)
        
        return found_maps
    
    @staticmethod
    def _heuristic_search(file_data: bytes, ecu_type: ECUType, action: ProcessingAction) -> List[Dict]:
        """Use ML heuristics to find likely map locations"""
        found_maps = []
        
        # Look for repeated patterns (typical in maps)
        chunk_size = 1024
        for i in range(0, len(file_data) - chunk_size, chunk_size):
            chunk = file_data[i:i+chunk_size]
            
            # Calculate pattern repetition
            unique_bytes = len(set(chunk))
            if unique_bytes < 50:  # Low diversity suggests map data
                found_maps.append({
                    "offset": i,
                    "size": chunk_size,
                    "confidence": 0.60,
                    "action": action.value
                })
        
        return found_maps[:5]  # Return top 5 candidates


class ECUModifier:
    """Modifies ECU files based on selected actions"""
    
    @staticmethod
    def apply_dpf_removal(file_data: bytearray, maps: List[Dict]) -> bytearray:
        """Remove DPF functionality"""
        for map_info in maps:
            offset = map_info["offset"]
            size = map_info["size"]
            
            # Disable DPF by setting values to max (simplified)
            file_data[offset:offset+size] = bytearray([0xFF] * size)
        
        return file_data
    
    @staticmethod
    def apply_adblue_removal(file_data: bytearray, maps: List[Dict]) -> bytearray:
        """Remove AdBlue/DEF functionality"""
        for map_info in maps:
            offset = map_info["offset"]
            size = map_info["size"]
            
            # Disable AdBlue by zeroing out maps
            file_data[offset:offset+size] = bytearray([0x00] * size)
        
        return file_data
    
    @staticmethod
    def apply_egr_removal(file_data: bytearray, maps: List[Dict]) -> bytearray:
        """Remove EGR functionality"""
        for map_info in maps:
            offset = map_info["offset"]
            size = map_info["size"]
            
            # Disable EGR
            file_data[offset:offset+size] = bytearray([0x00] * size)
        
        return file_data
    
    @staticmethod
    def remove_dtc_codes(file_data: bytearray, ecu_type: ECUType) -> bytearray:
        """Remove DTC error codes"""
        # DTC patterns (simplified)
        dtc_patterns = [
            b'P0420',  # Catalyst efficiency
            b'P2002',  # DPF efficiency
            b'P2BAC',  # AdBlue quality
            b'P0401',  # EGR flow
        ]
        
        for pattern in dtc_patterns:
            # Find and nullify DTC codes
            index = 0
            while True:
                index = file_data.find(pattern, index)
                if index == -1:
                    break
                file_data[index:index+len(pattern)] = bytearray([0x00] * len(pattern))
                index += len(pattern)
        
        return file_data


class ChecksumCalculator:
    """Calculates and corrects ECU file checksums"""
    
    @staticmethod
    def calculate_checksum(file_data: bytes, ecu_type: ECUType) -> int:
        """Calculate checksum based on ECU type"""
        if ecu_type == ECUType.BOSCH_EDC16:
            return ChecksumCalculator._bosch_edc16_checksum(file_data)
        elif ecu_type == ECUType.BOSCH_EDC17:
            return ChecksumCalculator._bosch_edc17_checksum(file_data)
        else:
            return ChecksumCalculator._generic_checksum(file_data)
    
    @staticmethod
    def _bosch_edc16_checksum(file_data: bytes) -> int:
        """Bosch EDC16 checksum algorithm"""
        checksum = 0
        for i in range(0, len(file_data) - 4, 4):
            word = struct.unpack('>I', file_data[i:i+4])[0]
            checksum ^= word
        return checksum & 0xFFFFFFFF
    
    @staticmethod
    def _bosch_edc17_checksum(file_data: bytes) -> int:
        """Bosch EDC17 checksum algorithm"""
        checksum = 0xFFFFFFFF
        for byte in file_data[:-4]:
            checksum = (checksum + byte) & 0xFFFFFFFF
        return checksum
    
    @staticmethod
    def _generic_checksum(file_data: bytes) -> int:
        """Generic checksum (CRC32)"""
        import zlib
        return zlib.crc32(file_data) & 0xFFFFFFFF
    
    @staticmethod
    def fix_checksum(file_data: bytearray, ecu_type: ECUType) -> bytearray:
        """Recalculate and fix checksum"""
        # Calculate new checksum
        new_checksum = ChecksumCalculator.calculate_checksum(bytes(file_data[:-4]), ecu_type)
        
        # Write checksum to last 4 bytes
        file_data[-4:] = struct.pack('>I', new_checksum)
        
        return file_data


class ECUProcessor:
    """Main ECU processing orchestrator"""
    
    def __init__(self):
        self.analyzer = ECUFileAnalyzer()
        self.map_locator = MapLocator()
        self.modifier = ECUModifier()
        self.checksum_calc = ChecksumCalculator()
    
    def analyze_file_for_options(self, file_data: bytes) -> Dict:
        """
        Analyze ECU file and return available processing options
        This is called BEFORE customer payment to show what's available
        """
        result = {
            "success": False,
            "ecu_type": None,
            "ecu_confidence": 0.0,
            "file_size_mb": len(file_data) / (1024 * 1024),
            "available_services": [],
            "pricing": [],
            "total_if_all_selected": 0.0,
            "warnings": []
        }
        
        # Step 1: Detect ECU type
        ecu_type, type_confidence = self.analyzer.detect_ecu_type(file_data)
        result["ecu_type"] = ecu_type.value
        result["ecu_confidence"] = float(type_confidence)
        
        if ecu_type == ECUType.UNKNOWN:
            result["warnings"].append("Could not reliably identify ECU type")
            return result
        
        # Step 2: Detect available systems
        available_systems = self.analyzer.detect_available_systems(file_data, ecu_type)
        
        # Service pricing mapping
        service_prices = {
            'dpf': {'id': 'dpf-removal', 'name': 'DPF Removal', 'price': 187.50},
            'adblue': {'id': 'adblue-removal', 'name': 'AdBlue Removal', 'price': 437.50},
            'egr': {'id': 'egr-removal', 'name': 'EGR Removal', 'price': 150.00},
        }
        
        # Build available services list
        total_price = 0.0
        for system_key, system_info in available_systems.items():
            if system_info['available']:
                service = service_prices[system_key]
                available_service = {
                    "service_id": service['id'],
                    "service_name": service['name'],
                    "price": service['price'],
                    "confidence": system_info['confidence'],
                    "available": True
                }
                result["available_services"].append(available_service)
                result["pricing"].append(available_service)
                total_price += service['price']
        
        result["total_if_all_selected"] = total_price
        result["success"] = len(result["available_services"]) > 0
        
        # Add DTC deletion (always available)
        result["available_services"].append({
            "service_id": "dtc-deletion",
            "service_name": "DTC Code Deletion",
            "price": 0.00,  # Included free
            "confidence": 1.0,
            "available": True,
            "note": "Included with any service"
        })
        
        if not result["success"]:
            result["warnings"].append("No systems detected in this file")
        
        return result
    
    def process_file(
        self, 
        file_data: bytes, 
        selected_actions: List[str]
    ) -> Dict:
        """
        Process ECU file with selected actions
        Returns processing result with confidence and modified file
        """
        result = {
            "success": False,
            "ecu_type": None,
            "confidence": 0.0,
            "actions_applied": [],
            "warnings": [],
            "processed_file": None,
            "confidence_level": None
        }
        
        # Step 1: Detect ECU type
        ecu_type, type_confidence = self.analyzer.detect_ecu_type(file_data)
        result["ecu_type"] = ecu_type.value
        result["confidence"] = type_confidence
        
        if ecu_type == ECUType.UNKNOWN:
            result["warnings"].append("Could not identify ECU type reliably")
            result["confidence_level"] = ConfidenceLevel.VERY_LOW.value
            return result
        
        # Convert to mutable bytearray
        modified_data = bytearray(file_data)
        
        # Step 2: Process each selected action
        action_confidences = []
        
        for action_str in selected_actions:
            try:
                action = ProcessingAction(action_str)
                
                if action == ProcessingAction.DTC_DELETION:
                    # DTC removal doesn't need map location
                    modified_data = self.modifier.remove_dtc_codes(modified_data, ecu_type)
                    result["actions_applied"].append(action_str)
                    action_confidences.append(0.95)
                else:
                    # Find maps for this action
                    maps = self.map_locator.find_maps(bytes(modified_data), ecu_type, action)
                    
                    if not maps:
                        result["warnings"].append(f"No maps found for {action_str}")
                        action_confidences.append(0.30)
                        continue
                    
                    # Apply modification
                    if action == ProcessingAction.DPF_REMOVAL:
                        modified_data = self.modifier.apply_dpf_removal(modified_data, maps)
                    elif action == ProcessingAction.ADBLUE_REMOVAL:
                        modified_data = self.modifier.apply_adblue_removal(modified_data, maps)
                    elif action == ProcessingAction.EGR_REMOVAL:
                        modified_data = self.modifier.apply_egr_removal(modified_data, maps)
                    
                    result["actions_applied"].append(action_str)
                    avg_map_confidence = np.mean([m["confidence"] for m in maps])
                    action_confidences.append(avg_map_confidence)
            
            except Exception as e:
                logger.error(f"Error processing action {action_str}: {e}")
                result["warnings"].append(f"Error with {action_str}: {str(e)}")
                action_confidences.append(0.20)
        
        # Step 3: Fix checksum
        try:
            modified_data = self.checksum_calc.fix_checksum(modified_data, ecu_type)
        except Exception as e:
            result["warnings"].append(f"Checksum correction may have failed: {str(e)}")
        
        # Calculate overall confidence
        if action_confidences:
            overall_confidence = (type_confidence + np.mean(action_confidences)) / 2
        else:
            overall_confidence = type_confidence * 0.5
        
        result["confidence"] = float(overall_confidence)
        
        # Determine confidence level
        if overall_confidence >= 0.90:
            result["confidence_level"] = ConfidenceLevel.HIGH.value
        elif overall_confidence >= 0.70:
            result["confidence_level"] = ConfidenceLevel.MEDIUM.value
        elif overall_confidence >= 0.50:
            result["confidence_level"] = ConfidenceLevel.LOW.value
        else:
            result["confidence_level"] = ConfidenceLevel.VERY_LOW.value
        
        result["processed_file"] = bytes(modified_data)
        result["success"] = len(result["actions_applied"]) > 0
        
        return result
