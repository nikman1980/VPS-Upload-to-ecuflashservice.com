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
            "part_number": None,
            "vin": None,
            "strings": []
        }
        
        # Extract ALL readable strings (6+ chars)
        strings = []
        current = b""
        for byte in file_data:
            if 32 <= byte <= 126:
                current += bytes([byte])
            else:
                if len(current) >= 6:
                    try:
                        s = current.decode("ascii").strip()
                        if any(c.isalpha() for c in s) and len(s) <= 100:
                            strings.append(s)
                    except: pass
                current = b""
        
        unique_strings = list(dict.fromkeys(strings))
        
        # Detect manufacturer from binary signatures
        mfr_sigs = {
            "Bosch": [b"BOSCH", b"Bosch", b"EDC17", b"EDC16", b"ME17", b"MED17", b"MG1", b"MD1", b"ME7"],
            "Denso": [b"DENSO", b"Denso", b"SH7058", b"SH7059"],
            "Siemens": [b"SIEMENS", b"SID", b"SIMOS", b"5WP", b"5WK"],
            "Continental": [b"Continental", b"CONTINENTAL", b"VDO", b"EMS"],
            "Delphi": [b"DELPHI", b"Delphi", b"DCM", b"DDCR", b"MT80"],
            "Marelli": [b"MARELLI", b"Marelli", b"IAW", b"MJD"],
            "Cummins": [b"CUMMINS", b"Cummins", b"CM2150", b"CM2", b"ISZ", b"ISL", b"ISB"],
            "Weichai": [b"WEICHAI", b"Weichai", b"WP10", b"WP12", b"WP13"],
            "Yuchai": [b"YUCHAI", b"Yuchai", b"YC6"],
            "Hitachi": [b"HITACHI", b"Hitachi", b"MEC"],
        }
        
        for mfr, sigs in mfr_sigs.items():
            for sig in sigs:
                if sig in file_data:
                    self.results["manufacturer"] = mfr
                    break
            if self.results["manufacturer"]: break
        
        # Detect ECU type from strings
        ecu_patterns = ["EDC17", "EDC16", "ME17", "MED17", "MG1", "MD1", "ME7", 
                       "SH7058", "SH7059", "SID", "SIMOS", "DCM", "IAW", "MJD",
                       "CM2150", "CM2", "TC1767", "TC1796", "TC1797"]
        for s in unique_strings:
            for pat in ecu_patterns:
                if pat in s.upper():
                    # Extract full ECU name
                    match = re.search(r'(EDC17[A-Z0-9]*|ME17[A-Z0-9]*|MED17[A-Z0-9]*|MG1[A-Z0-9]*|MD1[A-Z0-9]*|SID[0-9]*|CM2[0-9]*|TC17[0-9]*)', s, re.IGNORECASE)
                    if match:
                        self.results["ecu_type"] = match.group(1).upper()
                        break
            if self.results["ecu_type"]: break
        
        # Find calibration ID patterns
        cal_patterns = [
            rb'([A-Z]{1,2}[0-9]{6,10}[A-Z0-9]*)',  # P1158774, NR0000000227
            rb'CAL[_\s-]?ID[:\s=]*([A-Z0-9_\-\.]{5,25})',
        ]
        for pat in cal_patterns:
            matches = re.findall(pat, file_data)
            if matches:
                for m in matches:
                    try:
                        val = m.decode("utf-8", errors="ignore")
                        if len(val) >= 6 and any(c.isdigit() for c in val) and any(c.isalpha() for c in val):
                            self.results["calibration_id"] = val
                            break
                    except: pass
            if self.results["calibration_id"]: break
        
        # Find software version
        for s in unique_strings:
            if "SW" in s.upper() or "VER" in s.upper() or "_V" in s:
                match = re.search(r'V?(\d+\.\d+\.\d+)', s)
                if match:
                    self.results["software_version"] = match.group(1)
                    break
                # Also try pattern like B_EDC17CV_EME_CB.03.01.03
                match = re.search(r'[._](\d+\.\d+\.\d+)$', s)
                if match:
                    self.results["software_version"] = match.group(1)
                    break
        
        # Find part number (10-digit Bosch format)
        pn_pat = rb'(10[0-9]{8})'
        matches = re.findall(pn_pat, file_data)
        if matches:
            self.results["part_number"] = matches[0].decode("utf-8")
        
        # Find VIN (17 chars)
        vin_pat = rb'([A-HJ-NPR-Z0-9]{17})'
        matches = re.findall(vin_pat, file_data)
        for m in matches:
            try:
                vin = m.decode("utf-8")
                # Validate VIN-like pattern
                if any(c.isdigit() for c in vin) and any(c.isalpha() for c in vin):
                    self.results["vin"] = vin
                    break
            except: pass
        
        # Store interesting strings
        keywords = ["VER", "CAL", "ECU", "BOSCH", "DENSO", "DELPHI", "EDC", "SID", "SW", "HW"]
        interesting = [s for s in unique_strings if any(kw in s.upper() for kw in keywords)]
        self.results["strings"] = interesting[:15]
        
        return self.results
    
    def get_display_info(self):
        mfr = self.results.get("manufacturer", "Unknown")
        ecu = self.results.get("ecu_type")
        if ecu:
            display_ecu = f"{mfr} {ecu}" if mfr and mfr != "Unknown" else ecu
        else:
            display_ecu = f"{mfr} ECU" if mfr else "Unknown ECU"
        
        return {
            "manufacturer": mfr,
            "ecu_type": display_ecu,
            "calibration_id": self.results.get("calibration_id", ""),
            "software_version": self.results.get("software_version", ""),
            "part_number": self.results.get("part_number", ""),
            "vin": self.results.get("vin", ""),
            "strings": self.results.get("strings", []),
            "file_size_mb": self.results["file_size_mb"]
        }
