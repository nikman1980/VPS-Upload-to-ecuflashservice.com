import re

class ECUAnalyzer:
    def __init__(self):
        self.results = {}
    
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
        
        # Extract readable strings (only clean ASCII, 6+ chars)
        strings = []
        current = b""
        for byte in file_data:
            if 32 <= byte <= 126:
                current += bytes([byte])
            else:
                if len(current) >= 6:
                    try:
                        s = current.decode("ascii").strip()
                        # Only keep strings with letters and reasonable characters
                        if (any(c.isalpha() for c in s) and 
                            len(s) <= 80 and
                            not self._is_garbage(s)):
                            strings.append(s)
                    except: pass
                current = b""
        
        unique_strings = list(dict.fromkeys(strings))
        
        # === TOYOTA DETECTION ===
        # Look for Toyota part numbers: 89661-XXXXX or 89663-XXXXX
        toyota_pattern = rb'(89[0-9]{3}-[0-9A-Z]{5})'
        toyota_matches = re.findall(toyota_pattern, file_data)
        if toyota_matches:
            self.results["part_number"] = toyota_matches[0].decode("utf-8")
            self.results["manufacturer"] = "Denso"
            self.results["vehicle_info"] = "Toyota/Lexus"
            # Detect ECU type from part number
            part = self.results["part_number"]
            if part.startswith("89661"):
                self.results["ecu_type"] = "Denso Engine ECU"
            elif part.startswith("89663"):
                self.results["ecu_type"] = "Denso Diesel ECU"
            elif part.startswith("89664"):
                self.results["ecu_type"] = "Denso Transmission ECU"
        
        # === BOSCH DETECTION ===
        bosch_sigs = [b"BOSCH", b"Bosch", b"EDC17", b"EDC16", b"ME17", b"MED17", b"MG1", b"MD1", b"ME7", b"MED9"]
        for sig in bosch_sigs:
            if sig in file_data:
                self.results["manufacturer"] = "Bosch"
                # Find specific ECU type
                ecu_match = re.search(rb'(EDC17[A-Z0-9]{0,5}|EDC16[A-Z0-9]{0,5}|MED17[A-Z0-9]{0,5}|ME17[A-Z0-9]{0,5}|MG1[A-Z0-9]{0,5}|MD1[A-Z0-9]{0,5}|MED9[A-Z0-9]{0,5}|ME7[A-Z0-9]{0,5})', file_data)
                if ecu_match:
                    self.results["ecu_type"] = "Bosch " + ecu_match.group(1).decode("utf-8")
                else:
                    self.results["ecu_type"] = "Bosch ECU"
                break
        
        # === DENSO DETECTION (non-Toyota) ===
        if not self.results["manufacturer"]:
            denso_sigs = [b"DENSO", b"Denso", b"SH7058", b"SH7059", b"SH7055", b"76F00"]
            for sig in denso_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Denso"
                    if b"SH7058" in file_data or b"SH7059" in file_data or b"SH7055" in file_data:
                        self.results["ecu_type"] = "Denso SH705x"
                    else:
                        self.results["ecu_type"] = "Denso ECU"
                    break
        
        # === SIEMENS/CONTINENTAL DETECTION ===
        if not self.results["manufacturer"]:
            siemens_sigs = [b"SIEMENS", b"Siemens", b"SIMOS", b"SID", b"CONTINENTAL", b"Continental", b"5WP", b"5WK"]
            for sig in siemens_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Siemens/Continental"
                    ecu_match = re.search(rb'(SID[0-9]{3}|SIMOS[0-9.]+|PCR[0-9.]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Siemens/Continental ECU"
                    break
        
        # === DELPHI DETECTION ===
        if not self.results["manufacturer"]:
            delphi_sigs = [b"DELPHI", b"Delphi", b"DCM", b"DDCR", b"MT80"]
            for sig in delphi_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Delphi"
                    ecu_match = re.search(rb'(DCM[0-9.]+|MT[0-9]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Delphi " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Delphi ECU"
                    break
        
        # === MARELLI DETECTION ===
        if not self.results["manufacturer"]:
            marelli_sigs = [b"MARELLI", b"Marelli", b"IAW", b"MJD"]
            for sig in marelli_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Marelli"
                    ecu_match = re.search(rb'(IAW[0-9A-Z]+|MJD[0-9A-Z]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Marelli " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Marelli ECU"
                    break
        
        # === CUMMINS DETECTION ===
        if not self.results["manufacturer"]:
            cummins_sigs = [b"CUMMINS", b"Cummins", b"CM2150", b"CM2250", b"CM870"]
            for sig in cummins_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Cummins"
                    ecu_match = re.search(rb'(CM[0-9]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Cummins " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Cummins ECU"
                    break
        
        # === WEICHAI/YUCHAI DETECTION ===
        if not self.results["manufacturer"]:
            chinese_sigs = [b"WEICHAI", b"Weichai", b"WP10", b"WP12", b"WP13", b"YUCHAI", b"Yuchai", b"YC6"]
            for sig in chinese_sigs:
                if sig in file_data:
                    if b"WEICHAI" in file_data or b"Weichai" in file_data or b"WP1" in file_data:
                        self.results["manufacturer"] = "Weichai"
                        self.results["ecu_type"] = "Weichai ECU"
                    else:
                        self.results["manufacturer"] = "Yuchai"
                        self.results["ecu_type"] = "Yuchai ECU"
                    break
        
        # === HITACHI DETECTION ===
        if not self.results["manufacturer"]:
            hitachi_sigs = [b"HITACHI", b"Hitachi", b"MEC", b"HCM"]
            for sig in hitachi_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Hitachi"
                    ecu_match = re.search(rb'(MEC[0-9A-Z]+|HCM[0-9A-Z]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Hitachi " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Hitachi ECU"
                    break
        
        # === KEIHIN (Honda) DETECTION ===
        if not self.results["manufacturer"]:
            keihin_sigs = [b"KEIHIN", b"Keihin", b"37820-", b"37805-"]
            for sig in keihin_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Keihin"
                    self.results["vehicle_info"] = "Honda/Acura"
                    # Look for Honda part numbers
                    honda_pn = re.search(rb'(37820-[A-Z0-9]{3,7}|37805-[A-Z0-9]{3,7})', file_data)
                    if honda_pn:
                        self.results["part_number"] = honda_pn.group(1).decode("utf-8")
                        self.results["ecu_type"] = "Keihin Engine ECU"
                    else:
                        self.results["ecu_type"] = "Keihin ECU"
                    break
        
        # === MITSUBISHI DETECTION ===
        if not self.results["manufacturer"]:
            mitsu_sigs = [b"MITSUBISHI", b"Mitsubishi", b"E6T", b"E5T", b"MH8"]
            for sig in mitsu_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Mitsubishi Electric"
                    ecu_match = re.search(rb'(E6T[0-9A-Z]+|E5T[0-9A-Z]+|MH8[0-9A-Z]+)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Mitsubishi " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Mitsubishi ECU"
                    break
        
        # === JATCO (Nissan CVT) DETECTION ===
        if not self.results["manufacturer"]:
            jatco_sigs = [b"JATCO", b"Jatco", b"JF011", b"JF015", b"JF017"]
            for sig in jatco_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Jatco"
                    self.results["vehicle_info"] = "Nissan/Renault CVT"
                    ecu_match = re.search(rb'(JF[0-9]{3}[A-Z]*)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Jatco " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Jatco TCU"
                    break
        
        # === VISTEON DETECTION ===
        if not self.results["manufacturer"]:
            visteon_sigs = [b"VISTEON", b"Visteon", b"DCU"]
            for sig in visteon_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Visteon"
                    self.results["ecu_type"] = "Visteon ECU"
                    break
        
        # === ZF DETECTION (Transmissions) ===
        if not self.results["manufacturer"]:
            zf_sigs = [b"ZF Friedrichshafen", b"ZF GETRIEBE", b"6HP", b"8HP"]
            for sig in zf_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "ZF"
                    self.results["vehicle_info"] = "Transmission"
                    ecu_match = re.search(rb'([68]HP[0-9]{2})', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "ZF " + ecu_match.group(1).decode("utf-8") + " TCU"
                    else:
                        self.results["ecu_type"] = "ZF Transmission ECU"
                    break
        
        # === AISIN (Toyota/Lexus Transmissions) DETECTION ===
        if not self.results["manufacturer"]:
            aisin_sigs = [b"AISIN", b"Aisin", b"A960", b"A750", b"U660"]
            for sig in aisin_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Aisin"
                    self.results["vehicle_info"] = "Toyota/Lexus Transmission"
                    ecu_match = re.search(rb'([AU][0-9]{3}[A-Z]*)', file_data)
                    if ecu_match:
                        self.results["ecu_type"] = "Aisin " + ecu_match.group(1).decode("utf-8")
                    else:
                        self.results["ecu_type"] = "Aisin TCU"
                    break
        
        # === NISSAN DETECTION ===
        if not self.results["manufacturer"]:
            nissan_pn = re.search(rb'(23710-[A-Z0-9]{5,7})', file_data)
            if nissan_pn:
                self.results["manufacturer"] = "Hitachi/Denso"
                self.results["vehicle_info"] = "Nissan/Infiniti"
                self.results["part_number"] = nissan_pn.group(1).decode("utf-8")
                self.results["ecu_type"] = "Nissan Engine ECU"
        
        # === HYUNDAI/KIA (Kefico) DETECTION ===
        if not self.results["manufacturer"]:
            kefico_sigs = [b"KEFICO", b"Kefico", b"39100-", b"39110-"]
            for sig in kefico_sigs:
                if sig in file_data:
                    self.results["manufacturer"] = "Kefico"
                    self.results["vehicle_info"] = "Hyundai/Kia"
                    hyundai_pn = re.search(rb'(39[0-9]{3}-[A-Z0-9]{5})', file_data)
                    if hyundai_pn:
                        self.results["part_number"] = hyundai_pn.group(1).decode("utf-8")
                    self.results["ecu_type"] = "Kefico Engine ECU"
                    break
        
        # === NEC/RENESAS DETECTION ===
        if b"NEC Electronics" in file_data or b"Renesas" in file_data:
            self.results["processor"] = "NEC/Renesas"
            if not self.results["manufacturer"]:
                self.results["manufacturer"] = "Unknown (NEC Processor)"
        
        # === INFINEON/TRICORE DETECTION ===
        if b"Infineon" in file_data or b"TriCore" in file_data or b"TC1797" in file_data or b"TC1767" in file_data:
            proc_match = re.search(rb'(TC17[0-9]{2})', file_data)
            if proc_match:
                self.results["processor"] = "Infineon " + proc_match.group(1).decode("utf-8")
            else:
                self.results["processor"] = "Infineon TriCore"
        
        # === CALIBRATION ID ===
        # Look for common calibration ID patterns
        cal_patterns = [
            rb'CAL[_\-\s]?ID[:\s=]*([A-Z0-9_\-]{6,20})',
            rb'SW[:\s]?([A-Z0-9]{8,16})',
            rb'HW[:\s]?([A-Z0-9]{8,16})',
        ]
        for pat in cal_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["calibration_id"] = match.group(1).decode("utf-8", errors="ignore")
                break
        
        # Look for Bosch part numbers (10-digit)
        if not self.results["part_number"]:
            bosch_pn = re.search(rb'(0[0-9]{9}|1037[0-9]{6})', file_data)
            if bosch_pn:
                self.results["part_number"] = bosch_pn.group(1).decode("utf-8")
        
        # === SOFTWARE VERSION ===
        for s in unique_strings:
            if any(kw in s.upper() for kw in ["VER", "VERSION", "SW:", "SW_"]):
                match = re.search(r'V?(\d+\.\d+\.?\d*)', s)
                if match:
                    self.results["software_version"] = match.group(1)
                    break
        
        # === VIN (very strict - must be valid format) ===
        # VIN is exactly 17 chars, excludes I, O, Q
        vin_pattern = rb'([A-HJ-NPR-Z0-9]{17})'
        vin_matches = re.findall(vin_pattern, file_data)
        for v in vin_matches:
            try:
                vin = v.decode("utf-8")
                # VIN must have mix of letters and numbers, and common prefixes
                if (sum(c.isdigit() for c in vin) >= 4 and 
                    sum(c.isalpha() for c in vin) >= 4 and
                    any(vin.startswith(p) for p in ['1', '2', '3', '4', '5', 'J', 'K', 'L', 'M', 'N', 'S', 'V', 'W', 'Y', 'Z'])):
                    self.results["vin"] = vin
                    break
            except: pass
        
        # === FILTER INTERESTING STRINGS ===
        keywords = ["VER", "CAL", "ECU", "BOSCH", "DENSO", "DELPHI", "SIEMENS", "MARELLI",
                   "ENGINE", "DIESEL", "INJECT", "FUEL", "TURBO", "DPF", "EGR", "SCR",
                   "TOYOTA", "HONDA", "NISSAN", "VW", "BMW", "MERCEDES", "AUDI",
                   "Copyright", "CONTROL", "DIAG", "CAN", "OBD"]
        
        interesting = []
        for s in unique_strings:
            # Only keep strings with keywords or that look like identifiers
            if any(kw.lower() in s.lower() for kw in keywords):
                interesting.append(s)
            elif re.match(r'^[A-Z0-9\-_]{8,20}$', s):  # Looks like an ID
                interesting.append(s)
        
        self.results["strings"] = interesting[:15]
        
        return self.results
    
    def _is_garbage(self, s):
        """Check if string is garbage/random data"""
        # Too many repeated characters
        if len(set(s)) < len(s) * 0.3:
            return True
        # Too many special chars
        special = sum(1 for c in s if c in '{}[]|\\~`@#$%^&*()+=')
        if special > len(s) * 0.2:
            return True
        # Looks like hex dump
        if re.match(r'^[0-9A-Fa-f\s]+$', s) and len(s) > 20:
            return True
        # Random looking strings
        if re.match(r'^[a-z]{20,}$', s.lower()):
            return True
        return False
    
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
