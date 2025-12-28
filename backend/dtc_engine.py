"""
ECU DTC Delete Engine
Specialized engine for DTC (Diagnostic Trouble Codes) deletion with checksum correction.
"""

import struct
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import binascii


class ChecksumType(Enum):
    CRC16 = "crc16"
    CRC32 = "crc32"
    SIMPLE_SUM = "simple_sum"
    XOR = "xor"
    BOSCH_CUSTOM = "bosch_custom"
    DENSO_CUSTOM = "denso_custom"
    UNKNOWN = "unknown"


@dataclass
class DTCCode:
    """Represents a DTC (Diagnostic Trouble Code)"""
    code: str              # e.g., "P0420"
    hex_pattern: bytes     # Binary representation in ECU
    offset: int           # Location in file
    status: str           # 'found', 'deleted', 'not_found'
    description: str      # Human-readable description


@dataclass 
class DTCDeleteResult:
    """Result of DTC deletion operation"""
    success: bool
    original_file_size: int
    modified_file_size: int
    dtcs_requested: List[str]
    dtcs_found: List[Dict]
    dtcs_deleted: List[Dict]
    dtcs_not_found: List[str]
    checksum_corrected: bool
    checksum_type: str
    checksum_details: Dict
    modified_data: Optional[bytes]
    error_message: Optional[str]


