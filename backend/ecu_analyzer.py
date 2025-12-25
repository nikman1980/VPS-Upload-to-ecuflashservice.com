"""
ECU Binary File Analyzer
Detects ECU manufacturer, extracts calibration IDs, software versions, and metadata
"""

import re
import struct
from typing import Dict, List, Optional, Tuple

class ECUAnalyzer:
    """Analyzes ECU binary files to extract metadata and identify ECU type"""
    
    # Known ECU manufacturer signatures
    MANUFACTURER_SIGNATURES = {
        'Bosch': [
            b'BOSCH', b'Bosch', b'bosch',
            b'ME17', b'ME7', b'MED17', b'MED9', b'EDC17', b'EDC16', b'EDC15',
            b'MSA', b'MS6', b'MG1', b'MD1',
            b'0261', b'0281',  # Bosch part number prefixes
        ],
        'Denso': [
            b'DENSO', b'Denso', b'denso',
            b'SH705', b'SH7058', b'SH7059', b'SH7055', b'SH72',
            b'76F00', b'MB91',
            b'89663-', b'89661-',  # Toyota/Lexus part numbers
        ],
        'Siemens': [
            b'SIEMENS', b'Siemens', b'siemens',
            b'SID', b'SIM', b'SIMOS',
            b'5WP', b'5WK', b'5WS',  # Siemens part prefixes
        ],
        'Continental': [
            b'Continental', b'CONTINENTAL',
            b'VDO', b'EMS', b'SID',
            b'A2C', b'S122', b'S180',
        ],
        'Delphi': [
            b'DELPHI', b'Delphi', b'delphi',
            b'DCM', b'DDCR', b'MT',
            b'28', b'R04',  # Delphi injector codes
        ],
        'Marelli': [
            b'MARELLI', b'Marelli', b'MAGNETI',
            b'IAW', b'MJD', b'6F3', b'6JF',
            b'HW:', b'SW:',
        ],
        'Hitachi': [
            b'HITACHI', b'Hitachi',
            b'MEC', b'A56',
        ],
        'Keihin': [
            b'KEIHIN', b'Keihin',
            b'37820-', b'37805-',  # Honda part numbers
        ],
        'Mitsubishi': [
            b'MITSUBISHI', b'MH',
            b'E6T', b'1860A',
        ],
        'Visteon': [
            b'VISTEON', b'Visteon',
            b'DCU', b'EEC',
        ],
        'Weichai': [
            b'WEICHAI', b'Weichai', b'WP10', b'WP12', b'WP13',
        ],
        'Cummins': [
            b'CUMMINS', b'Cummins', b'CM2', b'ISZ', b'ISL', b'ISB',
        ],
        'Yuchai': [
            b'YUCHAI', b'Yuchai', b'YC6',
        ],
    }
    
    # Common ECU types with their signatures
    ECU_TYPE_SIGNATURES = {
        # Bosch ECUs
        'Bosch EDC17': [b'EDC17', b'EDC 17'],
        'Bosch EDC16': [b'EDC16', b'EDC 16'],
        'Bosch ME17': [b'ME17', b'ME 17'],
        'Bosch MED17': [b'MED17', b'MED 17'],
        'Bosch MED9': [b'MED9', b'MED 9'],
        'Bosch ME7': [b'ME7', b'ME 7'],
        'Bosch MG1': [b'MG1', b'MG 1'],
        'Bosch MD1': [b'MD1', b'MD 1'],
        'Bosch MS6': [b'MS6', b'MS 6'],
        
        # Denso ECUs
        'Denso SH7058': [b'SH7058', b'SH705'],
        'Denso SH7059': [b'SH7059'],
        'Denso SH72xx': [b'SH72'],
        'Denso 76F00xx': [b'76F00'],
        
        # Siemens/Continental ECUs
        'Siemens SID': [b'SID80', b'SID20', b'SID30', b'SID'],
        'Siemens SIMOS': [b'SIMOS'],
        'Siemens SIM': [b'SIM2K', b'SIM'],
        'Continental EMS': [b'EMS31', b'EMS32', b'EMS'],
        
        # Delphi ECUs
        'Delphi DCM': [b'DCM3', b'DCM6', b'DCM7', b'DCM'],
        'Delphi MT': [b'MT80', b'MT86', b'MT'],
        
        # Marelli ECUs
        'Marelli IAW': [b'IAW5', b'IAW6', b'IAW7', b'IAW8', b'IAW'],
        'Marelli MJD': [b'MJD6', b'MJD8', b'MJD9', b'MJD'],
    }
    
    # Patterns to extract metadata
    METADATA_PATTERNS = {
        'calibration_id': [
            rb'CAL[_\s]?ID[:\s]*([A-Z0-9_\-\.]{5,20})',
            rb'CALID[:\s]*([A-Z0-9_\-\.]{5,20})',
            rb'([A-Z]{2}[0-9]{5,8}[A-Z]?)',  # Common cal ID format
        ],
        'software_version': [
            rb'SW[_\s]?VER[SION]*[:\s]*([A-Z0-9_\-\.]{3,15})',
            rb'SOFTWARE[:\s]*([A-Z0-9_\-\.]{3,15})',
            rb'S/W[:\s]*([A-Z0-9_\-\.]{3,15})',
            rb'V(\d+\.\d+[\.\d]*)',
        ],
        'hardware_version': [
            rb'HW[_\s]?VER[SION]*[:\s]*([A-Z0-9_\-\.]{3,15})',
            rb'HARDWARE[:\s]*([A-Z0-9_\-\.]{3,15})',
            rb'H/W[:\s]*([A-Z0-9_\-\.]{3,15})',
        ],
        'part_number': [
            rb'(\d{4,5}[\-][A-Z0-9]{5,8})',  # Toyota/Lexus format
            rb'([A-Z]\d{3}[A-Z]\d{5})',       # European format
            rb'P/N[:\s]*([A-Z0-9\-]{8,15})',
            rb'PART[:\s]*([A-Z0-9\-]{8,15})',
        ],
        'vin': [
            rb'([A-HJ-NPR-Z0-9]{17})',  # Standard VIN format
        ],
    }
    
    def __init__(self):
        self.results = {}
    
    def analyze(self, file_data: bytes) -> Dict:
        """
        Main analysis function - analyzes ECU binary file
        Returns dict with manufacturer, ECU type, and metadata
        """
        self.results = {
            'success': True,
            'file_size_bytes': len(file_data),
            'file_size_mb': round(len(file_data) / (1024 * 1024), 2),
            'manufacturer': None,
            'manufacturer_confidence': 0,
            'ecu_type': None,
            'ecu_type_confidence': 0,
            'metadata': {},
            'detected_signatures': [],
            'warnings': [],
        }
        
        # Detect manufacturer
        self._detect_manufacturer(file_data)
        
        # Detect ECU type
        self._detect_ecu_type(file_data)
        
        # Extract metadata
        self._extract_metadata(file_data)
        
        # Extract readable strings
        self._extract_strings(file_data)
        
        # Determine overall success
        if self.results['manufacturer'] or self.results['ecu_type']:
            self.results['success'] = True
        else:
            self.results['success'] = True  # Still success, just unknown type
            self.results['warnings'].append('Could not identify ECU type - manual processing available')
        
        return self.results
    
    def _detect_manufacturer(self, data: bytes) -> None:
        """Detect ECU manufacturer from signatures"""
        manufacturer_hits = {}
        
        for manufacturer, signatures in self.MANUFACTURER_SIGNATURES.items():
            hits = 0
            for sig in signatures:
                count = data.count(sig)
                if count > 0:
                    hits += count
                    self.results['detected_signatures'].append({
                        'type': 'manufacturer',
                        'manufacturer': manufacturer,
                        'signature': sig.decode('utf-8', errors='ignore'),
                        'count': count
                    })
            if hits > 0:
                manufacturer_hits[manufacturer] = hits
        
        if manufacturer_hits:
            # Get manufacturer with most hits
            best_match = max(manufacturer_hits, key=manufacturer_hits.get)
            total_hits = sum(manufacturer_hits.values())
            confidence = min(0.95, manufacturer_hits[best_match] / max(total_hits, 1) * 0.8 + 0.2)
            
            self.results['manufacturer'] = best_match
            self.results['manufacturer_confidence'] = round(confidence, 2)
    
    def _detect_ecu_type(self, data: bytes) -> None:
        """Detect specific ECU type"""
        ecu_hits = {}
        
        for ecu_type, signatures in self.ECU_TYPE_SIGNATURES.items():
            for sig in signatures:
                if sig in data:
                    ecu_hits[ecu_type] = ecu_hits.get(ecu_type, 0) + data.count(sig)
                    self.results['detected_signatures'].append({
                        'type': 'ecu_type',
                        'ecu_type': ecu_type,
                        'signature': sig.decode('utf-8', errors='ignore'),
                    })
        
        if ecu_hits:
            best_match = max(ecu_hits, key=ecu_hits.get)
            self.results['ecu_type'] = best_match
            self.results['ecu_type_confidence'] = min(0.9, 0.5 + ecu_hits[best_match] * 0.1)
    
    def _extract_metadata(self, data: bytes) -> None:
        """Extract metadata like calibration ID, software version, etc."""
        for field, patterns in self.METADATA_PATTERNS.items():
            for pattern in patterns:
                try:
                    matches = re.findall(pattern, data, re.IGNORECASE)
                    if matches:
                        # Filter and clean matches
                        valid_matches = []
                        for match in matches:
                            if isinstance(match, bytes):
                                try:
                                    decoded = match.decode('utf-8', errors='ignore').strip()
                                    if len(decoded) >= 3 and decoded.isprintable():
                                        valid_matches.append(decoded)
                                except:
                                    pass
                        
                        if valid_matches:
                            # Remove duplicates and get most common
                            unique_matches = list(set(valid_matches))[:5]
                            self.results['metadata'][field] = unique_matches[0] if len(unique_matches) == 1 else unique_matches
                            break
                except Exception as e:
                    pass
    
    def _extract_strings(self, data: bytes, min_length: int = 6) -> None:
        """Extract readable ASCII strings from binary"""
        strings = []
        current_string = b''
        
        for byte in data:
            if 32 <= byte <= 126:  # Printable ASCII
                current_string += bytes([byte])
            else:
                if len(current_string) >= min_length:
                    try:
                        decoded = current_string.decode('ascii')
                        # Filter out garbage
                        if any(c.isalpha() for c in decoded) and not decoded.startswith('\\'):
                            strings.append(decoded)
                    except:
                        pass
                current_string = b''
        
        # Keep only interesting strings (likely identifiers)
        interesting = []
        keywords = ['VER', 'CAL', 'ECU', 'SW', 'HW', 'BOSCH', 'DENSO', 'ID', 'PART', 
                   'DATE', 'BUILD', 'REV', 'SIEMENS', 'DELPHI', 'CONTINENTAL']
        
        for s in strings:
            s_upper = s.upper()
            if any(kw in s_upper for kw in keywords) or re.match(r'^[A-Z]{2}\d{5,}', s):
                if s not in interesting:
                    interesting.append(s)
        
        self.results['metadata']['extracted_strings'] = interesting[:20]  # Limit to 20
    
    def get_display_info(self) -> Dict:
        """Get formatted info for display"""
        ecu_display = "Unknown ECU"
        
        if self.results['ecu_type']:
            ecu_display = self.results['ecu_type']
        elif self.results['manufacturer']:
            ecu_display = f"{self.results['manufacturer']} ECU"
        
        return {
            'ecu_type': ecu_display,
            'manufacturer': self.results.get('manufacturer', 'Unknown'),
            'calibration_id': self.results['metadata'].get('calibration_id', 'N/A'),
            'software_version': self.results['metadata'].get('software_version', 'N/A'),
            'hardware_version': self.results['metadata'].get('hardware_version', 'N/A'),
            'part_number': self.results['metadata'].get('part_number', 'N/A'),
            'file_size_mb': self.results['file_size_mb'],
        }


