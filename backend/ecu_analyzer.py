import re

class ECUAnalyzer:
    def __init__(self):
        self.results = {}
        # Known ECU manufacturers for enhanced detection
        self.known_manufacturers = {
            b"BOSCH": "Bosch", b"Bosch": "Bosch",
            b"DENSO": "Denso", b"Denso": "Denso",
            b"SIEMENS": "Siemens/Continental", b"CONTINENTAL": "Siemens/Continental",
            b"DELPHI": "Delphi", b"Delphi": "Delphi",
            b"MARELLI": "Marelli", b"Marelli": "Marelli",
            b"HITACHI": "Hitachi", b"Hitachi": "Hitachi",
            b"KEIHIN": "Keihin", b"Keihin": "Keihin",
            b"MITSUBISHI": "Mitsubishi Electric",
            b"JATCO": "Jatco", b"Jatco": "Jatco",
            b"CUMMINS": "Cummins", b"Cummins": "Cummins",
            b"WEICHAI": "Weichai", b"Weichai": "Weichai",
            b"YUCHAI": "Yuchai", b"Yuchai": "Yuchai",
            b"VISTEON": "Visteon", b"Visteon": "Visteon",
            b"AISIN": "Aisin", b"Aisin": "Aisin",
            b"KEFICO": "Kefico", b"Kefico": "Kefico",
            b"Transtron": "Transtron", b"TRANSTRON": "Transtron",
            b"MOTOROLA": "Motorola", b"Motorola": "Motorola",
            b"TEMIC": "Temic", b"Temic": "Temic",
            b"LUCAS": "Lucas", b"Lucas": "Lucas",
            b"VALEO": "Valeo", b"Valeo": "Valeo",
            b"APTIV": "Aptiv", b"Aptiv": "Aptiv",
            b"BORG": "BorgWarner", b"BorgWarner": "BorgWarner",
            b"GETRAG": "Getrag", b"Getrag": "Getrag",
            b"NIPPON": "Nippon", b"Nippon": "Nippon",
            b"YAZAKI": "Yazaki", b"Yazaki": "Yazaki",
            b"SUMITOMO": "Sumitomo", b"Sumitomo": "Sumitomo",
            b"FUJITSU": "Fujitsu Ten", b"Fujitsu": "Fujitsu Ten",
            b"PIONEER": "Pioneer", b"Pioneer": "Pioneer",
            b"SANYO": "Sanyo", b"Sanyo": "Sanyo",
            b"MATSUSHITA": "Panasonic", b"Panasonic": "Panasonic",
            b"SAGEM": "Sagem", b"Sagem": "Sagem",
            b"WABCO": "Wabco", b"Wabco": "Wabco",
            b"KNORR": "Knorr-Bremse", b"Knorr": "Knorr-Bremse",
        }
        
        # ECU type patterns
        self.ecu_patterns = [
            (rb'(EDC17[A-Z0-9]{0,5})', "Bosch"),
            (rb'(EDC16[A-Z0-9]{0,5})', "Bosch"),
            (rb'(EDC15[A-Z0-9]{0,5})', "Bosch"),
            (rb'(MED17[A-Z0-9]{0,5})', "Bosch"),
            (rb'(ME17[A-Z0-9]{0,5})', "Bosch"),
            (rb'(ME7[A-Z0-9]{0,3})', "Bosch"),
            (rb'(MG1[A-Z0-9]{0,5})', "Bosch"),
            (rb'(MD1[A-Z0-9]{0,5})', "Bosch"),
            (rb'(MED9[A-Z0-9]{0,3})', "Bosch"),
            (rb'(MSA[0-9]{1,2})', "Bosch"),
            (rb'(SID[0-9]{3})', "Siemens/Continental"),
            (rb'(SIMOS[0-9.]+)', "Siemens/Continental"),
            (rb'(PCR[0-9.]+)', "Siemens/Continental"),
            (rb'(DCM[0-9.]+)', "Delphi"),
            (rb'(MT[0-9]{2})', "Delphi"),
            (rb'(IAW[0-9A-Z]+)', "Marelli"),
            (rb'(MJD[0-9A-Z]+)', "Marelli"),
            (rb'(SH705[0-9])', "Denso"),
            (rb'(76F00[0-9]+)', "Denso"),
            (rb'(MEC[0-9A-Z]+)', "Hitachi"),
            (rb'(E6T[0-9A-Z]+)', "Mitsubishi Electric"),
            (rb'(E5T[0-9A-Z]+)', "Mitsubishi Electric"),
            (rb'(CM[0-9]{3,4})', "Cummins"),
            (rb'(JF[0-9]{3})', "Jatco"),
            (rb'([68]HP[0-9]{2})', "ZF"),
        ]
        
        # Vehicle part number patterns
        self.part_patterns = [
            (rb'(89[0-9]{3}-[0-9A-Z]{5})', "Toyota/Lexus", "Denso"),
            (rb'(37820-[A-Z0-9]{3,7})', "Honda/Acura", "Keihin"),
            (rb'(37805-[A-Z0-9]{3,7})', "Honda/Acura", "Keihin"),
            (rb'(23710-[A-Z0-9]{5,7})', "Nissan/Infiniti", "Hitachi/Denso"),
            (rb'(39[0-9]{3}-[A-Z0-9]{5})', "Hyundai/Kia", "Kefico"),
            (rb'(0[0-9]{9})', None, "Bosch"),  # Bosch 10-digit
            (rb'(1037[0-9]{6})', None, "Bosch"),  # Bosch part
            (rb'(A[0-9]{10})', "Mercedes", None),
            (rb'(4[A-Z][0-9]{6,8})', "Audi/VW", None),
        ]
    
    def analyze(self, file_data):
        self.results = {
            "success": True,
            "file_size_mb": round(len(file_data)/(1024*1024), 2),
            "manufacturer": None,
            "ecu_type": None,
            "calibration_id": None,
            "software_version": None,
            "hardware_version": None,
            "part_number": None,
            "vin": None,
            "vehicle_info": None,
            "processor": None,
            "strings": []
        }
        
        # Extract all readable strings
        strings = self._extract_strings(file_data)
        unique_strings = list(dict.fromkeys(strings))
        
        # === STEP 1: AUTO-DETECT FROM COPYRIGHT STRINGS ===
        copyright_mfr = self._extract_copyright_manufacturer(file_data, unique_strings)
        if copyright_mfr:
            self.results["manufacturer"] = copyright_mfr
        
        # === STEP 2: KNOWN MANUFACTURER SIGNATURES ===
        if not self.results["manufacturer"]:
            for sig, mfr_name in self.known_manufacturers.items():
                if sig in file_data:
                    self.results["manufacturer"] = mfr_name
                    break
        
        # === STEP 3: ECU TYPE PATTERNS ===
        for pattern, mfr_hint in self.ecu_patterns:
            match = re.search(pattern, file_data)
            if match:
                ecu_type = match.group(1).decode("utf-8", errors="ignore")
                self.results["ecu_type"] = f"{mfr_hint} {ecu_type}" if mfr_hint else ecu_type
                if not self.results["manufacturer"] and mfr_hint:
                    self.results["manufacturer"] = mfr_hint
                break
        
        # === STEP 4: PART NUMBER PATTERNS ===
        for pattern, vehicle_hint, mfr_hint in self.part_patterns:
            match = re.search(pattern, file_data)
            if match:
                self.results["part_number"] = match.group(1).decode("utf-8", errors="ignore")
                if vehicle_hint and not self.results["vehicle_info"]:
                    self.results["vehicle_info"] = vehicle_hint
                if mfr_hint and not self.results["manufacturer"]:
                    self.results["manufacturer"] = mfr_hint
                break
        
        # === STEP 5: PROCESSOR DETECTION ===
        self._detect_processor(file_data)
        
        # === STEP 6: CALIBRATION/VERSION INFO ===
        self._detect_calibration(file_data, unique_strings)
        
        # === STEP 7: VIN DETECTION ===
        self._detect_vin(file_data)
        
        # === STEP 8: FALLBACK - Extract best info from strings ===
        if not self.results["manufacturer"]:
            # Try to find any company-like name
            company_name = self._find_company_in_strings(unique_strings)
            if company_name:
                self.results["manufacturer"] = company_name
        
        # === STEP 9: SET ECU TYPE IF STILL MISSING ===
        if not self.results["ecu_type"] and self.results["manufacturer"]:
            self.results["ecu_type"] = f"{self.results['manufacturer']} ECU"
        
        # === STEP 10: COLLECT INTERESTING STRINGS ===
        self.results["strings"] = self._filter_interesting_strings(unique_strings)
        
        return self.results
    
    def _extract_strings(self, file_data):
        """Extract readable ASCII strings from binary"""
        strings = []
        current = b""
        for byte in file_data:
            if 32 <= byte <= 126:
                current += bytes([byte])
            else:
                if len(current) >= 5:
                    try:
                        s = current.decode("ascii").strip()
                        if (any(c.isalpha() for c in s) and 
                            len(s) <= 100 and
                            not self._is_garbage(s)):
                            strings.append(s)
                    except: pass
                current = b""
        return strings
    
    def _extract_copyright_manufacturer(self, file_data, strings):
        """Extract manufacturer from copyright strings - THIS IS THE KEY AUTO-DETECTION"""
        # Pattern 1: "Copyright X Inc/Corp/Ltd/Co" or "(c) X"
        copyright_patterns = [
            rb'[Cc]opyright\s+([A-Z][a-zA-Z0-9\s]{2,25}?)[\s,.](?:inc|Inc|INC|corp|Corp|CORP|ltd|Ltd|LTD|co|Co|CO|LLC|llc|GmbH|gmbh|[0-9]{4})',
            rb'[Cc]opyright\s+(?:by\s+)?([A-Z][a-zA-Z0-9\s]{2,25}?)[\s,.]',
            rb'\([cC]\)\s*([A-Z][a-zA-Z0-9\s]{2,20})',
            rb'[Cc]opyright\s*\([cC]\)\s*(?:[0-9]{4}[\-,\s]*)*([A-Z][a-zA-Z0-9\s]{2,25})',
        ]
        
        for pattern in copyright_patterns:
            matches = re.findall(pattern, file_data)
            for match in matches:
                try:
                    company = match.decode("utf-8", errors="ignore").strip()
                    # Clean up the company name
                    company = re.sub(r'\s+', ' ', company)
                    company = company.strip(' .,')
                    # Validate it looks like a company name
                    if (len(company) >= 3 and 
                        len(company) <= 30 and
                        company[0].isupper() and
                        not company.isdigit() and
                        'AAAA' not in company and
                        'FFFF' not in company):
                        return company
                except: pass
        
        # Also check strings for copyright
        for s in strings:
            if 'copyright' in s.lower() or '(c)' in s.lower():
                # Try to extract company name
                match = re.search(r'(?:copyright|©|\(c\))\s*(?:[0-9]{4}[\-,\s]*)*([A-Z][a-zA-Z0-9\s]{2,25}?)(?:\s|,|\.|inc|corp|ltd|$)', s, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()
                    if len(company) >= 3 and len(company) <= 30:
                        return company
        
        return None
    
    def _find_company_in_strings(self, strings):
        """Try to find company name from strings as last resort"""
        # Look for strings that look like company names
        company_indicators = ['inc', 'corp', 'ltd', 'co.', 'gmbh', 'llc', 'electronics', 'automotive', 'systems']
        
        for s in strings:
            s_lower = s.lower()
            for indicator in company_indicators:
                if indicator in s_lower:
                    # Extract company name before the indicator
                    idx = s_lower.find(indicator)
                    if idx > 2:
                        company = s[:idx].strip()
                        if len(company) >= 3 and company[0].isupper():
                            return company
        return None
    
    def _detect_processor(self, file_data):
        """Detect processor type"""
        # Check Infineon/TriCore
        if b"Infineon" in file_data or b"TriCore" in file_data or b"TC1797" in file_data or b"TC1767" in file_data:
            match = re.search(rb'TC17[0-9]{2}', file_data)
            if match:
                self.results["processor"] = f"Infineon TriCore {match.group(0).decode('utf-8')}"
            else:
                self.results["processor"] = "Infineon TriCore"
            return
        
        # Check NEC/Renesas
        if b"NEC" in file_data or b"Renesas" in file_data:
            self.results["processor"] = "NEC/Renesas"
            return
        
        # Check Renesas SH705x
        if b"SH7058" in file_data or b"SH7059" in file_data or b"SH7055" in file_data:
            self.results["processor"] = "Renesas SH705x"
            return
        
        # Check Freescale
        if b"Freescale" in file_data or b"MPC5" in file_data:
            match = re.search(rb'MPC5[0-9]+', file_data)
            if match:
                self.results["processor"] = f"Freescale {match.group(0).decode('utf-8')}"
            else:
                self.results["processor"] = "Freescale MPC5xx"
            return
        
        # Check ST Micro
        if b"ST10" in file_data or b"C167" in file_data:
            self.results["processor"] = "ST Micro ST10/C167"
            return
        
        # Check Motorola
        if b"MC68" in file_data or b"68HC" in file_data:
            self.results["processor"] = "Motorola 68HC"
            return
    
    def _detect_calibration(self, file_data, strings):
        """Detect calibration ID and software version"""
        # Calibration patterns
        cal_patterns = [
            rb'CAL[_\-\s]?ID[:\s=]*([A-Z0-9_\-]{6,25})',
            rb'CALID[:\s=]*([A-Z0-9_\-]{6,25})',
            rb'SW[:\s]([A-Z0-9]{8,20})',
            rb'HW[:\s]([A-Z0-9]{8,20})',
        ]
        
        for pat in cal_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["calibration_id"] = match.group(1).decode("utf-8", errors="ignore")
                break
        
        # Software version from strings
        for s in strings:
            if any(kw in s.upper() for kw in ["VERSION", "VER ", "VER:", "SW:", "SW_", "V."]):
                match = re.search(r'V?(\d+\.\d+\.?\d*)', s)
                if match:
                    self.results["software_version"] = match.group(1)
                    break
    
    def _detect_vin(self, file_data):
        """Detect VIN (Vehicle Identification Number)"""
        vin_pattern = rb'([A-HJ-NPR-Z0-9]{17})'
        matches = re.findall(vin_pattern, file_data)
        
        for v in matches:
            try:
                vin = v.decode("utf-8")
                digits = sum(c.isdigit() for c in vin)
                letters = sum(c.isalpha() for c in vin)
                # Valid VIN has mix of letters and numbers
                if (4 <= digits <= 13 and 
                    4 <= letters <= 13 and
                    vin[0] in '123456789JKLMNPRSTUVWXYZ'):
                    self.results["vin"] = vin
                    break
            except: pass
    
    def _is_garbage(self, s):
        """Check if string is garbage/random data"""
        if len(set(s)) < len(s) * 0.25:
            return True
        special = sum(1 for c in s if c in '{}[]|\\~`@#$%^&*()+=<>')
        if special > len(s) * 0.15:
            return True
        if re.match(r'^[0-9A-Fa-f\s]+$', s) and len(s) > 16:
            return True
        if re.match(r'^[a-z]{15,}$', s) or re.match(r'^[A-Z]{15,}$', s):
            return True
        if re.match(r'^(.)\1{5,}', s):  # Repeated chars
            return True
        return False
    
    def _filter_interesting_strings(self, strings):
        """Filter and return the most interesting strings"""
        keywords = [
            "VER", "CAL", "ECU", "ENGINE", "DIESEL", "INJECT", "FUEL", 
            "TURBO", "DPF", "EGR", "SCR", "OBD", "CAN", "DIAG",
            "Copyright", "CONTROL", "MODULE", "SYSTEM",
            "BOSCH", "DENSO", "DELPHI", "SIEMENS", "MARELLI", "HITACHI",
            "TOYOTA", "HONDA", "NISSAN", "VW", "BMW", "MERCEDES", "AUDI",
            "FORD", "GM", "CHRYSLER", "HYUNDAI", "KIA", "SUBARU", "MAZDA"
        ]
        
        interesting = []
        seen = set()
        
        for s in strings:
            s_clean = s.strip()
            if s_clean in seen or len(s_clean) < 5:
                continue
            seen.add(s_clean)
            
            # Priority 1: Contains keywords
            if any(kw.lower() in s_clean.lower() for kw in keywords):
                interesting.append(s_clean)
            # Priority 2: Looks like an identifier
            elif re.match(r'^[A-Z0-9\-_]{8,25}$', s_clean):
                interesting.append(s_clean)
        
        return interesting[:20]
    
    def get_display_info(self):
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
            "calibration_id": self.results.get("calibration_id") or "",
            "software_version": self.results.get("software_version") or "",
            "hardware_version": self.results.get("hardware_version") or "",
            "part_number": self.results.get("part_number") or "",
            "vin": self.results.get("vin") or "",
            "vehicle_info": self.results.get("vehicle_info") or "",
            "processor": self.results.get("processor") or "",
            "strings": self.results.get("strings") or [],
            "file_size_mb": self.results.get("file_size_mb", 0)
        }