class DTCDatabase:
    """Database of known DTCs and their binary representations"""
    
    # Common OBD-II DTC prefixes and their binary formats
    DTC_PREFIXES = {
        'P': 0x00,  # Powertrain
        'C': 0x40,  # Chassis  
        'B': 0x80,  # Body
        'U': 0xC0,  # Network
    }
    
    # Common DTCs with descriptions
    DTC_DESCRIPTIONS = {
        # Powertrain - Emissions/Catalyst
        'P0420': 'Catalyst System Efficiency Below Threshold (Bank 1)',
        'P0421': 'Warm Up Catalyst Efficiency Below Threshold (Bank 1)',
        'P0430': 'Catalyst System Efficiency Below Threshold (Bank 2)',
        'P0431': 'Warm Up Catalyst Efficiency Below Threshold (Bank 2)',
        
        # EGR Related
        'P0400': 'Exhaust Gas Recirculation Flow Malfunction',
        'P0401': 'Exhaust Gas Recirculation Flow Insufficient Detected',
        'P0402': 'Exhaust Gas Recirculation Flow Excessive Detected',
        'P0403': 'Exhaust Gas Recirculation Control Circuit Malfunction',
        'P0404': 'Exhaust Gas Recirculation Control Circuit Range/Performance',
        'P0405': 'Exhaust Gas Recirculation Sensor A Circuit Low',
        'P0406': 'Exhaust Gas Recirculation Sensor A Circuit High',
        'P0407': 'Exhaust Gas Recirculation Sensor B Circuit Low',
        'P0408': 'Exhaust Gas Recirculation Sensor B Circuit High',
        
        # DPF Related
        'P2002': 'Diesel Particulate Filter Efficiency Below Threshold (Bank 1)',
        'P2003': 'Diesel Particulate Filter Efficiency Below Threshold (Bank 2)',
        'P244A': 'Diesel Particulate Filter Differential Pressure Too Low (Bank 1)',
        'P244B': 'Diesel Particulate Filter Differential Pressure Too High (Bank 1)',
        'P2452': 'Diesel Particulate Filter Pressure Sensor A Circuit',
        'P2453': 'Diesel Particulate Filter Pressure Sensor A Circuit Range/Performance',
        'P2454': 'Diesel Particulate Filter Pressure Sensor A Circuit Low',
        'P2455': 'Diesel Particulate Filter Pressure Sensor A Circuit High',
        'P2458': 'Diesel Particulate Filter Regeneration Duration',
        'P2459': 'Diesel Particulate Filter Regeneration Frequency',
        'P2463': 'Diesel Particulate Filter Restriction - Soot Accumulation',
        
        # AdBlue/SCR/DEF Related
        'P20E8': 'Reductant Pressure Too Low',
        'P20EE': 'SCR NOx Catalyst Efficiency Below Threshold (Bank 1)',
        'P20EF': 'SCR NOx Catalyst Efficiency Below Threshold (Bank 2)',
        'P2200': 'NOx Sensor Circuit (Bank 1)',
        'P2201': 'NOx Sensor Circuit Range/Performance (Bank 1)',
        'P2202': 'NOx Sensor Circuit Low Input (Bank 1)',
        'P2203': 'NOx Sensor Circuit High Input (Bank 1)',
        'P2BAD': 'NOx Exceedance - SCR NOx Catalyst Efficiency Below Threshold',
        'P2BAE': 'NOx Exceedance - Derating Active',
        'P203B': 'Reductant Level Sensor Circuit Range/Performance',
        'P203F': 'Reductant Level Too Low',
        'P207F': 'Reductant Quality Performance',
        'P20A1': 'Reductant Injection Malfunction',
        
        # Oxygen/Lambda Sensors
        'P0130': 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)',
        'P0131': 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)',
        'P0132': 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)',
        'P0133': 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)',
        'P0134': 'O2 Sensor Circuit No Activity Detected (Bank 1 Sensor 1)',
        'P0135': 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)',
        'P0136': 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 2)',
        'P0137': 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 2)',
        'P0138': 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 2)',
        'P0139': 'O2 Sensor Circuit Slow Response (Bank 1 Sensor 2)',
        'P0140': 'O2 Sensor Circuit No Activity Detected (Bank 1 Sensor 2)',
        'P0141': 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 2)',
        
        # Turbo/Boost Related
        'P0234': 'Turbocharger/Supercharger Overboost Condition',
        'P0235': 'Turbocharger Boost Sensor A Circuit Malfunction',
        'P0236': 'Turbocharger Boost Sensor A Circuit Range/Performance',
        'P0299': 'Turbocharger/Supercharger Underboost Condition',
        
        # Glow Plug Related
        'P0380': 'Glow Plug/Heater Circuit A Malfunction',
        'P0381': 'Glow Plug/Heater Indicator Circuit Malfunction',
        'P0382': 'Glow Plug/Heater Circuit A Low',
        'P0383': 'Glow Plug/Heater Circuit A High',
        
        # Fuel System
        'P0087': 'Fuel Rail/System Pressure - Too Low',
        'P0088': 'Fuel Rail/System Pressure - Too High',
        'P0089': 'Fuel Pressure Regulator 1 Performance',
        'P0090': 'Fuel Pressure Regulator 1 Control Circuit Open',
        'P0091': 'Fuel Pressure Regulator 1 Control Circuit Low',
        'P0092': 'Fuel Pressure Regulator 1 Control Circuit High',
        
        # Swirl Flap/Intake Manifold
        'P2004': 'Intake Manifold Runner Control Stuck Open (Bank 1)',
        'P2005': 'Intake Manifold Runner Control Stuck Open (Bank 2)',
        'P2006': 'Intake Manifold Runner Control Stuck Closed (Bank 1)',
        'P2007': 'Intake Manifold Runner Control Stuck Closed (Bank 2)',
        'P2008': 'Intake Manifold Runner Control Circuit/Open (Bank 1)',
        'P2009': 'Intake Manifold Runner Control Circuit Low (Bank 1)',
    }
    
    @classmethod
    def get_description(cls, dtc_code: str) -> str:
        """Get description for a DTC code"""
        return cls.DTC_DESCRIPTIONS.get(dtc_code.upper(), f'Unknown DTC: {dtc_code}')
    
    @classmethod
    def dtc_to_binary(cls, dtc_code: str) -> List[bytes]:
        """
        Convert DTC code to possible binary representations.
        Returns multiple patterns as different ECUs store DTCs differently.
        """
        patterns = []
        dtc_code = dtc_code.upper().strip()
        
        if len(dtc_code) < 5:
            return patterns
            
        prefix = dtc_code[0]
        if prefix not in cls.DTC_PREFIXES:
            return patterns
        
        try:
            # Get numeric part
            num_part = dtc_code[1:]
            if not num_part.isalnum():
                return patterns
                
            # Pattern 1: Standard OBD-II format (2 bytes)
            first_digit = int(num_part[0], 16)
            second_digit = int(num_part[1], 16)
            third_fourth = int(num_part[2:4], 16)
            
            byte1 = cls.DTC_PREFIXES[prefix] | (first_digit << 4) | second_digit
            byte2 = third_fourth
            patterns.append(bytes([byte1, byte2]))
            
            # Pattern 2: ASCII representation
            patterns.append(dtc_code.encode('ascii'))
            
            # Pattern 3: Lowercase ASCII
            patterns.append(dtc_code.lower().encode('ascii'))
            
            # Pattern 4: With null terminator
            patterns.append(dtc_code.encode('ascii') + b'\x00')
            
            # Pattern 5: Space-separated
            patterns.append(f"{prefix} {num_part}".encode('ascii'))
            
            # Pattern 6: Hex string representation  
            hex_str = f"{byte1:02X}{byte2:02X}"
            patterns.append(bytes.fromhex(hex_str))
            
        except (ValueError, IndexError):
            pass
            
        return patterns


