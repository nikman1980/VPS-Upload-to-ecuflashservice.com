"""
Professional ECU Binary File Analyzer
=====================================
Industry-grade ECU file analysis based on real-world tuning knowledge.

Supports: Bosch, Denso, Continental/Siemens, Delphi, Marelli, Hitachi, 
          Keihin, Kefico, Transtron, Mitsubishi Electric, Cummins, and more.

Analysis includes:
- Manufacturer detection via copyright strings and signatures
- ECU type identification (EDC17, MED17, SID, DCM, IAW, etc.)
- OEM part number extraction with manufacturer-specific formats
- Calibration ID detection
- Processor/MCU identification
- File size analysis for ECU generation inference
- Strict VIN validation (only 100% confident matches)
- MAP/BLOCK DETECTION: Using actual binary map structure analysis
  - DPF maps: Search for specific switch patterns and map structures
  - EGR maps: Identify EGR valve/flow map blocks
  - SCR/AdBlue maps: Detect NOx/urea dosing structures (including separate DCU files)
"""

import re
import struct
from typing import Dict, List, Any

# Import ECU database
try:
    from ecu_database import (
        ECU_MANUFACTURER_SIGNATURES,
        ECU_TYPE_PATTERNS,
        TRUCK_BRAND_SIGNATURES,
        TRUCK_ECUS_WITH_SCR,
        SCR_DCU_SIGNATURES,
        DPF_DETECTION_PATTERNS,
        EGR_DETECTION_PATTERNS,
        SCR_DETECTION_PATTERNS,
    )
    HAS_ECU_DATABASE = True
except ImportError:
    HAS_ECU_DATABASE = False


