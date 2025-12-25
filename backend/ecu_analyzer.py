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
        
        # Step 7: Infer processor from manufacturer if not directly detected
        if not self.results["processor"] and self.results["manufacturer"]:
            self._infer_processor_from_manufacturer()
        
        # Step 8: Set ECU type if still missing
        if not self.results["ecu_type"] and self.results["manufacturer"]:
            self.results["ecu_type"] = f"{self.results['manufacturer']} ECU"
        
        # Step 9: Filter interesting strings for display
        self.results["strings"] = self._filter_strings(extracted_strings)
        
        return self.results
    
    def _infer_processor_from_manufacturer(self):
        """Infer likely processor family based on ECU manufacturer"""
        
        manufacturer = self.results.get("manufacturer", "")
        
        # Manufacturer to processor mapping (most common configurations)
        processor_hints = {
            # Japanese manufacturers typically use Renesas
            "Transtron": "Likely Renesas (SH/V850/RH850)",
            "Denso": "Likely Renesas SH705x/RH850",
            "Hitachi": "Likely Renesas SH/RH850",
            "Keihin": "Likely Renesas SH705x",
            "Mitsubishi Electric": "Likely Renesas/NEC",
            "Jatco": "Likely Renesas",
            "Aisin": "Likely Renesas",
            "Fujitsu Ten": "Likely Fujitsu FR/MB9x",
            
            # European manufacturers typically use Infineon TriCore or ST
            "Bosch": "Likely Infineon TriCore",
            "Siemens/Continental": "Likely Infineon TriCore/C16x",
            "Delphi": "Likely NXP MPC5xx/ST",
            "Marelli": "Likely ST/NXP",
            "Visteon": "Likely NXP/Freescale",
            
            # Korean
            "Kefico": "Likely Infineon/NXP",
            
            # Chinese
            "Weichai": "Likely Bosch platform (TriCore)",
            "Yuchai": "Likely Bosch platform (TriCore)",
        }
        
        if manufacturer in processor_hints:
            self.results["processor"] = processor_hints[manufacturer]
    
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
        """Detect microprocessor/microcontroller - Comprehensive ECU CPU detection"""
        
        # =====================================================================
        # INFINEON TRICORE FAMILY (Most common in modern ECUs)
        # Used in: Bosch MED17, EDC17, MD1, MG1 and Continental/Siemens ECUs
        # =====================================================================
        
        # TC3xx Series (Latest generation - AURIX 2G)
        tc3_patterns = [rb"TC3[0-9]{2}", rb"TC38[0-9]", rb"TC37[0-9]", rb"TC36[0-9]", rb"TC35[0-9]"]
        for pat in tc3_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["processor"] = f"Infineon TriCore {match.group(0).decode('utf-8')} (AURIX 2G)"
                return
        
        # TC2xx Series (AURIX 1G - very common)
        tc2_patterns = [rb"TC2[0-9]{2}", rb"TC27[0-9]", rb"TC26[0-9]", rb"TC29[0-9]", rb"TC23[0-9]"]
        for pat in tc2_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["processor"] = f"Infineon TriCore {match.group(0).decode('utf-8')} (AURIX)"
                return
        
        # TC1xx Series (Older but still common)
        tc1_patterns = [rb"TC1797", rb"TC1796", rb"TC1767", rb"TC1766", rb"TC1782", rb"TC1784", rb"TC1724", rb"TC17[0-9]{2}"]
        for pat in tc1_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["processor"] = f"Infineon TriCore {match.group(0).decode('utf-8')}"
                return
        
        # Generic TriCore detection
        if b"TriCore" in file_data or b"TRICORE" in file_data or b"Infineon" in file_data:
            self.results["processor"] = "Infineon TriCore"
            return
        
        # =====================================================================
        # RENESAS FAMILY (Common in Japanese ECUs - Denso, Hitachi)
        # =====================================================================
        
        # RH850 Family (Modern Renesas - replacing V850)
        rh850_patterns = [rb"RH850", rb"rh850", rb"RH850/[A-Z0-9]+"]
        for pat in rh850_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["processor"] = "Renesas RH850"
                return
        
        # SuperH SH7xxx Family (Older Renesas, very common in Denso ECUs)
        sh_patterns = [
            (rb"SH7058", "Renesas SH7058"),
            (rb"SH7059", "Renesas SH7059"),
            (rb"SH7055", "Renesas SH7055"),
            (rb"SH7052", "Renesas SH7052"),
            (rb"SH7054", "Renesas SH7054"),
            (rb"SH7057", "Renesas SH7057"),
            (rb"SH705[0-9]", "Renesas SH705x"),
            (rb"SH7[0-9]{3}", "Renesas SuperH"),
        ]
        for pat, name in sh_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # V850 Family (Older NEC/Renesas)
        v850_patterns = [rb"V850", rb"v850", rb"V850E", rb"V850ES"]
        for pat in v850_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = "Renesas V850"
                return
        
        # 78K Family (NEC/Renesas 8/16-bit)
        if b"78K" in file_data or b"uPD78" in file_data:
            self.results["processor"] = "Renesas 78K"
            return
        
        # Generic Renesas
        if b"Renesas" in file_data or b"RENESAS" in file_data:
            self.results["processor"] = "Renesas"
            return
        
        # =====================================================================
        # NXP/FREESCALE MPC5xx FAMILY (Power Architecture - common in ECUs)
        # Used in: Bosch, Delphi, Continental ECUs
        # =====================================================================
        
        mpc_patterns = [
            (rb"MPC5777", "NXP MPC5777"),
            (rb"MPC5775", "NXP MPC5775"),
            (rb"MPC5748", "NXP MPC5748"),
            (rb"MPC5746", "NXP MPC5746"),
            (rb"MPC5744", "NXP MPC5744"),
            (rb"MPC5676", "NXP MPC5676"),
            (rb"MPC5674", "NXP MPC5674"),
            (rb"MPC5668", "NXP MPC5668"),
            (rb"MPC5667", "NXP MPC5667"),
            (rb"MPC5566", "NXP MPC5566"),
            (rb"MPC5565", "NXP MPC5565"),
            (rb"MPC5564", "NXP MPC5564"),
            (rb"MPC5554", "NXP MPC5554"),
            (rb"MPC5553", "NXP MPC5553"),
            (rb"MPC5534", "NXP MPC5534"),
            (rb"MPC5[0-9]{3}", "NXP MPC5xxx"),
            (rb"MPC5[0-9]+", "NXP MPC5xx"),
        ]
        for pat, name in mpc_patterns:
            match = re.search(pat, file_data)
            if match:
                self.results["processor"] = name
                return
        
        # Generic Freescale/NXP
        if b"Freescale" in file_data or b"FREESCALE" in file_data:
            self.results["processor"] = "Freescale/NXP"
            return
        
        # =====================================================================
        # ST MICROELECTRONICS FAMILY
        # Used in: Marelli, some Bosch ECUs
        # =====================================================================
        
        # SPC5xx Family (Power Architecture based)
        spc_patterns = [
            (rb"SPC58", "ST SPC58xx"),
            (rb"SPC57", "ST SPC57xx"),
            (rb"SPC56", "ST SPC56xx"),
            (rb"SPC5[0-9]", "ST SPC5xx"),
        ]
        for pat, name in spc_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # ST10 Family (16-bit, older ECUs)
        st10_patterns = [
            (rb"ST10F2[0-9]{2}", "ST ST10F2xx"),
            (rb"ST10F168", "ST ST10F168"),
            (rb"ST10F269", "ST ST10F269"),
            (rb"ST10F273", "ST ST10F273"),
            (rb"ST10F275", "ST ST10F275"),
            (rb"ST10F276", "ST ST10F276"),
            (rb"ST10F280", "ST ST10F280"),
            (rb"ST10", "ST ST10"),
        ]
        for pat, name in st10_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # =====================================================================
        # INFINEON/SIEMENS C16x FAMILY (Older 16-bit)
        # Used in: Siemens/Continental ECUs, older Bosch
        # =====================================================================
        
        c16x_patterns = [
            (rb"C167", "Infineon C167"),
            (rb"C166", "Infineon C166"),
            (rb"C164", "Infineon C164"),
            (rb"C161", "Infineon C161"),
            (rb"XC16[0-9]", "Infineon XC16x"),
            (rb"XC2[0-9]{3}", "Infineon XC2xxx"),
        ]
        for pat, name in c16x_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # =====================================================================
        # MOTOROLA 68HC FAMILY (Legacy ECUs)
        # Used in: Very old ECUs, some Ford, GM applications
        # =====================================================================
        
        m68_patterns = [
            (rb"68HC12", "Motorola 68HC12"),
            (rb"68HC11", "Motorola 68HC11"),
            (rb"68HC08", "Motorola 68HC08"),
            (rb"68HC05", "Motorola 68HC05"),
            (rb"MC68HC", "Motorola 68HC"),
            (rb"MC9S12", "Freescale S12"),
            (rb"S12X", "Freescale S12X"),
            (rb"S12", "Freescale S12"),
        ]
        for pat, name in m68_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # =====================================================================
        # NEC FAMILY (Older Japanese ECUs)
        # =====================================================================
        
        nec_patterns = [
            (rb"uPD70", "NEC 70xx"),
            (rb"uPD78", "NEC 78K"),
            (rb"76F00[0-9]+", "NEC 76F00xx"),
        ]
        for pat, name in nec_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        if b"NEC" in file_data:
            self.results["processor"] = "NEC"
            return
        
        # =====================================================================
        # TEXAS INSTRUMENTS FAMILY
        # Used in: Some body controllers, infotainment
        # =====================================================================
        
        ti_patterns = [
            (rb"TMS470", "TI TMS470"),
            (rb"TMS570", "TI TMS570"),
            (rb"TMS320", "TI TMS320 DSP"),
            (rb"Hercules", "TI Hercules"),
        ]
        for pat, name in ti_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # =====================================================================
        # FUJITSU/SPANSION FAMILY
        # Used in: Some Asian manufacturer ECUs
        # =====================================================================
        
        fujitsu_patterns = [
            (rb"MB91F", "Fujitsu MB91F"),
            (rb"MB90F", "Fujitsu MB90F"),
            (rb"FR60", "Fujitsu FR60"),
            (rb"FR80", "Fujitsu FR80"),
        ]
        for pat, name in fujitsu_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
                return
        
        # =====================================================================
        # MICROCHIP/ATMEL FAMILY
        # Used in: Some auxiliary ECUs, sensors
        # =====================================================================
        
        if b"ATMEGA" in file_data or b"ATmega" in file_data:
            self.results["processor"] = "Atmel ATmega"
            return
        
        if b"ATXMEGA" in file_data or b"ATxmega" in file_data:
            self.results["processor"] = "Atmel ATxmega"
            return
        
        if b"PIC18" in file_data or b"PIC24" in file_data or b"dsPIC" in file_data:
            self.results["processor"] = "Microchip PIC"
            return
        
        # =====================================================================
        # ARM CORTEX FAMILY (Modern trend in automotive)
        # =====================================================================
        
        arm_patterns = [
            (rb"Cortex-R", "ARM Cortex-R"),
            (rb"Cortex-M", "ARM Cortex-M"),
            (rb"ARM7", "ARM7"),
            (rb"ARM9", "ARM9"),
        ]
        for pat, name in arm_patterns:
            if re.search(pat, file_data):
                self.results["processor"] = name
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
        """Detect VIN (Vehicle Identification Number) - Only show if 100% confident"""
        
        # VIN must be exactly 17 characters, excluding I, O, Q
        vin_pattern = rb"([A-HJ-NPR-Z0-9]{17})"
        matches = re.findall(vin_pattern, file_data)
        
        for v in matches:
            try:
                vin = v.decode("utf-8")
                
                # Skip if it looks like random hex data
                if all(c in "0123456789ABCDEF" for c in vin):
                    continue
                
                # Skip if all same character or repeating pattern
                if len(set(vin)) < 10:  # Real VINs have high entropy
                    continue
                
                # Skip patterns containing common ECU strings
                skip_patterns = ["SW", "HW", "CAL", "VER", "ECU", "EDC", "MED", "SID"]
                if any(pat in vin for pat in skip_patterns):
                    continue
                
                # Count digits and letters
                digits = sum(c.isdigit() for c in vin)
                letters = sum(c.isalpha() for c in vin)
                
                # Real VINs have specific structure:
                # - Digits typically 6-10
                # - Letters typically 7-11
                if digits < 6 or digits > 10:
                    continue
                if letters < 7 or letters > 11:
                    continue
                
                # First character must be valid country code
                # 1-5 = North America, J = Japan, K = Korea, S = UK, W = Germany, etc.
                valid_first = "12345JKLMNPRSTUVWXYZ"
                if vin[0] not in valid_first:
                    continue
                
                # Position 9 check digit must be 0-9 or X
                if vin[8] not in "0123456789X":
                    continue
                
                # Position 10 (model year) - valid year codes for 1980-2030
                valid_years = "ABCDEFGHJKLMNPRSTVWXY123456789"
                if vin[9] not in valid_years:
                    continue
                
                # Last 6 characters (serial) should be mostly digits (at least 5)
                serial = vin[11:17]
                serial_digits = sum(c.isdigit() for c in serial)
                if serial_digits < 5:
                    continue
                
                # Position 2-3 should be manufacturer code (letters or digits)
                # Position 4-8 is VDS (vehicle descriptor section)
                
                # Check for realistic patterns - avoid calibration IDs
                # Real VINs don't start with 0
                if vin[0] == "0":
                    continue
                
                # Avoid patterns that look like part numbers
                if vin[:2].isdigit() and vin[2] in "SW":
                    continue
                
                # Passed all strict checks - this is likely a real VIN
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