class ChecksumEngine:
    """Engine for calculating and correcting ECU checksums"""
    
    @staticmethod
    def crc16(data: bytes, poly: int = 0x8005, init: int = 0xFFFF) -> int:
        """Calculate CRC16 checksum"""
        crc = init
        for byte in data:
            crc ^= byte << 8
            for _ in range(8):
                if crc & 0x8000:
                    crc = (crc << 1) ^ poly
                else:
                    crc <<= 1
                crc &= 0xFFFF
        return crc
    
    @staticmethod
    def crc32(data: bytes) -> int:
        """Calculate CRC32 checksum"""
        return binascii.crc32(data) & 0xFFFFFFFF
    
    @staticmethod
    def simple_sum(data: bytes, width: int = 16) -> int:
        """Calculate simple sum checksum"""
        total = sum(data)
        if width == 8:
            return total & 0xFF
        elif width == 16:
            return total & 0xFFFF
        elif width == 32:
            return total & 0xFFFFFFFF
        return total
    
    @staticmethod
    def xor_checksum(data: bytes) -> int:
        """Calculate XOR checksum"""
        result = 0
        for byte in data:
            result ^= byte
        return result
    
    @staticmethod
    def detect_checksum_type(data: bytes) -> Tuple[ChecksumType, Dict]:
        """
        Attempt to detect the checksum type used in the ECU file.
        Returns the detected type and details about its location.
        """
        file_size = len(data)
        details = {
            "file_size": file_size,
            "possible_locations": [],
            "detected_type": ChecksumType.UNKNOWN.value
        }
        
        # Common checksum locations
        # End of file (last 2 or 4 bytes)
        if file_size >= 4:
            # Check if last 2 bytes could be CRC16
            stored_crc16 = struct.unpack('<H', data[-2:])[0]
            calc_crc16 = ChecksumEngine.crc16(data[:-2])
            if stored_crc16 == calc_crc16:
                details["checksum_offset"] = file_size - 2
                details["checksum_size"] = 2
                details["detected_type"] = ChecksumType.CRC16.value
                return ChecksumType.CRC16, details
            
            # Check CRC32
            stored_crc32 = struct.unpack('<I', data[-4:])[0]
            calc_crc32 = ChecksumEngine.crc32(data[:-4])
            if stored_crc32 == calc_crc32:
                details["checksum_offset"] = file_size - 4
                details["checksum_size"] = 4
                details["detected_type"] = ChecksumType.CRC32.value
                return ChecksumType.CRC32, details
        
        # Check for Bosch-style checksums (at specific offsets)
        bosch_offsets = [0x1FE, 0x3FE, 0x7FE, 0xFFE, 0x1FFE, 0x3FFE]
        for offset in bosch_offsets:
            if offset < file_size - 2:
                stored = struct.unpack('<H', data[offset:offset+2])[0]
                calc = ChecksumEngine.simple_sum(data[:offset], 16)
                if stored == calc:
                    details["checksum_offset"] = offset
                    details["checksum_size"] = 2
                    details["detected_type"] = ChecksumType.BOSCH_CUSTOM.value
                    return ChecksumType.BOSCH_CUSTOM, details
        
        # Default: assume simple sum at end
        details["checksum_offset"] = file_size - 2
        details["checksum_size"] = 2
        details["detected_type"] = ChecksumType.SIMPLE_SUM.value
        
        return ChecksumType.SIMPLE_SUM, details
    
    @staticmethod
    def correct_checksum(data: bytes, checksum_type: ChecksumType, details: Dict) -> bytes:
        """
        Correct/recalculate the checksum after file modification.
        """
        offset = details.get("checksum_offset", len(data) - 2)
        size = details.get("checksum_size", 2)
        
        # Create mutable copy
        modified = bytearray(data)
        
        if checksum_type == ChecksumType.CRC16:
            new_checksum = ChecksumEngine.crc16(bytes(modified[:offset]))
            modified[offset:offset+2] = struct.pack('<H', new_checksum)
            
        elif checksum_type == ChecksumType.CRC32:
            new_checksum = ChecksumEngine.crc32(bytes(modified[:offset]))
            modified[offset:offset+4] = struct.pack('<I', new_checksum)
            
        elif checksum_type == ChecksumType.SIMPLE_SUM:
            new_checksum = ChecksumEngine.simple_sum(bytes(modified[:offset]), size * 8)
            if size == 2:
                modified[offset:offset+2] = struct.pack('<H', new_checksum & 0xFFFF)
            elif size == 4:
                modified[offset:offset+4] = struct.pack('<I', new_checksum)
                
        elif checksum_type == ChecksumType.XOR:
            new_checksum = ChecksumEngine.xor_checksum(bytes(modified[:offset]))
            modified[offset] = new_checksum
            
        elif checksum_type in [ChecksumType.BOSCH_CUSTOM, ChecksumType.DENSO_CUSTOM]:
            new_checksum = ChecksumEngine.simple_sum(bytes(modified[:offset]), 16)
            modified[offset:offset+2] = struct.pack('<H', new_checksum & 0xFFFF)
        
        return bytes(modified)