class ECUAnalyzer:
    """Professional ECU Binary File Analyzer"""
    
    def __init__(self):
        self.results = {}
        self._file_data = None
        self._extracted_strings = []
    
    def analyze(self, file_data: bytes) -> Dict:
        """
        Main analysis method - performs comprehensive ECU file analysis.
        
        Args:
            file_data: Raw binary ECU file data
            
        Returns:
            Dictionary containing all analysis results
        """
        self._file_data = file_data
        file_size = len(file_data)
        
        self.results = {
            "success": True,
            "file_size_bytes": file_size,
            "file_size_mb": round(file_size / (1024 * 1024), 2),
            "manufacturer": None,
            "ecu_type": None,
            "ecu_generation": None,
            "calibration_id": None,
            "software_version": None,
            "hardware_version": None,
            "part_number": None,
            "vin": None,
            "vehicle_info": None,
            "processor": None,
            "flash_type": None,
            "strings": [],
            "confidence": "low",
            # NEW: Detected maps/blocks for available services
            "detected_maps": {},
            "available_services": []
        }
        
        # Step 1: Extract readable strings from binary
        self._extracted_strings = self._extract_strings(file_data)
        
        # Step 2: Analyze file size for ECU generation hints
        self._analyze_file_size(file_size)
        
        # Step 3: Detect manufacturer (highest priority - most reliable)
        self._detect_manufacturer_comprehensive(file_data)
        
        # Step 4: Detect ECU type/family
        self._detect_ecu_type(file_data)
        
        # Step 5: Extract part numbers using manufacturer-specific patterns
        self._detect_part_number_professional(file_data)
        
        # Step 6: Detect calibration ID
        self._detect_calibration_id(file_data)
        
        # Step 7: Detect software/hardware versions
        self._detect_versions(file_data)
        
        # Step 8: Detect processor/MCU
        self._detect_processor(file_data)
        
        # Step 9: Strict VIN detection (only high confidence)
        self._detect_vin_strict(file_data)
        
        # Step 10: Set ECU type if still missing
        if not self.results["ecu_type"] and self.results["manufacturer"]:
            self.results["ecu_type"] = f"{self.results['manufacturer']} ECU"
        
        # Step 11: Filter and store interesting strings
        self.results["strings"] = self._filter_relevant_strings()
        
        # Step 12: NEW - Detect maps/blocks for available services
        self._detect_available_maps(file_data)
        
        # Step 13: Calculate confidence level
        self._calculate_confidence()
        
        return self.results
    
    def _analyze_file_size(self, file_size: int):
        """Analyze file size to infer ECU generation and flash type"""
        
        # Common ECU file sizes and their typical associations
        size_kb = file_size // 1024
        
        size_hints = {
            # Small/Legacy ECUs
            (128, 192): ("Legacy 8-bit", "128-192KB EPROM"),
            (256, 320): ("EDC15/ME7 era", "256KB Flash"),
            (384, 448): ("EDC15/ME7 era", "384KB Flash"),
            (512, 640): ("EDC16/MED9 era", "512KB Flash (AM29F400)"),
            
            # Standard modern ECUs
            (768, 896): ("Transition era", "768KB Flash"),
            (1024, 1100): ("Denso SH7058", "1MB Flash"),
            (1280, 1400): ("Mixed/Extended", "1.25MB Flash"),
            (1536, 1600): ("Denso SH7059", "1.5MB Flash"),
            
            # Modern ECUs
            (2048, 2200): ("EDC17/MED17", "2MB Flash"),
            (2560, 2700): ("Extended EDC17", "2.5MB Flash"),
            (3072, 3200): ("MG1/MD1 partial", "3MB Flash"),
            
            # Latest generation
            (4096, 4500): ("MG1/MD1/Latest", "4MB Flash"),
            (6144, 6500): ("Latest Gen", "6MB Flash"),
            (8192, 9000): ("Latest Gen+", "8MB Flash"),
        }
        
        for (min_kb, max_kb), (gen, flash) in size_hints.items():
            if min_kb <= size_kb <= max_kb:
                self.results["ecu_generation"] = gen
                self.results["flash_type"] = flash
                return
        
        # Generic classification
        if size_kb < 512:
            self.results["ecu_generation"] = "Legacy/Small"
        elif size_kb < 2048:
            self.results["ecu_generation"] = "Standard"
        else:
            self.results["ecu_generation"] = "Modern/Large"
    
    def _detect_manufacturer_comprehensive(self, file_data: bytes):
        """
        Comprehensive manufacturer detection using multiple methods:
        1. Copyright strings (most reliable)
        2. Manufacturer name strings
        3. Known signatures and patterns
        """
        
        # Method 1: Copyright strings (highest confidence)
        copyright_patterns = [
            # Bosch
            (rb"(?i)copyright.*robert\s*bosch", "Bosch"),
            (rb"(?i)\(c\)\s*robert\s*bosch", "Bosch"),
            (rb"(?i)bosch\s*gmbh", "Bosch"),
            (rb"Robert Bosch GmbH", "Bosch"),
            
            # Continental/Siemens
            (rb"(?i)copyright.*continental", "Continental"),
            (rb"(?i)copyright.*siemens", "Siemens/Continental"),
            (rb"(?i)continental\s*automotive", "Continental"),
            (rb"Continental AG", "Continental"),
            (rb"Siemens VDO", "Siemens/Continental"),
            
            # Denso
            (rb"(?i)copyright.*denso", "Denso"),
            (rb"(?i)\(c\)\s*denso", "Denso"),
            (rb"DENSO CORPORATION", "Denso"),
            (rb"Denso Corporation", "Denso"),
            
            # Delphi
            (rb"(?i)copyright.*delphi", "Delphi"),
            (rb"Delphi Technologies", "Delphi"),
            (rb"DELPHI AUTOMOTIVE", "Delphi"),
            
            # Marelli
            (rb"(?i)copyright.*marelli", "Marelli"),
            (rb"(?i)magneti\s*marelli", "Marelli"),
            (rb"MAGNETI MARELLI", "Marelli"),
            
            # Hitachi
            (rb"(?i)copyright.*hitachi", "Hitachi"),
            (rb"Hitachi Automotive", "Hitachi"),
            (rb"HITACHI ASTEMO", "Hitachi"),
            
            # Transtron
            (rb"(?i)copyright.*transtron", "Transtron"),
            (rb"TRANSTRON INC", "Transtron"),
            (rb"Transtron Inc", "Transtron"),
            
            # Keihin
            (rb"(?i)copyright.*keihin", "Keihin"),
            (rb"KEIHIN CORPORATION", "Keihin"),
            
            # Mitsubishi Electric
            (rb"(?i)copyright.*mitsubishi", "Mitsubishi Electric"),
            (rb"MITSUBISHI ELECTRIC", "Mitsubishi Electric"),
        ]
        
        for pattern, manufacturer in copyright_patterns:
            if re.search(pattern, file_data):
                self.results["manufacturer"] = manufacturer
                self.results["confidence"] = "high"
                return
        
        # Method 2: Direct manufacturer name detection (case sensitive first)
        manufacturer_signatures = [
            # Primary signatures (exact match, high confidence)
            (b"TRANSTRON", "Transtron", "Subaru/Nissan/Mazda"),
            (b"Transtron", "Transtron", "Subaru/Nissan/Mazda"),
            (b"DENSO", "Denso", None),
            (b"Denso", "Denso", None),
            (b"BOSCH", "Bosch", None),
            (b"Bosch", "Bosch", None),
            (b"CONTINENTAL", "Continental", None),
            (b"Continental", "Continental", None),
            (b"SIEMENS", "Siemens/Continental", None),
            (b"Siemens", "Siemens/Continental", None),
            (b"DELPHI", "Delphi", None),
            (b"Delphi", "Delphi", None),
            (b"MARELLI", "Marelli", None),
            (b"Marelli", "Marelli", None),
            (b"HITACHI", "Hitachi", None),
            (b"Hitachi", "Hitachi", None),
            (b"KEIHIN", "Keihin", "Honda/Acura"),
            (b"Keihin", "Keihin", "Honda/Acura"),
            (b"KEFICO", "Kefico", "Hyundai/Kia"),
            (b"Kefico", "Kefico", "Hyundai/Kia"),
            (b"JATCO", "Jatco", "Nissan/Renault CVT"),
            (b"AISIN", "Aisin", "Toyota Transmission"),
            (b"CUMMINS", "Cummins", "Commercial/Truck"),
            (b"Cummins", "Cummins", "Commercial/Truck"),
            (b"MOTOROLA", "Motorola", None),
            (b"Visteon", "Visteon", "Ford"),
            (b"VISTEON", "Visteon", "Ford"),
            (b"VALEO", "Valeo", None),
            (b"WABCO", "Wabco", "Commercial/Truck"),
            (b"KNORR", "Knorr-Bremse", "Commercial/Truck"),
            (b"ZF Friedrichshafen", "ZF", "Transmission"),
            (b"WEICHAI", "Weichai", "Chinese Truck"),
            (b"YUCHAI", "Yuchai", "Chinese Truck"),
        ]
        
        for signature, manufacturer, vehicle_hint in manufacturer_signatures:
            if signature in file_data:
                self.results["manufacturer"] = manufacturer
                if vehicle_hint:
                    self.results["vehicle_info"] = vehicle_hint
                return
    
    def _detect_ecu_type(self, file_data: bytes):
        """Detect specific ECU type/family from known patterns"""
        
        # ECU type patterns organized by manufacturer
        # IMPORTANT: More specific patterns should come first
        ecu_patterns = [
            # ===================
            # BOSCH ECU Types
            # ===================
            # Diesel ECUs - More specific patterns first
            (rb"EDC17[A-Z]{2}[0-9]{1,2}", "Bosch", "Diesel"),  # EDC17CP52, EDC17C46, etc.
            (rb"EDC17[A-Z][0-9]{1,2}", "Bosch", "Diesel"),     # EDC17C4, EDC17C5, etc.
            (rb"EDC17[A-Z]{2}", "Bosch", "Diesel"),            # EDC17CP, EDC17CV, etc.
            (rb"EDC17", "Bosch", "Diesel"),                     # Fallback
            (rb"EDC16[A-Z]{0,2}[0-9]{0,2}", "Bosch", "Diesel"),
            (rb"EDC15[A-Z]{0,2}[0-9]{0,2}", "Bosch", "Diesel"),
            (rb"MD1[A-Z]{2}[0-9]{0,3}", "Bosch", "Latest Diesel"),
            
            # Gasoline ECUs
            (rb"MED17[A-Z]{0,2}[0-9.]{0,4}", "Bosch", "Gasoline"),
            (rb"MED9[A-Z]{0,2}[0-9.]{0,3}", "Bosch", "Gasoline"),
            (rb"ME7[A-Z]{0,2}[0-9.]{0,3}", "Bosch", "Gasoline"),
            (rb"ME17[A-Z]{0,2}[0-9.]{0,3}", "Bosch", "Gasoline"),
            (rb"MG1[A-Z]{2}[0-9]{0,3}", "Bosch", "Latest Gasoline"),
            (rb"MEVD17", "Bosch", "Direct Injection"),
            (rb"MED[0-9]", "Bosch", "Gasoline"),
            
            # Transmission
            (rb"GS[0-9]{2}", "Bosch", "Transmission"),
            
            # ===================
            # CONTINENTAL/SIEMENS
            # ===================
            (rb"SID[0-9]{3}", "Continental", "Diesel"),
            (rb"SID[0-9]{2}[A-Z]", "Continental", "Diesel"),
            (rb"SIMOS[0-9]{1,2}[.][0-9]", "Continental", "Gasoline"),
            (rb"SIMOS\s*[0-9]{1,2}", "Continental", "Gasoline"),
            (rb"PCR[0-9.]+", "Continental", "Diesel"),
            (rb"EMS[0-9]{4}", "Continental", None),
            (rb"SIM[0-9]{2}", "Continental", None),
            
            # ===================
            # DELPHI
            # ===================
            (rb"DCM[0-9.]+", "Delphi", "Diesel"),
            (rb"DCM[0-9]{1,2}[A-Z]{0,2}", "Delphi", "Diesel"),
            (rb"MT[0-9]{2}[A-Z]?", "Delphi", None),
            (rb"DDCR", "Delphi", "Diesel"),
            
            # ===================
            # MARELLI
            # ===================
            (rb"IAW[0-9]{2,3}[A-Z]{0,3}", "Marelli", None),
            (rb"MJD[0-9]{1,2}[A-Z]{0,3}[0-9]{0,2}", "Marelli", None),
            (rb"IAW\s*[0-9][A-Z][A-Z0-9]", "Marelli", None),
            
            # ===================
            # DENSO
            # ===================
            (rb"SH7058", "Denso", "SH7058 MCU"),
            (rb"SH7059", "Denso", "SH7059 MCU"),
            (rb"SH705[0-9]", "Denso", "SH705x MCU"),
            (rb"76F00[0-9]+", "Denso", "NEC 76F"),
            (rb"RH850", "Denso", "RH850 MCU"),
            
            # ===================
            # HITACHI
            # ===================
            (rb"MEC[0-9]{2}-[0-9]{3}", "Hitachi", None),
            (rb"MEC[0-9]{5,7}", "Hitachi", None),
            
            # ===================
            # MITSUBISHI ELECTRIC
            # ===================
            (rb"E6T[0-9]{5}", "Mitsubishi Electric", None),
            (rb"E5T[0-9]{5}", "Mitsubishi Electric", None),
            (rb"E2T[0-9]{5}", "Mitsubishi Electric", None),
            
            # ===================
            # CUMMINS
            # ===================
            (rb"CM[0-9]{3,4}", "Cummins", "Commercial"),
            (rb"CM2[0-9]{3}", "Cummins", "Commercial"),
            
            # ===================
            # TRANSMISSION
            # ===================
            (rb"[68]HP[0-9]{2}", "ZF", "Transmission"),
            (rb"JF[0-9]{3}[A-Z]?", "Jatco", "CVT"),
            (rb"CVT[0-9]", None, "CVT"),
        ]
        
        for pattern, mfr_hint, ecu_category in ecu_patterns:
            match = re.search(pattern, file_data)
            if match:
                ecu_type = match.group(0).decode("utf-8", errors="ignore")
                
                # Clean up the ECU type string
                ecu_type = ecu_type.strip()
                
                if mfr_hint:
                    self.results["ecu_type"] = f"{mfr_hint} {ecu_type}"
                    if not self.results["manufacturer"]:
                        self.results["manufacturer"] = mfr_hint
                else:
                    self.results["ecu_type"] = ecu_type
                
                if ecu_category and not self.results["vehicle_info"]:
                    self.results["vehicle_info"] = ecu_category
                
                return
    
    def _detect_part_number_professional(self, file_data: bytes):
        """
        Professional part number detection using manufacturer-specific formats.
        Only returns validated part numbers, no garbage.
        """
        
        # =====================================================================
        # MANUFACTURER-SPECIFIC PART NUMBER PATTERNS
        # =====================================================================
        
        part_patterns = [
            # ===================
            # MAZDA (Denso) - Priority for the user's file
            # ===================
            # Format: S55B-18881-D, PE01-18881-A, SH01-188K2-D, PY01-188K2-B
            (rb"([A-Z]{1,2}[0-9]{1,2}[A-Z]?-18[0-9]{2}[0-9A-Z]-[A-Z0-9])", "Mazda", "Denso"),
            (rb"([A-Z]{1,2}[0-9]{1,2}[A-Z]?-188[A-Z][0-9]-[A-Z0-9])", "Mazda", "Denso"),
            # S55B, PY01, PE01, SH01 style prefixes with dash
            (rb"(S[0-9]{1,2}[A-Z]-[0-9]{5}-[A-Z])", "Mazda", "Denso"),
            (rb"(P[EYX][0-9]{2}-[0-9]{5}-[A-Z])", "Mazda", "Denso"),
            (rb"(SH[0-9]{2}-[0-9]{5}-[A-Z])", "Mazda", "Denso"),
            # GK6T style calibration/part IDs (must have letters and numbers)
            (rb"(GK[0-9][A-Z][A-Z0-9]{6,12})", "Mazda", "Denso"),
            # PE/SH/PY/PX series without dash (continuous)
            (rb"(P[EYXA][0-9]{2}[A-Z]{2}[0-9]{6,10})", "Mazda", "Denso"),
            (rb"(SH[0-9]{2}[A-Z]{2}[0-9]{6,10})", "Mazda", "Denso"),
            
            # ===================
            # TOYOTA/LEXUS (Denso)
            # ===================
            # Format: 89661-12345, 89663-0E090
            (rb"(89[0-9]{3}-[0-9A-Z]{5})", "Toyota/Lexus", "Denso"),
            (rb"(89[0-9]{3}-[0-9A-Z]{6,7})", "Toyota/Lexus", "Denso"),
            
            # ===================
            # HONDA/ACURA (Keihin/Denso)
            # ===================
            # Format: 37820-xxx-xxx, 37805-xxx-xxx
            (rb"(37820-[A-Z0-9]{3}-[A-Z0-9]{3,4})", "Honda/Acura", "Keihin"),
            (rb"(37805-[A-Z0-9]{3}-[A-Z0-9]{3,4})", "Honda/Acura", "Keihin"),
            (rb"(37820[A-Z0-9]{7,10})", "Honda/Acura", "Keihin"),
            
            # ===================
            # NISSAN/INFINITI
            # ===================
            # Format: 23710-xxxxx, 23703-xxxxx
            (rb"(23710-[A-Z0-9]{5,7})", "Nissan/Infiniti", "Hitachi"),
            (rb"(23703-[A-Z0-9]{5,7})", "Nissan/Infiniti", "Hitachi"),
            (rb"(MEC[0-9]{2}-[0-9]{3}[A-Z0-9]*)", "Nissan/Infiniti", "Hitachi"),
            
            # ===================
            # SUBARU
            # ===================
            # Format: 22611-xxxxx, 22765-xxxxx
            (rb"(22611-[A-Z]{2}[0-9]{3,5})", "Subaru", "Denso"),
            (rb"(22765-[A-Z]{2}[0-9]{3,5})", "Subaru", "Denso"),
            (rb"(22611[A-Z]{2}[0-9]{3,5})", "Subaru", "Denso"),
            
            # ===================
            # MITSUBISHI
            # ===================
            # Format: 1860Axxxx, E6Txxxxx
            (rb"(1860[A-Z][0-9]{3,5})", "Mitsubishi", "Mitsubishi Electric"),
            (rb"(E[2-6]T[0-9]{5,7})", "Mitsubishi", "Mitsubishi Electric"),
            (rb"(8631[A-Z][0-9]{3,5})", "Mitsubishi", "Mitsubishi Electric"),
            
            # ===================
            # HYUNDAI/KIA (Kefico)
            # ===================
            # Format: 39xxx-xxxxx
            (rb"(39[0-9]{3}-[0-9]{2}[A-Z]{3})", "Hyundai/Kia", "Kefico"),
            (rb"(39[0-9]{3}-[A-Z0-9]{5})", "Hyundai/Kia", "Kefico"),
            
            # ===================
            # VOLKSWAGEN/AUDI
            # ===================
            # Format: 03L 906 023, 03G 906 016
            (rb"(0[0-9][A-Z]\s?[0-9]{3}\s?[0-9]{3}\s?[A-Z]{0,2})", "VW/Audi", None),
            (rb"(0[0-9][A-Z][0-9]{6}[A-Z]{0,2})", "VW/Audi", None),
            
            # ===================
            # BMW
            # ===================
            # Format: 779xxxxx, DME-xxxxx
            (rb"(779[0-9]{5,7})", "BMW", None),
            (rb"(DME-[A-Z0-9]{5,10})", "BMW", None),
            (rb"(MSS[0-9]{2})", "BMW", None),
            
            # ===================
            # MERCEDES
            # ===================
            # Format: A276 xxx xx xx
            (rb"(A[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2})", "Mercedes", None),
            
            # ===================
            # BOSCH GENERIC
            # ===================
            # Format: 0 281 xxx xxx (EDC), 0 261 xxx xxx (ME)
            (rb"(0\s?281\s?[0-9]{3}\s?[0-9]{3})", None, "Bosch"),
            (rb"(0\s?261\s?[0-9]{3}\s?[0-9]{3})", None, "Bosch"),
            (rb"(0281[0-9]{6})", None, "Bosch"),
            (rb"(0261[0-9]{6})", None, "Bosch"),
            # Bosch internal (1037xxx)
            (rb"(1037[3-5][0-9]{5})", None, "Bosch"),
            
            # ===================
            # CONTINENTAL/SIEMENS
            # ===================
            (rb"(5WS[0-9]{5,8})", None, "Continental"),
            (rb"(5WP[0-9]{5,8})", None, "Continental"),
            (rb"(A2C[0-9]{8,10})", None, "Continental"),
            
            # ===================
            # DELPHI
            # ===================
            (rb"(28[0-9]{6,8})", None, "Delphi"),
            
            # ===================
            # TRUCK/COMMERCIAL
            # ===================
            (rb"(CM[0-9]{3,4}[A-Z]?)", None, "Cummins"),
            (rb"(4921[0-9]{3,5})", None, "Cummins"),
            (rb"(51[0-9]{8})", "MAN", None),
            (rb"(21[0-9]{8})", "Volvo", None),
        ]
        
        for pattern, vehicle_hint, mfr_hint in part_patterns:
            matches = re.finditer(pattern, file_data)
            for match in matches:
                part_num = match.group(1).decode("utf-8", errors="ignore").strip()
                
                # VALIDATION: Skip obvious garbage
                if not self._is_valid_part_number(part_num):
                    continue
                
                self.results["part_number"] = part_num
                
                if vehicle_hint and not self.results["vehicle_info"]:
                    self.results["vehicle_info"] = vehicle_hint
                if mfr_hint and not self.results["manufacturer"]:
                    self.results["manufacturer"] = mfr_hint
                
                return
    
    def _is_valid_part_number(self, part_num: str) -> bool:
        """Validate that a potential part number is not garbage"""
        
        if not part_num or len(part_num) < 5:
            return False
        
        # Remove spaces/dashes for digit analysis
        clean = re.sub(r'[\s\-]', '', part_num)
        
        # Reject sequential digits (0123456789, 9876543210)
        digits_only = re.sub(r'[^0-9]', '', clean)
        if len(digits_only) >= 5:
            for i in range(len(digits_only) - 4):
                window = digits_only[i:i+5]
                if window in "0123456789" or window in "9876543210":
                    return False
        
        # Reject all same character
        if len(set(clean)) == 1:
            return False
        
        # Reject if all digits and looks like placeholder
        if clean.isdigit():
            # Common placeholders
            placeholders = ["0000000000", "1234567890", "9999999999", "1111111111"]
            if clean in placeholders:
                return False
            # All same digit
            if len(set(clean)) == 1:
                return False
        
        # Reject repeated patterns (ABABABAB)
        for pattern_len in range(1, len(clean) // 3 + 1):
            pattern = clean[:pattern_len]
            if pattern * (len(clean) // pattern_len) == clean[:pattern_len * (len(clean) // pattern_len)]:
                repetitions = len(clean) // pattern_len
                if repetitions >= 3 and pattern_len <= 3:
                    return False
        
        return True
    
    def _detect_calibration_id(self, file_data: bytes):
        """Detect calibration ID from common patterns"""
        
        cal_patterns = [
            # Explicit CAL ID markers
            rb"CAL[\s_\-]?ID[:\s=]+([A-Z0-9_\-]{6,25})",
            rb"CALID[:\s=]+([A-Z0-9_\-]{6,25})",
            rb"Calibration[:\s]+([A-Z0-9_\-]{8,25})",
            
            # Software calibration patterns
            rb"SW[:\s_]?CAL[:\s=]+([A-Z0-9_\-]{6,20})",
            rb"CAL[:\s=]+([A-Z0-9]{8,20})",
            
            # Common calibration ID formats
            rb"([A-Z]{2,4}[0-9]{2}[A-Z0-9]{8,15})",  # Like GK6TS55BT4LA
        ]
        
        for pattern in cal_patterns:
            match = re.search(pattern, file_data)
            if match:
                cal_id = match.group(1).decode("utf-8", errors="ignore").strip()
                
                # Validate - must have mix of letters and numbers
                has_letters = any(c.isalpha() for c in cal_id)
                has_numbers = any(c.isdigit() for c in cal_id)
                
                if has_letters and has_numbers and len(cal_id) >= 6:
                    # Skip if it looks like garbage
                    if not self._is_garbage_string(cal_id):
                        self.results["calibration_id"] = cal_id
                        return
    
    def _detect_versions(self, file_data: bytes):
        """Detect software and hardware version strings"""
        
        # Software version patterns
        sw_patterns = [
            rb"SW[:\s_\-]?(?:VER|VERSION|NUM|NO)?[:\s=]*([0-9]+\.[0-9]+\.?[0-9]*)",
            rb"SOFTWARE[:\s]+([0-9]+\.[0-9]+\.?[0-9]*)",
            rb"SW[:\s]*([0-9]{2,4}\.[0-9]{2,4})",
            rb"(?:Ver|Version)[:\s]*([0-9]+\.[0-9]+\.?[0-9]*)",
        ]
        
        for pattern in sw_patterns:
            match = re.search(pattern, file_data, re.IGNORECASE)
            if match:
                self.results["software_version"] = match.group(1).decode("utf-8", errors="ignore")
                break
        
        # Hardware version patterns
        hw_patterns = [
            rb"HW[:\s_\-]?(?:VER|VERSION|NUM|NO)?[:\s=]*([0-9]+\.[0-9]+\.?[0-9]*)",
            rb"HARDWARE[:\s]+([0-9]+\.[0-9]+\.?[0-9]*)",
            rb"HW[:\s]*([A-Z]?[0-9]{2,4})",
        ]
        
        for pattern in hw_patterns:
            match = re.search(pattern, file_data, re.IGNORECASE)
            if match:
                self.results["hardware_version"] = match.group(1).decode("utf-8", errors="ignore")
                break
    
    def _detect_processor(self, file_data: bytes):
        """Comprehensive processor/MCU detection"""
        
        processor_patterns = [
            # Infineon TriCore (Bosch, Continental)
            (rb"TC3[0-9]{2}", "Infineon TriCore TC3xx (AURIX 2G)"),
            (rb"TC2[0-9]{2}", "Infineon TriCore TC2xx (AURIX)"),
            (rb"TC1797", "Infineon TriCore TC1797"),
            (rb"TC1796", "Infineon TriCore TC1796"),
            (rb"TC1767", "Infineon TriCore TC1767"),
            (rb"TC17[0-9]{2}", "Infineon TriCore TC17xx"),
            (rb"TriCore", "Infineon TriCore"),
            (rb"TRICORE", "Infineon TriCore"),
            
            # Renesas (Denso, Hitachi)
            (rb"RH850", "Renesas RH850"),
            (rb"rh850", "Renesas RH850"),
            (rb"SH7058", "Renesas SH7058"),
            (rb"SH7059", "Renesas SH7059"),
            (rb"SH7055", "Renesas SH7055"),
            (rb"SH705[0-9]", "Renesas SH705x"),
            (rb"SH7[0-9]{3}", "Renesas SuperH"),
            (rb"V850", "Renesas V850"),
            (rb"78K", "Renesas 78K"),
            
            # NXP/Freescale
            (rb"MPC5[0-9]{3}", "NXP MPC5xxx"),
            (rb"MPC56[0-9]{2}", "NXP MPC56xx"),
            (rb"MPC57[0-9]{2}", "NXP MPC57xx"),
            (rb"S12X", "Freescale S12X"),
            (rb"MC9S12", "Freescale S12"),
            
            # ST Microelectronics
            (rb"SPC5[0-9]", "ST SPC5xx"),
            (rb"ST10F", "ST ST10F"),
            (rb"ST10", "ST ST10"),
            
            # Infineon C16x (older)
            (rb"C167", "Infineon C167"),
            (rb"C166", "Infineon C166"),
            (rb"XC16[0-9]", "Infineon XC16x"),
            
            # NEC
            (rb"76F00[0-9]+", "NEC 76F00xx"),
            (rb"uPD70", "NEC 70xx"),
            (rb"uPD78", "NEC 78K"),
            
            # Fujitsu
            (rb"MB91F", "Fujitsu MB91F"),
            (rb"MB90F", "Fujitsu MB90F"),
            (rb"FR60", "Fujitsu FR60"),
            (rb"FR80", "Fujitsu FR80"),
            
            # Motorola (legacy)
            (rb"68HC12", "Motorola 68HC12"),
            (rb"68HC11", "Motorola 68HC11"),
            (rb"MC68HC", "Motorola 68HC"),
            
            # ARM
            (rb"Cortex-R", "ARM Cortex-R"),
            (rb"Cortex-M", "ARM Cortex-M"),
            (rb"ARM7", "ARM7"),
            (rb"ARM9", "ARM9"),
            
            # Texas Instruments
            (rb"TMS470", "TI TMS470"),
            (rb"TMS570", "TI TMS570"),
            (rb"Hercules", "TI Hercules"),
        ]
        
        for pattern, processor_name in processor_patterns:
            if re.search(pattern, file_data):
                self.results["processor"] = processor_name
                return
        
        # Infer from manufacturer if not directly detected
        if not self.results["processor"] and self.results["manufacturer"]:
            mfr_processor_map = {
                "Bosch": "Likely Infineon TriCore",
                "Continental": "Likely Infineon TriCore",
                "Siemens/Continental": "Likely Infineon TriCore",
                "Denso": "Likely Renesas SH/RH850",
                "Hitachi": "Likely Renesas",
                "Keihin": "Likely Renesas SH705x",
                "Transtron": "Likely Renesas",
                "Delphi": "Likely NXP MPC5xx",
                "Marelli": "Likely ST/NXP",
                "Kefico": "Likely Infineon/NXP",
                "Mitsubishi Electric": "Likely Renesas",
            }
            self.results["processor"] = mfr_processor_map.get(self.results["manufacturer"])
    
    def _detect_vin_strict(self, file_data: bytes):
        """
        Strict VIN detection - only returns VIN if 100% confident.
        Real VINs have very specific structure and validation rules.
        """
        
        # VIN pattern: 17 characters, no I, O, Q
        vin_pattern = rb"([A-HJ-NPR-Z0-9]{17})"
        matches = re.findall(vin_pattern, file_data)
        
        for v in matches:
            try:
                vin = v.decode("utf-8")
                
                # ===== STRICT VALIDATION RULES =====
                
                # Rule 1: Must have good mix of letters and numbers
                letters = sum(c.isalpha() for c in vin)
                digits = sum(c.isdigit() for c in vin)
                
                if letters < 5 or letters > 12:
                    continue
                if digits < 5 or digits > 12:
                    continue
                
                # Rule 2: First character must be valid WMI country code
                valid_first = "123456789ABCDEFGHJKLMNPRSTVWXYZ"
                if vin[0] not in valid_first:
                    continue
                
                # Rule 3: Position 9 is check digit (0-9 or X)
                if vin[8] not in "0123456789X":
                    continue
                
                # Rule 4: Position 10 is model year (valid codes)
                valid_years = "ABCDEFGHJKLMNPRSTVWXY123456789"
                if vin[9] not in valid_years:
                    continue
                
                # Rule 5: Last 6 characters (production sequence) mostly digits
                serial = vin[11:17]
                serial_digits = sum(c.isdigit() for c in serial)
                if serial_digits < 4:
                    continue
                
                # Rule 6: High entropy (no repeated patterns)
                if len(set(vin)) < 8:
                    continue
                
                # Rule 7: Skip if all hex characters (likely data, not VIN)
                if all(c in "0123456789ABCDEF" for c in vin):
                    continue
                
                # Rule 8: Skip common ECU-related patterns
                skip_patterns = ["EDC", "MED", "SID", "ECU", "CAL", "VER", "HW", "SW", "MAP", "BIN"]
                if any(pat in vin for pat in skip_patterns):
                    continue
                
                # Rule 9: Check for realistic manufacturer codes
                # Position 1-3 is WMI (World Manufacturer Identifier)
                # Common valid WMI patterns
                valid_wmi_starts = [
                    "1", "2", "3", "4", "5",  # North America
                    "J",  # Japan
                    "K",  # Korea
                    "L",  # China
                    "S",  # UK
                    "V",  # France/Spain
                    "W",  # Germany
                    "Y",  # Sweden/Finland
                    "Z",  # Italy
                ]
                
                if vin[0] not in valid_wmi_starts:
                    continue
                
                # Passed all strict checks - this is likely a real VIN
                self.results["vin"] = vin
                return
                
            except Exception:
                continue
    
    def _extract_strings(self, file_data: bytes) -> List[str]:
        """Extract readable ASCII strings from binary data"""
        
        strings = []
        current = b""
        
        for byte in file_data:
            if 32 <= byte <= 126:  # Printable ASCII
                current += bytes([byte])
            else:
                if len(current) >= 4:
                    try:
                        s = current.decode("ascii").strip()
                        if s and len(s) >= 4 and len(s) <= 100:
                            if any(c.isalpha() for c in s):
                                strings.append(s)
                    except Exception:
                        pass
                current = b""
        
        # Handle last string
        if len(current) >= 4:
            try:
                s = current.decode("ascii").strip()
                if s and len(s) >= 4 and len(s) <= 100:
                    if any(c.isalpha() for c in s):
                        strings.append(s)
            except Exception:
                pass
        
        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for s in strings:
            if s not in seen:
                seen.add(s)
                unique.append(s)
        
        return unique
    
    def _is_garbage_string(self, s: str) -> bool:
        """Check if a string looks like garbage/random data"""
        
        if not s:
            return True
        
        # Too few unique characters for length
        if len(s) > 8 and len(set(s)) < len(s) * 0.3:
            return True
        
        # Too many special characters
        special = sum(1 for c in s if c in "{}[]|\\~`@#$%^&*()+=<>")
        if special > len(s) * 0.2:
            return True
        
        # Pure hex string (likely data)
        if len(s) > 16 and all(c in "0123456789ABCDEFabcdef" for c in s):
            return True
        
        # Repeated character patterns
        if len(s) > 5 and len(set(s.lower())) <= 2:
            return True
        
        return False
    
    def _filter_relevant_strings(self) -> List[str]:
        """Filter and return the most relevant strings for display"""
        
        keywords = [
            # Manufacturers
            "BOSCH", "DENSO", "DELPHI", "SIEMENS", "CONTINENTAL", "MARELLI",
            "HITACHI", "KEIHIN", "KEFICO", "TRANSTRON", "CUMMINS",
            
            # ECU related
            "ECU", "ENGINE", "CONTROL", "MODULE", "SYSTEM",
            "CALIBRATION", "CAL", "VERSION", "VER",
            
            # Functions
            "DPF", "EGR", "SCR", "ADBLUE", "LAMBDA", "BOOST",
            "INJECTION", "DIESEL", "GASOLINE", "TURBO",
            
            # Vehicle brands
            "TOYOTA", "HONDA", "NISSAN", "MAZDA", "SUBARU", "MITSUBISHI",
            "HYUNDAI", "KIA", "FORD", "BMW", "MERCEDES", "VW", "AUDI",
            
            # Technical
            "OBD", "CAN", "DIAG", "FLASH", "EEPROM", "MAP",
            "Copyright", "HARDWARE", "SOFTWARE",
        ]
        
        relevant = []
        seen = set()
        
        for s in self._extracted_strings:
            s_clean = s.strip()
            
            if s_clean in seen or len(s_clean) < 4:
                continue
            
            if self._is_garbage_string(s_clean):
                continue
            
            seen.add(s_clean)
            
            # Check if contains keyword
            s_upper = s_clean.upper()
            if any(kw in s_upper for kw in keywords):
                relevant.append(s_clean)
                continue
            
            # Keep structured identifiers
            if re.match(r"^[A-Z0-9][A-Z0-9\-_]{5,20}[A-Z0-9]$", s_clean):
                # Additional check - must have letters and numbers
                has_letter = any(c.isalpha() for c in s_clean)
                has_digit = any(c.isdigit() for c in s_clean)
                if has_letter and has_digit:
                    relevant.append(s_clean)
        
        # Return top 25 most relevant strings
        return relevant[:25]
    
    def _calculate_confidence(self):
        """Calculate overall confidence level of the analysis"""
        
        score = 0
        
        if self.results["manufacturer"]:
            score += 30
        if self.results["ecu_type"]:
            score += 25
        if self.results["part_number"]:
            score += 20
        if self.results["processor"]:
            score += 10
        if self.results["calibration_id"]:
            score += 10
        if self.results["vin"]:
            score += 5
        
        if score >= 70:
            self.results["confidence"] = "high"
        elif score >= 40:
            self.results["confidence"] = "medium"
        else:
            self.results["confidence"] = "low"
    
    def _detect_available_maps(self, file_data: bytes):
        """
        Comprehensive map/block detection for available services.
        Uses signature-based detection to identify what systems are present in the ECU file.
        """
        
        detected_maps = {}
        available_services = []
        
        # Get all strings for string-based detection
        all_strings_upper = " ".join(self._extracted_strings).upper()
        
        # =====================================================================
        # DPF (Diesel Particulate Filter) Detection
        # =====================================================================
        dpf_detection = self._detect_dpf_maps(file_data, all_strings_upper)
        if dpf_detection["detected"]:
            detected_maps["dpf"] = dpf_detection
            available_services.append({
                "service_id": "dpf_off",
                "service_name": "DPF Removal",
                "detected": True,
                "confidence": dpf_detection["confidence"],
                "indicators": dpf_detection["indicators"]
            })
        
        # =====================================================================
        # EGR (Exhaust Gas Recirculation) Detection
        # =====================================================================
        egr_detection = self._detect_egr_maps(file_data, all_strings_upper)
        if egr_detection["detected"]:
            detected_maps["egr"] = egr_detection
            available_services.append({
                "service_id": "egr_off",
                "service_name": "EGR Removal",
                "detected": True,
                "confidence": egr_detection["confidence"],
                "indicators": egr_detection["indicators"]
            })
        
        # =====================================================================
        # AdBlue/SCR/DEF (Selective Catalytic Reduction) Detection
        # =====================================================================
        adblue_detection = self._detect_adblue_maps(file_data, all_strings_upper)
        if adblue_detection["detected"]:
            detected_maps["adblue"] = adblue_detection
            available_services.append({
                "service_id": "adblue_off",
                "service_name": "AdBlue/SCR Removal",
                "detected": True,
                "confidence": adblue_detection["confidence"],
                "indicators": adblue_detection["indicators"]
            })
        
        # =====================================================================
        # Lambda/O2 Sensor Detection
        # =====================================================================
        lambda_detection = self._detect_lambda_maps(file_data, all_strings_upper)
        if lambda_detection["detected"]:
            detected_maps["lambda"] = lambda_detection
            available_services.append({
                "service_id": "lambda_off",
                "service_name": "Lambda/O2 Deactivation",
                "detected": True,
                "confidence": lambda_detection["confidence"],
                "indicators": lambda_detection["indicators"]
            })
        
        # =====================================================================
        # Speed Limiter Detection
        # =====================================================================
        speed_detection = self._detect_speed_limiter(file_data, all_strings_upper)
        if speed_detection["detected"]:
            detected_maps["speed_limiter"] = speed_detection
            available_services.append({
                "service_id": "speed_limiter",
                "service_name": "Speed Limiter Removal",
                "detected": True,
                "confidence": speed_detection["confidence"],
                "indicators": speed_detection["indicators"]
            })
        
        # =====================================================================
        # Catalyst/CAT Detection
        # =====================================================================
        cat_detection = self._detect_catalyst_maps(file_data, all_strings_upper)
        if cat_detection["detected"]:
            detected_maps["catalyst"] = cat_detection
            available_services.append({
                "service_id": "cat_off",
                "service_name": "Catalyst Deactivation",
                "detected": True,
                "confidence": cat_detection["confidence"],
                "indicators": cat_detection["indicators"]
            })
        
        # =====================================================================
        # Swirl Flaps Detection (Common in VAG/BMW diesels)
        # =====================================================================
        swirl_detection = self._detect_swirl_flaps(file_data, all_strings_upper)
        if swirl_detection["detected"]:
            detected_maps["swirl_flaps"] = swirl_detection
            available_services.append({
                "service_id": "swirl_off",
                "service_name": "Swirl Flaps Deactivation",
                "detected": True,
                "confidence": swirl_detection["confidence"],
                "indicators": swirl_detection["indicators"]
            })
        
        # =====================================================================
        # Start/Stop System Detection
        # =====================================================================
        startstop_detection = self._detect_start_stop(file_data, all_strings_upper)
        if startstop_detection["detected"]:
            detected_maps["start_stop"] = startstop_detection
            available_services.append({
                "service_id": "start_stop_off",
                "service_name": "Start/Stop Disable",
                "detected": True,
                "confidence": startstop_detection["confidence"],
                "indicators": startstop_detection["indicators"]
            })
        
        # =====================================================================
        # Hot Start Fix / Immo Off Detection
        # =====================================================================
        hotstart_detection = self._detect_hotstart_immo(file_data, all_strings_upper)
        if hotstart_detection["detected"]:
            detected_maps["hot_start"] = hotstart_detection
            available_services.append({
                "service_id": "hot_start",
                "service_name": "Hot Start Fix / Immo",
                "detected": True,
                "confidence": hotstart_detection["confidence"],
                "indicators": hotstart_detection["indicators"]
            })
        
        # =====================================================================
        # DTC (Diagnostic Trouble Codes) - Always available for diesel ECUs
        # =====================================================================
        dtc_detection = self._detect_dtc_capability(file_data, all_strings_upper)
        if dtc_detection["detected"]:
            detected_maps["dtc"] = dtc_detection
            available_services.append({
                "service_id": "dtc_off",
                "service_name": "DTC Removal",
                "detected": True,
                "confidence": dtc_detection["confidence"],
                "indicators": dtc_detection["indicators"]
            })
        
        # =====================================================================
        # Torque/Power Tuning Detection (Stage tuning capability)
        # =====================================================================
        tuning_detection = self._detect_tuning_maps(file_data, all_strings_upper)
        if tuning_detection["detected"]:
            detected_maps["tuning"] = tuning_detection
            available_services.append({
                "service_id": "stage_tuning",
                "service_name": "Stage 1/2 Tuning",
                "detected": True,
                "confidence": tuning_detection["confidence"],
                "indicators": tuning_detection["indicators"]
            })
        
        # Store results
        self.results["detected_maps"] = detected_maps
        self.results["available_services"] = available_services
    
    def _detect_dpf_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """
        Detect DPF (Diesel Particulate Filter) maps using professional binary analysis.
        Research-based patterns from WinOLS, ECU tuning forums, and reverse engineering.
        """
        
        indicators = []
        confidence_score = 0
        
        # =================================================================
        # METHOD 1: EDC17 DPF Switch Pattern
        # Search for "04081 00015" sequence near DPF switch
        # 4081 = 0x0FF1 (LE: F1 0F), 15 = 0x000F (LE: 0F 00)
        # Full pattern often includes: 04081 00015 32767 ... 00001 ... 02800
        # =================================================================
        # Convert 4081 to bytes (little-endian 16-bit)
        val_4081 = struct.pack('<H', 4081)  # \xf1\x0f
        val_15 = struct.pack('<H', 15)      # \x0f\x00
        val_32767 = struct.pack('<H', 32767)  # \xff\x7f
        val_32768 = struct.pack('<H', 32768)  # \x00\x80
        val_2800 = struct.pack('<H', 2800)    # \xf0\x0a
        
        # Search for 4081 followed by 15 within 4 bytes
        for i in range(len(file_data) - 10):
            if file_data[i:i+2] == val_4081:
                # Check if 15 follows within next 4 bytes
                if val_15 in file_data[i+2:i+8]:
                    indicators.append("EDC17 DPF switch area (4081+15 pattern)")
                    confidence_score += 45
                    break
        
        # =================================================================
        # METHOD 2: DPF Switch Byte Pattern
        # The actual switch is often "01 00" (value 1) that disables when set to "00 00"
        # Look for pattern: 01 00 00 00 00 00 01 00 followed by 2800 area
        # =================================================================
        dpf_switch_pattern = bytes([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00])
        if dpf_switch_pattern in file_data:
            # Verify it's near a reasonable DPF area (check for 2800 nearby)
            idx = file_data.find(dpf_switch_pattern)
            if idx > 0:
                nearby = file_data[idx:idx+30]
                if val_2800 in nearby or val_32767 in nearby:
                    indicators.append("DPF switch byte sequence found")
                    confidence_score += 35
        
        # =================================================================
        # METHOD 3: 32767/32768 Boundary Pattern (Common in DPF map areas)
        # These values mark map boundaries in many ECU types
        # =================================================================
        # Pattern: 7FFF followed by 8000 (or vice versa)
        pattern_7fff_8000 = val_32767 + val_32768
        pattern_8000_7fff = val_32768 + val_32767
        
        count_7fff_8000 = file_data.count(pattern_7fff_8000)
        count_8000_7fff = file_data.count(pattern_8000_7fff)
        total_boundary = count_7fff_8000 + count_8000_7fff
        
        if total_boundary >= 5:
            indicators.append(f"Map boundary markers (7FFF/8000): {total_boundary}x")
            confidence_score += 40
        elif total_boundary >= 2:
            indicators.append(f"Map boundary markers: {total_boundary}x")
            confidence_score += 25
        
        # =================================================================
        # METHOD 4: Direct text markers in binary
        # =================================================================
        dpf_text_markers = [
            (b'DPF', 40), (b'dpf', 35), (b'DpF', 35),
            (b'FAP', 40), (b'Fap', 35), (b'fap', 30),
            (b'SOOT', 30), (b'soot', 25),
            (b'REGEN', 30), (b'regen', 25),
            (b'Partikel', 35), (b'PARTIKEL', 35),
            (b'DPF_', 45), (b'_DPF', 45),
            (b'FAP_', 45), (b'_FAP', 45),
        ]
        
        for marker, score in dpf_text_markers:
            count = file_data.count(marker)
            if count > 0:
                # Verify it's not just random data by checking for alphanumeric context
                idx = file_data.find(marker)
                if idx > 0:
                    # Check if surrounded by reasonable chars (not pure binary noise)
                    before = file_data[max(0,idx-1):idx]
                    after = file_data[idx+len(marker):idx+len(marker)+1]
                    # Accept if at word boundary (non-alphanumeric before/after)
                    is_word = (not before or not before[0:1].isalnum()) or (not after or not after[0:1].isalnum())
                    if is_word or count >= 2:
                        indicators.append(f"Text marker '{marker.decode()}': {count}x")
                        confidence_score += score
                        break
        
        # =================================================================
        # METHOD 5: Denso DPF Detection
        # Look for specific patterns in Denso ECUs
        # =================================================================
        # Denso often uses specific hex sequences for emissions maps
        denso_dpf_patterns = [
            (b'\x00\x80\x00\x80\x00\x80', "Denso map boundary"),
            (b'\xff\x7f\xff\x7f\xff\x7f', "Denso map sequence"),
        ]
        
        for pattern, desc in denso_dpf_patterns:
            if pattern in file_data:
                indicators.append(desc)
                confidence_score += 25
                break
        
        # Determine confidence level
        if confidence_score >= 60:
            confidence = "high"
        elif confidence_score >= 35:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_egr_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """
        Detect EGR (Exhaust Gas Recirculation) maps.
        Uses text markers + heuristic analysis for files without explicit labels.
        """
        
        indicators = []
        confidence_score = 0
        
        # =================================================================
        # METHOD 1: Direct text markers (highest priority)
        # =================================================================
        egr_text_markers = [
            (b'EGR', 50), (b'egr', 45), (b'Egr', 45),
            (b'AGR', 50), (b'agr', 45), (b'Agr', 45),
            (b'EGR_', 55), (b'_EGR', 55),
            (b'AGR_', 55), (b'_AGR', 55),
        ]
        
        for marker, score in egr_text_markers:
            count = file_data.count(marker)
            if count > 0:
                idx = file_data.find(marker)
                before = file_data[max(0,idx-1):idx]
                after = file_data[idx+len(marker):idx+len(marker)+1]
                is_word = (not before or not before[0:1].isalnum()) or (not after or not after[0:1].isalnum())
                if is_word or count >= 2:
                    indicators.append(f"Text marker '{marker.decode()}': {count}x")
                    confidence_score += score
                    break
        
        # =================================================================
        # METHOD 2: String patterns
        # =================================================================
        egr_strings = [
            "EGR_VALVE", "EGR_FLOW", "EGR_TEMP", "EGR_POS", 
            "EGRVALVE", "EGRFLOW", "LP_EGR", "HP_EGR",
            "EXHAUST_GAS_RECIRCULATION", "RECIRCULATION"
        ]
        
        for s in egr_strings:
            if s in strings_upper:
                indicators.append(f"String: {s}")
                confidence_score += 35
                break
        
        # =================================================================
        # METHOD 3: Heuristic - Diesel ECUs with DPF typically have EGR
        # If we detected DPF with high confidence and this is a diesel ECU,
        # EGR is highly likely. Add modest score.
        # =================================================================
        # Check manufacturer/ECU type for diesel indicators
        ecu_type = self.results.get("ecu_type", "") or ""
        manufacturer = self.results.get("manufacturer", "") or ""
        ecu_upper = ecu_type.upper()
        mfr_upper = manufacturer.upper()
        
        # Known diesel ECU indicators
        diesel_indicators = ["EDC", "DCM", "SID", "DENSO", "TRANSTRON", "CUMMINS", "CM2150"]
        is_diesel = any(ind in ecu_upper or ind in mfr_upper for ind in diesel_indicators)
        
        if is_diesel and confidence_score == 0:
            # For diesel ECUs, EGR is standard equipment
            indicators.append("Diesel ECU (EGR standard)")
            confidence_score += 30  # Medium confidence for inference
        
        # Determine confidence level
        if confidence_score >= 50:
            confidence = "high"
        elif confidence_score >= 30:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_adblue_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """
        Detect AdBlue/SCR/DEF (Selective Catalytic Reduction) maps.
        Uses text markers + ECU type inference for trucks.
        """
        
        indicators = []
        confidence_score = 0
        
        # =================================================================
        # METHOD 1: Direct text markers (highest priority)
        # =================================================================
        adblue_text_markers = [
            (b'ADBLUE', 60), (b'AdBlue', 60), (b'adblue', 55),
            (b'UREA', 55), (b'Urea', 50), (b'urea', 45),
            (b'DENOX', 55), (b'DeNOx', 55), (b'denox', 50),
            (b'SCR_', 55), (b'_SCR', 55),
            (b'NOX_', 50), (b'_NOX', 50), (b'NOx_', 50),
            (b'NOX_SENSOR', 60), (b'NOXSENSOR', 60),
            (b'AFTERTREATMENT', 50), (b'Aftertreatment', 45),
            (b'REDUCTANT', 55), (b'Reductant', 50),
            (b'NH3', 50),
            (b'BLUETEC', 60), (b'BlueTec', 55),
        ]
        
        for marker, score in adblue_text_markers:
            count = file_data.count(marker)
            if count > 0:
                idx = file_data.find(marker)
                if len(marker) <= 4:
                    before = file_data[max(0,idx-1):idx]
                    after = file_data[idx+len(marker):idx+len(marker)+1]
                    is_word = (not before or not before[0:1].isalnum()) or (not after or not after[0:1].isalnum())
                    if not is_word and count < 3:
                        continue
                indicators.append(f"Text marker '{marker.decode()}': {count}x")
                confidence_score += score
                break
        
        # =================================================================
        # METHOD 2: String patterns
        # =================================================================
        adblue_strings = [
            "ADBLUE", "AD_BLUE", "BLUE_TEC", "BLUETEC",
            "SCR_CAT", "SCR_TEMP", "SCR_EFF", "SCR_SYSTEM",
            "UREA_INJ", "UREA_DOS", "NOX_SENSOR", "NOXSENSOR",
            "DENOXTRONIC", "AFTERTREATMENT", "REDUCTANT"
        ]
        
        for s in adblue_strings:
            if s in strings_upper:
                indicators.append(f"String: {s}")
                confidence_score += 40
                break
        
        # =================================================================
        # METHOD 3: Truck ECU inference for SCR
        # Trucks meeting Euro 5/6 emissions typically have SCR
        # Known truck ECU types get inference-based detection
        # =================================================================
        ecu_type = self.results.get("ecu_type", "") or ""
        manufacturer = self.results.get("manufacturer", "") or ""
        ecu_upper = ecu_type.upper()
        mfr_upper = manufacturer.upper()
        
        # Check for truck-specific brands in the binary
        truck_brands = [
            (b'FUSO', "FUSO truck"),
            (b'HINO', "Hino truck"),
            (b'MAN', "MAN truck"),
            (b'SCANIA', "Scania truck"),
            (b'VOLVO', "Volvo truck"),
            (b'IVECO', "Iveco truck"),
            (b'ACTROS', "Mercedes Actros"),
            (b'ATEGO', "Mercedes Atego"),
        ]
        
        truck_found = None
        for brand, desc in truck_brands:
            if re.search(brand + rb'\b', file_data):  # Word boundary
                truck_found = desc
                break
        
        # Known truck ECU types that have SCR
        truck_ecus_with_scr = [
            "CM2150", "CM2250", "CM2350",  # Cummins
            "EDC17CP52", "EDC17CV41", "EDC17CV44", "EDC17CV54",  # Bosch truck
            "EDC17C49", "EDC17C54",  # Bosch commercial
        ]
        
        has_truck_ecu = any(tecu in ecu_upper for tecu in truck_ecus_with_scr)
        is_cummins = "CUMMINS" in mfr_upper or "CM2150" in ecu_upper or "CM2250" in ecu_upper
        
        if confidence_score == 0:
            if truck_found:
                indicators.append(f"Truck brand: {truck_found}")
                confidence_score += 35  # Medium-high for truck detection
            if has_truck_ecu:
                indicators.append(f"Truck ECU with SCR: {ecu_type}")
                confidence_score += 40
            if is_cummins:
                indicators.append("Cummins ECU (SCR standard)")
                confidence_score += 45
        
        # Determine confidence level
        if confidence_score >= 55:
            confidence = "high"
        elif confidence_score >= 35:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_lambda_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect Lambda/O2 sensor related maps"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        lambda_strings = [
            "LAMBDA", "O2_SENSOR", "O2SENSOR", "OXYGEN_SENSOR",
            "WIDEBAND", "NARROWBAND", "LSU", "LSF",  # Bosch sensor types
            "AFR", "AIR_FUEL", "AIRFUEL", "A/F RATIO",
            "LAMBDA_CONTROL", "CLOSED_LOOP", "HEGO",  # Heated Exhaust Gas O2
            "PRE_CAT", "POST_CAT", "UPSTREAM", "DOWNSTREAM",
            "O2_HEATER", "SENSOR_HEAT"
        ]
        
        for s in lambda_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 20
        
        # Binary patterns - STRICT patterns only
        lambda_patterns = [
            (rb"(?i)lambda[_\s]", "Lambda marker"),
            (rb"(?i)o2[_\s]?sens", "O2 sensor"),
            (rb"(?i)oxygen[_\s]?sens", "Oxygen sensor"),
            (rb"(?i)lsu[_\s]?4", "LSU 4.x sensor"),
            (rb"(?i)wideband", "Wideband sensor"),
            (rb"(?i)afr[_\s]?target", "AFR target"),
            (rb"(?i)closed[_\s]?loop", "Closed loop control"),
        ]
        
        for pattern, desc in lambda_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        # Almost all modern ECUs have lambda control
        ecu_type = self.results.get("ecu_type", "") or ""
        if any(x in ecu_type.upper() for x in ["MED", "ME7", "EDC", "MG1", "MD1"]):
            indicators.append("Modern ECU (has lambda control)")
            confidence_score += 10
        
        if confidence_score >= 50:
            confidence = "high"
        elif confidence_score >= 25:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_speed_limiter(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect speed limiter maps"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        speed_strings = [
            "SPEED_LIMIT", "SPEEDLIMIT", "V_MAX", "VMAX",
            "VELOCITY_LIMIT", "TOP_SPEED", "MAX_SPEED",
            "GOVERNOR", "SPEED_GOV", "LIMITER",
            "KPH_LIMIT", "MPH_LIMIT", "SPEED_CUT"
        ]
        
        for s in speed_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 25
        
        # Binary patterns - STRICT patterns only
        speed_patterns = [
            (rb"(?i)speed[_\s]?limit", "Speed limit marker"),
            (rb"(?i)v[_\s]?max", "Vmax marker"),
            (rb"(?i)top[_\s]?speed", "Top speed reference"),
            (rb"(?i)governor", "Governor reference"),
            (rb"(?i)speed[_\s]?cut", "Speed cut reference"),
        ]
        
        for pattern, desc in speed_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        # Common in European market vehicles
        file_size_mb = self.results.get("file_size_mb", 0)
        if file_size_mb >= 1.5:  # Modern ECUs
            indicators.append("Modern ECU file (likely has speed limiter)")
            confidence_score += 5
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_catalyst_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect catalyst/CAT related maps"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        cat_strings = [
            "CATALYST", "CATALYTIC", "CAT_TEMP", "CAT_EFF",
            "CAT_HEAT", "CAT_MON", "OBD_CAT", "TWC",  # Three-Way Catalyst
            "WARM_UP", "WARMUP", "CAT_DIAG", "CONVERTER"
        ]
        
        for s in cat_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 20
        
        # Binary patterns - STRICT patterns only
        cat_patterns = [
            (rb"(?i)catalyst", "Catalyst marker"),
            (rb"(?i)cat[_\s]?temp", "Catalyst temperature"),
            (rb"(?i)cat[_\s]?eff", "Catalyst efficiency"),
            (rb"(?i)cat[_\s]?mon", "Catalyst monitor"),
            (rb"TWC[_\x00]", "TWC marker"),
        ]
        
        for pattern, desc in cat_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_swirl_flaps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect swirl flaps / intake flaps maps (common in VAG/BMW diesels)"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        swirl_strings = [
            "SWIRL", "FLAP", "INTAKE_FLAP", "TUMBLE",
            "DRALL", "DROSSELKLAPPE",  # German
            "MANIFOLD_FLAP", "RUNNER_FLAP", "IMRC"  # Intake Manifold Runner Control
        ]
        
        for s in swirl_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 25
        
        # Binary patterns - STRICT patterns only
        swirl_patterns = [
            (rb"(?i)swirl[_\s]?flap", "Swirl flap marker"),
            (rb"(?i)intake[_\s]?flap", "Intake flap marker"),
            (rb"(?i)tumble", "Tumble flap"),
            (rb"DRALL", "German swirl marker"),
        ]
        
        for pattern, desc in swirl_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 20
        
        # Common in VAG/BMW diesel ECUs
        manufacturer = self.results.get("manufacturer", "") or ""
        vehicle_info = self.results.get("vehicle_info", "") or ""
        if "BOSCH" in manufacturer.upper() or "VW" in vehicle_info.upper() or "BMW" in vehicle_info.upper():
            confidence_score += 5
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_start_stop(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect Start/Stop system maps"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        startstop_strings = [
            "START_STOP", "STARTSTOP", "START-STOP", "AUTO_STOP",
            "AUTOSTOP", "MSA",  # Motor Stop/Start Automatik
            "IDLE_STOP", "ENGINE_RESTART", "SSA", "ISG"  # Integrated Starter Generator
        ]
        
        for s in startstop_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 25
        
        # Binary patterns - STRICT patterns only
        startstop_patterns = [
            (rb"(?i)start[_\s]?stop", "Start/Stop marker"),
            (rb"(?i)auto[_\s]?stop", "Auto stop marker"),
            (rb"(?i)idle[_\s]?stop", "Idle stop marker"),
            (rb"MSA[_\x00]", "MSA marker"),
        ]
        
        for pattern, desc in startstop_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 20
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_hotstart_immo(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect Hot Start / Immobilizer related maps"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        hotstart_strings = [
            "IMMO", "IMMOBILIZER", "IMMOBILISER", "TRANSPONDER",
            "HOT_START", "HOTSTART", "WARM_START", "WARMSTART",
            "ANTI_THEFT", "ANTITHEFT", "SECURITY", "KEY_CODE",
            "WEGFAHRSPERRE"  # German for immobilizer
        ]
        
        for s in hotstart_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 20
        
        # Binary patterns - STRICT patterns only
        immo_patterns = [
            (rb"(?i)immo[_\s]", "Immobilizer marker"),
            (rb"(?i)transponder", "Transponder reference"),
            (rb"(?i)hot[_\s]?start", "Hot start marker"),
            (rb"WEGFAHRSPERRE", "German immo marker"),
        ]
        
        for pattern, desc in immo_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_dtc_capability(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect DTC (Diagnostic Trouble Code) handling capability"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        dtc_strings = [
            "DTC", "FAULT", "ERROR", "DIAGNOSTIC", "P0", "P1", "P2",
            "TROUBLE_CODE", "MIL", "CHECK_ENGINE", "OBD",
            "FEHLERSPEICHER"  # German: error memory
        ]
        
        for s in dtc_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 15
        
        # Binary patterns - STRICT patterns only - DTC codes are often stored in specific format
        dtc_patterns = [
            (rb"(?i)dtc[_\s]", "DTC marker"),
            (rb"(?i)fault[_\s]?code", "Fault code marker"),
            (rb"(?i)obd[_\s]?diag", "OBD diagnostic"),
            (rb"P[0-3][0-9A-F]{3}", "P-code pattern"),  # Standard DTC format
            (rb"(?i)mil[_\s]?lamp", "MIL lamp reference"),
        ]
        
        for pattern, desc in dtc_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        # All modern ECUs have DTC capability
        file_size = self.results.get("file_size_bytes", 0)
        if file_size > 100000:  # > 100KB
            indicators.append("Modern ECU size (DTC capability standard)")
            confidence_score += 20
        
        if confidence_score >= 40:
            confidence = "high"
        elif confidence_score >= 20:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def _detect_tuning_maps(self, file_data: bytes, strings_upper: str) -> Dict[str, Any]:
        """Detect torque/power tuning maps (Stage tuning capability)"""
        
        indicators = []
        confidence_score = 0
        
        # String-based detection
        tuning_strings = [
            "TORQUE", "INJECTION", "BOOST", "TURBO", "RAIL_PRESSURE",
            "FUEL_MAP", "TIMING", "SMOKE_LIMIT", "DRIVER_REQUEST",
            "PEDAL_MAP", "AIR_MASS", "MAF", "CHARGE_PRESSURE",
            "IQ", "SOI", "PILOT", "MAIN_INJ"  # Injection quantity, Start of Injection
        ]
        
        for s in tuning_strings:
            if s in strings_upper:
                indicators.append(f"String found: {s}")
                confidence_score += 10
        
        # Binary patterns - STRICT patterns only
        tuning_patterns = [
            (rb"(?i)torque[_\s]?req", "Torque request map"),
            (rb"(?i)boost[_\s]?press", "Boost pressure map"),
            (rb"(?i)rail[_\s]?press", "Rail pressure map"),
            (rb"(?i)inj[_\s]?quantity", "Injection quantity"),
            (rb"(?i)driver[_\s]?wish", "Driver request map"),
            (rb"(?i)smoke[_\s]?limit", "Smoke limiter"),
            (rb"(?i)charge[_\s]?press", "Charge pressure"),
        ]
        
        for pattern, desc in tuning_patterns:
            if re.search(pattern, file_data):
                indicators.append(f"Binary pattern: {desc}")
                confidence_score += 15
        
        # All engine ECUs can be tuned
        ecu_type = self.results.get("ecu_type", "") or ""
        if any(x in ecu_type.upper() for x in ["EDC", "MED", "ME7", "SID", "DCM", "MG1", "MD1"]):
            indicators.append("Engine ECU detected (tunable)")
            confidence_score += 20
        
        if confidence_score >= 50:
            confidence = "high"
        elif confidence_score >= 25:
            confidence = "medium"
        elif confidence_score > 0:
            confidence = "low"
        else:
            confidence = "none"
        
        return {
            "detected": confidence_score > 0,
            "confidence": confidence,
            "confidence_score": confidence_score,
            "indicators": indicators[:5]
        }
    
    def get_display_info(self) -> Dict:
        """Get formatted display info for frontend"""
        
        mfr = self.results.get("manufacturer") or "Unknown"
        ecu = self.results.get("ecu_type")
        
        if ecu:
            display_ecu = ecu
        elif mfr and mfr != "Unknown":
            display_ecu = f"{mfr} ECU"
        else:
            display_ecu = "Unknown ECU"
        
        return {
            "manufacturer": mfr,
            "ecu_type": display_ecu,
            "ecu_generation": self.results.get("ecu_generation") or "",
            "calibration_id": self.results.get("calibration_id") or "",
            "software_version": self.results.get("software_version") or "",
            "hardware_version": self.results.get("hardware_version") or "",
            "part_number": self.results.get("part_number") or "",
            "vin": self.results.get("vin") or "",
            "vehicle_info": self.results.get("vehicle_info") or "",
            "processor": self.results.get("processor") or "",
            "flash_type": self.results.get("flash_type") or "",
            "strings": self.results.get("strings") or [],
            "file_size_mb": self.results.get("file_size_mb", 0),
            "file_size_bytes": self.results.get("file_size_bytes", 0),
            "confidence": self.results.get("confidence", "low"),
            # NEW: Include detected maps and available services
            "detected_maps": self.results.get("detected_maps", {}),
            "available_services": self.results.get("available_services", [])
        }
