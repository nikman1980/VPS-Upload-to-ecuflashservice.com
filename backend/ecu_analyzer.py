import re

class ECUAnalyzer:
    """
    ECU Binary File Analyzer
    Detects manufacturer, ECU type, and extracts relevant information from ECU binary files.
    """
    
    def __init__(self):
        self.results = {}
    
    def analyze(self, file_data):
        """Main analysis method - analyzes binary ECU file data"""
        self.results = {
            "success": True,
            "file_size_mb": round(len(file_data) / (1024 * 1024), 2),
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
        
        # Extract readable strings from binary
        extracted_strings = self._extract_strings(file_data)
        
        # Step 1: Direct byte signature detection (most reliable)
        self._detect_manufacturer_from_bytes(file_data)
        
        # Step 2: ECU type pattern detection
        self._detect_ecu_type(file_data)
        
        # Step 3: Part number detection
        self._detect_part_number(file_data)
        
        # Step 4: Processor detection
        self._detect_processor(file_data)
        
        # Step 5: Calibration and version info
        self._detect_calibration(file_data, extracted_strings)
        
        # Step 6: VIN detection
        self._detect_vin(file_data)
        
        # Step 7: Set ECU type if still missing
        if not self.results["ecu_type"] and self.results["manufacturer"]:
            self.results["ecu_type"] = f"{self.results['manufacturer']} ECU"
        
        # Step 8: Filter interesting strings for display
        self.results["strings"] = self._filter_strings(extracted_strings)
        
        return self.results
    
    def _detect_manufacturer_from_bytes(self, file_data):
        """Direct byte-level manufacturer detection - checks if signature exists in file"""
        
        # Manufacturer signatures - order matters (more specific first)
        signatures = [
            # Japanese
            (b"Transtron", "Transtron", "Subaru/Nissan/Mazda"),
            (b"TRANSTRON", "Transtron", "Subaru/Nissan/Mazda"),
            (b"DENSO", "Denso", None),
            (b"Denso", "Denso", None),
            (b"KEIHIN", "Keihin", "Honda/Acura"),
            (b"Keihin", "Keihin", "Honda/Acura"),
            (b"HITACHI", "Hitachi", None),
            (b"Hitachi", "Hitachi", None),
            (b"JATCO", "Jatco", "Nissan/Renault CVT"),
            (b"Jatco", "Jatco", "Nissan/Renault CVT"),
            (b"MITSUBISHI", "Mitsubishi Electric", None),
            (b"AISIN", "Aisin", "Toyota/Lexus Transmission"),
            (b"Fujitsu", "Fujitsu Ten", None),
            
            # European
            (b"BOSCH", "Bosch", None),
            (b"Bosch", "Bosch", None),
            (b"SIEMENS", "Siemens/Continental", None),
            (b"CONTINENTAL", "Siemens/Continental", None),
            (b"Continental", "Siemens/Continental", None),
            (b"DELPHI", "Delphi", None),
            (b"Delphi", "Delphi", None),
            (b"MARELLI", "Marelli", None),
            (b"Marelli", "Marelli", None),
            (b"VISTEON", "Visteon", None),
            (b"VALEO", "Valeo", None),
            (b"LUCAS", "Lucas", None),
            (b"SAGEM", "Sagem", None),
            (b"WABCO", "Wabco", None),
            (b"KNORR", "Knorr-Bremse", None),
            (b"ZF Friedrichshafen", "ZF", "Transmission"),
            
            # Korean
            (b"KEFICO", "Kefico", "Hyundai/Kia"),
            (b"Kefico", "Kefico", "Hyundai/Kia"),
            
            # Chinese
            (b"WEICHAI", "Weichai", None),
            (b"Weichai", "Weichai", None),
            (b"YUCHAI", "Yuchai", None),
            (b"Yuchai", "Yuchai", None),
            
            # American
            (b"CUMMINS", "Cummins", None),
            (b"Cummins", "Cummins", None),
            (b"MOTOROLA", "Motorola", None),
        ]
        
        for sig, mfr_name, vehicle_info in signatures:
            if sig in file_data:
                self.results["manufacturer"] = mfr_name
                if vehicle_info:
                    self.results["vehicle_info"] = vehicle_info
                return
    
    def _detect_ecu_type(self, file_data):
        """Detect specific ECU type from patterns"""
        
        ecu_patterns = [
            # Bosch diesel
            (rb"(EDC17[A-Z0-9]{0,5})", "Bosch"),
            (rb"(EDC16[A-Z0-9]{0,5})", "Bosch"),
            (rb"(EDC15[A-Z0-9]{0,5})", "Bosch"),
            # Bosch gasoline
            (rb"(MED17[A-Z0-9]{0,5})", "Bosch"),
            (rb"(ME17[A-Z0-9]{0,5})", "Bosch"),
            (rb"(MED9[A-Z0-9]{0,3})", "Bosch"),
            (rb"(ME7[A-Z0-9]{0,3})", "Bosch"),
            (rb"(MG1[A-Z0-9]{0,5})", "Bosch"),
            (rb"(MD1[A-Z0-9]{0,5})", "Bosch"),
            # Siemens/Continental
            (rb"(SID[0-9]{3})", "Siemens/Continental"),
            (rb"(SIMOS[0-9.]+)", "Siemens/Continental"),
            (rb"(PCR[0-9.]+)", "Siemens/Continental"),
            # Delphi
            (rb"(DCM[0-9.]+)", "Delphi"),
            (rb"(MT[0-9]{2})", "Delphi"),
            # Marelli
            (rb"(IAW[0-9A-Z]+)", "Marelli"),
            (rb"(MJD[0-9A-Z]+)", "Marelli"),
            # Denso
            (rb"(SH705[0-9])", "Denso"),
            (rb"(76F00[0-9]+)", "Denso"),
            # Hitachi
            (rb"(MEC[0-9A-Z]+)", "Hitachi"),
            # Mitsubishi
            (rb"(E6T[0-9A-Z]+)", "Mitsubishi Electric"),
            (rb"(E5T[0-9A-Z]+)", "Mitsubishi Electric"),
            # Cummins
            (rb"(CM[0-9]{3,4})", "Cummins"),
            # Jatco
            (rb"(JF[0-9]{3})", "Jatco"),
            # ZF
            (rb"([68]HP[0-9]{2})", "ZF"),
        ]
        
        for pattern, mfr_hint in ecu_patterns:
            match = re.search(pattern, file_data)
            if match:
                ecu_type = match.group(1).decode("utf-8", errors="ignore")
                self.results["ecu_type"] = f"{mfr_hint} {ecu_type}"
                if not self.results["manufacturer"]:
                    self.results["manufacturer"] = mfr_hint
                return
    
    def _detect_part_number(self, file_data):
        """Detect OEM part numbers"""
        
        part_patterns = [
            # Toyota/Lexus (Denso)
            (rb"(89[0-9]{3}-[0-9A-Z]{5})", "Toyota/Lexus", "Denso"),
            # Honda/Acura (Keihin)
            (rb"(37820-[A-Z0-9]{3,7})", "Honda/Acura", "Keihin"),
            (rb"(37805-[A-Z0-9]{3,7})", "Honda/Acura", "Keihin"),
            # Nissan/Infiniti
            (rb"(23710-[A-Z0-9]{5,7})", "Nissan/Infiniti", "Hitachi/Denso"),
            # Hyundai/Kia
            (rb"(39[0-9]{3}-[A-Z0-9]{5})", "Hyundai/Kia", "Kefico"),
            # Bosch 10-digit
            (rb"(0[0-9]{9})", None, "Bosch"),
            (rb"(1037[0-9]{6})", None, "Bosch"),
        ]
        
        for pattern, vehicle_hint, mfr_hint in part_patterns:
            match = re.search(pattern, file_data)
            if match:
                self.results["part_number"] = match.group(1).decode("utf-8", errors="ignore")
                if vehicle_hint and not self.results["vehicle_info"]:
                    self.results["vehicle_info"] = vehicle_hint
                if mfr_hint and not self.results["manufacturer"]:
                    self.results["manufacturer"] = mfr_hint
                return
    
    def _detect_processor(self, file_data):
        """Detect microprocessor/microcontroller"""
        
        if b"Infineon" in file_data or b"TriCore" in file_data or b"TC1797" in file_data or b"TC1767" in file_data:
            match = re.search(rb"TC17[0-9]{2}", file_data)
            if match:
                self.results["processor"] = f"Infineon TriCore {match.group(0).decode('utf-8')}"
            else:
                self.results["processor"] = "Infineon TriCore"
            return
        
        if b"Renesas" in file_data or b"SH7058" in file_data or b"SH7059" in file_data:
            self.results["processor"] = "Renesas SH705x"
            return
        
        if b"Freescale" in file_data or b"MPC5" in file_data:
            match = re.search(rb"MPC5[0-9]+", file_data)
            if match:
                self.results["processor"] = f"Freescale {match.group(0).decode('utf-8')}"
            else:
                self.results["processor"] = "Freescale MPC5xx"
            return
        
        if b"NEC" in file_data:
            self.results["processor"] = "NEC"
            return
    
    def _detect_calibration(self, file_data, strings):
        """Detect calibration ID and software version"""
        
        # Calibration ID patterns
        cal_patterns = [
            rb"CAL[_\-\s]?ID[:\s=]*([A-Z0-9_\-]{6,25})",
            rb"CALID[:\s=]*([A-Z0-9_\-]{6,25})",
        ]
        
        for pat in cal_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["calibration_id"] = match.group(1).decode("utf-8", errors="ignore")
                break
        
        # Software version from strings
        for s in strings:
            s_upper = s.upper()
            if "VERSION" in s_upper or "VER " in s_upper or "VER:" in s_upper or "SW:" in s_upper:
                match = re.search(r"V?(\d+\.\d+\.?\d*)", s)
                if match:
                    self.results["software_version"] = match.group(1)
                    break
    
    def _detect_vin(self, file_data):
        """Detect VIN (Vehicle Identification Number)"""
        
        vin_pattern = rb"([A-HJ-NPR-Z0-9]{17})"
        matches = re.findall(vin_pattern, file_data)
        
        for v in matches:
            try:
                vin = v.decode("utf-8")
                digits = sum(c.isdigit() for c in vin)
                letters = sum(c.isalpha() for c in vin)
                # Valid VIN has mix of letters and numbers
                if 4 <= digits <= 13 and 4 <= letters <= 13:
                    if vin[0] in "123456789JKLMNPRSTUVWXYZ":
                        self.results["vin"] = vin
                        break
            except:
                pass
    
    def _extract_strings(self, file_data):
        """Extract readable ASCII strings from binary data"""
        
        strings = []
        current = b""
        
        for byte in file_data:
            if 32 <= byte <= 126:  # Printable ASCII
                current += bytes([byte])
            else:
                if len(current) >= 5:
                    try:
                        s = current.decode("ascii").strip()
                        if any(c.isalpha() for c in s) and len(s) <= 100:
                            if not self._is_garbage(s):
                                strings.append(s)
                    except:
                        pass
                current = b""
        
        # Handle last string
        if len(current) >= 5:
            try:
                s = current.decode("ascii").strip()
                if any(c.isalpha() for c in s) and len(s) <= 100:
                    if not self._is_garbage(s):
                        strings.append(s)
            except:
                pass
        
        return list(dict.fromkeys(strings))  # Remove duplicates, preserve order
    
    def _is_garbage(self, s):
        """Check if string looks like garbage/random data"""
        
        # Too few unique characters
        if len(s) > 5 and len(set(s)) < len(s) * 0.25:
            return True
        
        # Too many special characters
        special = sum(1 for c in s if c in "{}[]|\\~`@#$%^&*()+=<>")
        if special > len(s) * 0.15:
            return True
        
        # Looks like hex dump
        if re.match(r"^[0-9A-Fa-f\s]+$", s) and len(s) > 16:
            return True
        
        # All same case letters (likely garbage)
        if re.match(r"^[a-z]{15,}$", s) or re.match(r"^[A-Z]{15,}$", s):
            return True
        
        # Repeated characters
        if re.match(r"^(.)\1{5,}", s):
            return True
        
        return False
    
    def _filter_strings(self, strings):
        """Filter and return the most relevant strings"""
        
        keywords = [
            "VER", "CAL", "ECU", "ENGINE", "DIESEL", "DPF", "EGR", "SCR",
            "OBD", "CAN", "DIAG", "CONTROL", "MODULE", "SYSTEM",
            "Copyright", "BOSCH", "DENSO", "DELPHI", "SIEMENS", "MARELLI",
            "HITACHI", "TOYOTA", "HONDA", "NISSAN", "Transtron"
        ]
        
        interesting = []
        seen = set()
        
        for s in strings:
            s_clean = s.strip()
            if s_clean in seen or len(s_clean) < 5:
                continue
            seen.add(s_clean)
            
            # Contains keywords
            if any(kw.lower() in s_clean.lower() for kw in keywords):
                interesting.append(s_clean)
            # Looks like identifier
            elif re.match(r"^[A-Z0-9\-_]{8,25}$", s_clean):
                interesting.append(s_clean)
        
        return interesting[:20]
    
    def get_display_info(self):
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