class DTCDeleteEngine:
    """Main engine for DTC deletion operations"""
    
    def __init__(self):
        self.dtc_db = DTCDatabase()
        self.checksum_engine = ChecksumEngine()
    
    def analyze_file(self, file_data: bytes) -> Dict[str, Any]:
        """
        Analyze an ECU file for DTC-related content.
        Returns information about detected DTCs and checksum.
        """
        result = {
            "file_size": len(file_data),
            "detected_dtcs": [],
            "checksum_info": {},
            "ecu_info": {}
        }
        
        # Detect ECU type
        result["ecu_info"] = self._detect_ecu_type(file_data)
        
        # Detect checksum
        checksum_type, checksum_details = self.checksum_engine.detect_checksum_type(file_data)
        result["checksum_info"] = {
            "type": checksum_type.value,
            "details": checksum_details
        }
        
        # Scan for common DTCs
        for dtc_code in DTCDatabase.DTC_DESCRIPTIONS.keys():
            patterns = DTCDatabase.dtc_to_binary(dtc_code)
            for pattern in patterns:
                offset = file_data.find(pattern)
                if offset != -1:
                    result["detected_dtcs"].append({
                        "code": dtc_code,
                        "description": DTCDatabase.get_description(dtc_code),
                        "offset": offset,
                        "pattern": pattern.hex()
                    })
                    break  # Found this DTC, move to next
        
        return result
    
    def _detect_ecu_type(self, file_data: bytes) -> Dict[str, str]:
        """Detect ECU manufacturer and type from file signatures"""
        info = {
            "manufacturer": "Unknown",
            "type": "Unknown"
        }
        
        # Check for manufacturer signatures
        signatures = [
            (b'BOSCH', 'Bosch'),
            (b'Bosch', 'Bosch'),
            (b'DENSO', 'Denso'),
            (b'Denso', 'Denso'),
            (b'DELPHI', 'Delphi'),
            (b'SIEMENS', 'Siemens/Continental'),
            (b'CONTINENTAL', 'Continental'),
            (b'MARELLI', 'Magneti Marelli'),
            (b'VISTEON', 'Visteon'),
            (b'HITACHI', 'Hitachi'),
        ]
        
        for sig, name in signatures:
            if sig in file_data[:0x10000]:  # Check first 64KB
                info["manufacturer"] = name
                break
        
        # Detect ECU type based on patterns
        type_signatures = [
            (b'EDC17', 'EDC17'),
            (b'EDC16', 'EDC16'),
            (b'EDC15', 'EDC15'),
            (b'MED17', 'MED17'),
            (b'MED9', 'MED9'),
            (b'ME7', 'ME7'),
            (b'NEC', 'NEC/Renesas'),
        ]
        
        for sig, etype in type_signatures:
            if sig in file_data[:0x10000]:
                info["type"] = etype
                break
        
        return info
    
    def delete_dtcs(
        self,
        file_data: bytes,
        dtc_codes: List[str],
        correct_checksum: bool = True
    ) -> DTCDeleteResult:
        """
        Delete specified DTCs from an ECU file.
        
        Args:
            file_data: Original ECU file data
            dtc_codes: List of DTC codes to delete (e.g., ['P0420', 'P2002'])
            correct_checksum: Whether to recalculate checksum after modification
            
        Returns:
            DTCDeleteResult with details of the operation
        """
        dtcs_found = []
        dtcs_deleted = []
        dtcs_not_found = []
        
        modified_data = bytearray(file_data)
        
        for dtc_code in dtc_codes:
            dtc_code = dtc_code.upper().strip()
            patterns = DTCDatabase.dtc_to_binary(dtc_code)
            
            found = False
            instance_count = 0
            for pattern in patterns:
                offset = 0
                while True:
                    pos = bytes(modified_data).find(pattern, offset)
                    if pos == -1:
                        break
                    
                    found = True
                    instance_count += 1
                    
                    # Extract sub-code/fault byte (next 1-2 bytes after DTC pattern)
                    sub_code = None
                    sub_code_hex = None
                    fault_byte = None
                    
                    # Check bytes after the DTC pattern for sub-code
                    if pos + len(pattern) + 2 <= len(modified_data):
                        # Get the fault byte (typically 1 byte after DTC)
                        fault_byte = modified_data[pos + len(pattern)]
                        sub_code_hex = f"{fault_byte:02X}"
                        sub_code = f"{dtc_code}-{fault_byte:02d}"
                        
                        # Some ECUs use 2-byte sub-codes
                        if pos + len(pattern) + 2 <= len(modified_data):
                            extended_byte = modified_data[pos + len(pattern) + 1]
                            if extended_byte != 0x00 and extended_byte != 0xFF:
                                sub_code_hex = f"{fault_byte:02X}{extended_byte:02X}"
                    
                    dtc_info = {
                        "code": dtc_code,
                        "description": DTCDatabase.get_description(dtc_code),
                        "offset": pos,
                        "offset_hex": f"0x{pos:06X}",
                        "pattern": pattern.hex(),
                        "original_bytes": modified_data[pos:pos+len(pattern)].hex(),
                        "instance": instance_count,
                        "sub_code": sub_code,
                        "sub_code_hex": sub_code_hex,
                        "fault_byte": fault_byte,
                        "full_code": sub_code if sub_code else dtc_code
                    }
                    dtcs_found.append(dtc_info)
                    
                    # Delete by replacing with 0xFF (common masking value)
                    for i in range(len(pattern)):
                        modified_data[pos + i] = 0xFF
                    
                    # Also clear the fault byte/sub-code
                    if pos + len(pattern) < len(modified_data):
                        modified_data[pos + len(pattern)] = 0xFF
                    
                    dtc_info_deleted = dtc_info.copy()
                    dtc_info_deleted["new_bytes"] = "FF" * len(pattern)
                    dtcs_deleted.append(dtc_info_deleted)
                    
                    offset = pos + len(pattern)
                    
            if not found:
                dtcs_not_found.append(dtc_code)
        
        # Handle checksum correction
        checksum_corrected = False
        checksum_type = ChecksumType.UNKNOWN
        checksum_details = {}
        
        if correct_checksum and dtcs_deleted:
            checksum_type, checksum_details = self.checksum_engine.detect_checksum_type(file_data)
            try:
                modified_data = bytearray(
                    self.checksum_engine.correct_checksum(
                        bytes(modified_data), 
                        checksum_type, 
                        checksum_details
                    )
                )
                checksum_corrected = True
            except Exception as e:
                checksum_details["error"] = str(e)
        
        return DTCDeleteResult(
            success=len(dtcs_deleted) > 0,
            original_file_size=len(file_data),
            modified_file_size=len(modified_data),
            dtcs_requested=dtc_codes,
            dtcs_found=dtcs_found,
            dtcs_deleted=dtcs_deleted,
            dtcs_not_found=dtcs_not_found,
            checksum_corrected=checksum_corrected,
            checksum_type=checksum_type.value,
            checksum_details=checksum_details,
            modified_data=bytes(modified_data) if dtcs_deleted else None,
            error_message=None if dtcs_deleted else "No requested DTCs found in file"
        )
    
    def scan_all_dtcs(self, file_data: bytes) -> List[Dict]:
        """
        Scan file for all recognizable DTCs.
        Returns list of found DTCs with their locations.
        """
        found_dtcs = []
        seen_codes = set()
        
        # Scan for all known DTCs
        for dtc_code in DTCDatabase.DTC_DESCRIPTIONS.keys():
            patterns = DTCDatabase.dtc_to_binary(dtc_code)
            for pattern in patterns:
                offset = file_data.find(pattern)
                if offset != -1 and dtc_code not in seen_codes:
                    seen_codes.add(dtc_code)
                    found_dtcs.append({
                        "code": dtc_code,
                        "description": DTCDatabase.get_description(dtc_code),
                        "offset": offset,
                        "pattern": pattern.hex(),
                        "category": self._categorize_dtc(dtc_code)
                    })
        
        # Also scan for pattern-based DTCs (Pxxxx format)
        # Look for ASCII patterns
        text_data = file_data.decode('ascii', errors='ignore')
        dtc_pattern = re.compile(r'[PCBU][0-9A-Fa-f]{4}')
        
        for match in dtc_pattern.finditer(text_data):
            code = match.group().upper()
            if code not in seen_codes:
                seen_codes.add(code)
                offset = text_data.find(match.group())
                found_dtcs.append({
                    "code": code,
                    "description": DTCDatabase.get_description(code),
                    "offset": offset,
                    "pattern": code.encode().hex(),
                    "category": self._categorize_dtc(code)
                })
        
        return sorted(found_dtcs, key=lambda x: x["code"])
    
    def _categorize_dtc(self, dtc_code: str) -> str:
        """Categorize a DTC code"""
        code = dtc_code.upper()
        
        # DPF related
        if any(x in code for x in ['P2002', 'P2003', 'P244', 'P245', 'P246', 'P2463']):
            return 'DPF'
        
        # EGR related
        if code.startswith('P04'):
            return 'EGR'
        
        # SCR/AdBlue related
        if any(x in code for x in ['P20E', 'P22', 'P2BA', 'P203', 'P207', 'P20A']):
            return 'SCR/AdBlue'
        
        # Catalyst related
        if code.startswith('P042') or code.startswith('P043'):
            return 'Catalyst'
        
        # O2 Sensor related
        if code.startswith('P013') or code.startswith('P014'):
            return 'O2 Sensor'
        
        # Turbo related
        if code.startswith('P023') or code == 'P0299':
            return 'Turbo'
        
        # Glow plug related
        if code.startswith('P038'):
            return 'Glow Plug'
        
        # Fuel system
        if code.startswith('P008') or code.startswith('P009'):
            return 'Fuel System'
        
        # Swirl flap/intake
        if code.startswith('P200'):
            return 'Intake/Swirl Flap'
        
        return 'General'


# Create singleton instance
dtc_delete_engine = DTCDeleteEngine()