def analyze_ecu_file(file_data: bytes) -> Dict:
    """Convenience function to analyze ECU file"""
    analyzer = ECUAnalyzer()
    return analyzer.analyze(file_data)


# Service pricing based on ECU type
SERVICE_PRICING = {
    'dpf_off': {'name': 'DPF/FAP Removal', 'price': 50.0},
    'adblue_off': {'name': 'AdBlue/SCR Removal', 'price': 60.0},
    'egr_off': {'name': 'EGR Removal', 'price': 40.0},
    'dtc_off': {'name': 'DTC/Error Code Removal', 'price': 30.0},
    'lambda_off': {'name': 'Lambda/O2 Sensor Removal', 'price': 35.0},
    'cat_off': {'name': 'Catalyst Removal', 'price': 45.0},
    'speed_limit_off': {'name': 'Speed Limiter Removal', 'price': 40.0},
    'start_stop_off': {'name': 'Start/Stop Disable', 'price': 25.0},
    'flaps_off': {'name': 'Swirl Flaps Removal', 'price': 35.0},
    'immo_off': {'name': 'Immobilizer Removal', 'price': 80.0},
    'stage1': {'name': 'Stage 1 Tuning (+20-30% Power)', 'price': 150.0},
    'stage2': {'name': 'Stage 2 Tuning (+30-50% Power)', 'price': 250.0},
}


def get_available_services(analysis_result: Dict) -> List[Dict]:
    """
    Get available services based on ECU analysis
    Returns list of services with pricing
    """
    services = []
    file_id = analysis_result.get('file_id', 'unknown')
    
    # All services are available for manual processing
    for service_id, info in SERVICE_PRICING.items():
        services.append({
            'service_id': service_id,
            'service_name': info['name'],
            'price': info['price'],
            'file_id': f"{file_id}_{service_id}",
            'available': True,
        })
    
    return services
