"""
Professional ECU Database
=========================
Comprehensive database of ECU types, manufacturers, and their characteristics.
Built from research of professional tuning databases (WinOLS, mappacks, tuning forums).
"""

# ECU Manufacturer Signatures - Binary patterns to identify manufacturer
ECU_MANUFACTURER_SIGNATURES = {
    "Bosch": [
        b"Robert Bosch", b"ROBERT BOSCH", b"Bosch", b"BOSCH", b"(c) Bosch",
        b"EDC15", b"EDC16", b"EDC17", b"MED", b"ME7", b"MG1", b"MD1",
    ],
    "Continental": [
        b"Continental", b"CONTINENTAL", b"Siemens", b"SIEMENS", b"SID",
        b"EMS", b"Continental Automotive",
    ],
    "Denso": [
        b"DENSO", b"Denso", b"89661", b"SH705", b"76F00",
    ],
    "Delphi": [
        b"Delphi", b"DELPHI", b"DCM", b"DDCR",
    ],
    "Marelli": [
        b"Magneti Marelli", b"MAGNETI MARELLI", b"Marelli", b"MARELLI",
        b"IAW", b"MJD",
    ],
    "Transtron": [
        b"TRANSTRON", b"Transtron", b"TTI",
    ],
    "Cummins": [
        b"CUMMINS", b"Cummins", b"CM870", b"CM2150", b"CM2250", b"CM2350",
    ],
    "Hitachi": [
        b"HITACHI", b"Hitachi",
    ],
    "Keihin": [
        b"KEIHIN", b"Keihin",
    ],
    "Kefico": [
        b"KEFICO", b"Kefico",
    ],
}

# ECU Type Patterns - regex patterns to identify specific ECU types
# Format: (pattern, manufacturer, ecu_type, category)
ECU_TYPE_PATTERNS = [
    # Bosch EDC (Diesel) - Most specific first
    (rb"EDC17CP52", "Bosch", "EDC17CP52", "Diesel"),
    (rb"EDC17CV54", "Bosch", "EDC17CV54", "Diesel"),
    (rb"EDC17CV44", "Bosch", "EDC17CV44", "Diesel"),
    (rb"EDC17CV41", "Bosch", "EDC17CV41", "Diesel"),
    (rb"EDC17C[0-9]{2}", "Bosch", "EDC17Cxx", "Diesel"),
    (rb"EDC17CP[0-9]{2}", "Bosch", "EDC17CPxx", "Diesel"),
    (rb"EDC17[A-Z]{1,2}[0-9]{1,2}", "Bosch", "EDC17", "Diesel"),
    (rb"EDC17U[0-9]", "Bosch", "EDC17U", "Diesel"),
    (rb"EDC16[A-Z]{0,2}[0-9]{0,2}", "Bosch", "EDC16", "Diesel"),
    (rb"EDC15[A-Z]{0,2}[0-9]{0,2}", "Bosch", "EDC15", "Diesel"),
    
    # Bosch MD1/MG1 (Latest Diesel/Gasoline)
    (rb"MD1[A-Z]{2}[0-9]{0,3}", "Bosch", "MD1", "Diesel"),
    (rb"MG1[A-Z]{2}[0-9]{0,3}", "Bosch", "MG1", "Gasoline"),
    
    # Bosch MED/ME (Gasoline)
    (rb"MED17\.[0-9]+", "Bosch", "MED17", "Gasoline"),
    (rb"MED9\.[0-9]+", "Bosch", "MED9", "Gasoline"),
    (rb"ME7\.[0-9]+", "Bosch", "ME7", "Gasoline"),
    
    # Continental/Siemens SID (Diesel)
    (rb"SID807", "Continental", "SID807", "Diesel"),
    (rb"SID803[A]?", "Continental", "SID803", "Diesel"),
    (rb"SID901", "Continental", "SID901", "Diesel"),
    (rb"SID[0-9]{3}", "Continental", "SID", "Diesel"),
    
    # Continental EMS (Gasoline)
    (rb"EMS[0-9]{4}", "Continental", "EMS", "Gasoline"),
    
    # Delphi DCM (Diesel)
    (rb"DCM7\.[0-9]", "Delphi", "DCM7", "Diesel"),
    (rb"DCM6\.[0-9]", "Delphi", "DCM6", "Diesel"),
    (rb"DCM3\.[0-9]", "Delphi", "DCM3", "Diesel"),
    (rb"DDCR", "Delphi", "DDCR", "Diesel"),
    
    # Marelli MJD/IAW (Diesel)
    (rb"MJD[0-9][A-Z][0-9]", "Marelli", "MJD", "Diesel"),
    (rb"IAW[0-9][A-Z]{2}", "Marelli", "IAW", "Mixed"),
    
    # Denso
    (rb"89661-[0-9A-Z]{5}", "Denso", "Denso 89661", "Mixed"),
    (rb"SH7058", "Denso", "Denso SH7058", "Mixed"),
    (rb"SH7055", "Denso", "Denso SH7055", "Mixed"),
    (rb"76F0038", "Denso", "Denso 76F", "Diesel"),
    
    # Transtron (Isuzu)
    (rb"SH72544", "Transtron", "Transtron SH72544", "Diesel"),
    (rb"SH7059", "Transtron", "Transtron SH7059", "Diesel"),
    
    # Cummins
    (rb"CM2350", "Cummins", "CM2350", "Diesel"),
    (rb"CM2250", "Cummins", "CM2250", "Diesel"),
    (rb"CM2150[A-Z]?", "Cummins", "CM2150", "Diesel"),
    (rb"CM870", "Cummins", "CM870", "Diesel"),
]

# Truck/Commercial Vehicle Brand Signatures
TRUCK_BRAND_SIGNATURES = [
    (b"FUSO", "Mitsubishi FUSO"),
    (b"Fuso", "Mitsubishi FUSO"),
    (b"HINO", "Hino"),
    (b"Hino", "Hino"),
    (b"ISUZU", "Isuzu"),
    (b"Isuzu", "Isuzu"),
    (b"MAN ", "MAN"),
    (b"SCANIA", "Scania"),
    (b"Scania", "Scania"),
    (b"VOLVO", "Volvo"),
    (b"Volvo", "Volvo"),
    (b"DAF ", "DAF"),
    (b"IVECO", "Iveco"),
    (b"Iveco", "Iveco"),
    (b"MERCEDES", "Mercedes"),
    (b"Mercedes", "Mercedes"),
    (b"ACTROS", "Mercedes Actros"),
    (b"ATEGO", "Mercedes Atego"),
    (b"CANTER", "Mitsubishi Canter"),
    (b"Canter", "Mitsubishi Canter"),
    (b"FIGHTER", "Mitsubishi Fighter"),
    (b"RANGER", "Hino Ranger"),
    (b"PROFIA", "Hino Profia"),
    (b"FORWARD", "Isuzu Forward"),
    (b"GIGA", "Isuzu Giga"),
    (b"ELF", "Isuzu ELF"),
]

# Known SCR-equipped truck ECU types (heavy-duty vehicles)
# These ECU types are known to be in vehicles with SCR/AdBlue systems
TRUCK_ECUS_WITH_SCR = {
    # Cummins - All CM22xx and CM23xx have SCR
    "CM2250", "CM2350",
    # Bosch truck ECUs (Euro 5/6 commercial vehicles)
    "EDC17CP52", "EDC17CV41", "EDC17CV44", "EDC17CV54",
    "EDC17C49", "EDC17C54",
    # Continental truck ECUs
    "SID807", "SID901",
}

# SCR/AdBlue Dosing ECU Signatures
# These are SEPARATE ECUs that control AdBlue injection
SCR_DCU_SIGNATURES = [
    # Bosch Denoxtronic
    (b"DENOXTRONIC", "Bosch Denoxtronic"),
    (b"Denoxtronic", "Bosch Denoxtronic"),
    (b"denoxtronic", "Bosch Denoxtronic"),
    # DCU identifiers
    (b"DCU", "Dosing Control Unit"),
    (b"DOSING", "Dosing System"),
    (b"Dosing", "Dosing System"),
    # NOx/SCR controller specific
    (b"NOX_CTRL", "NOx Controller"),
    (b"SCR_CTRL", "SCR Controller"),
    (b"AFTERTREATMENT", "Aftertreatment ECU"),
    (b"Aftertreatment", "Aftertreatment ECU"),
]

# DPF Map Detection Patterns
DPF_DETECTION_PATTERNS = {
    "edc17_switch_sequence": {
        # The famous 4081, 15 sequence in EDC17
        # 4081 decimal = 0xFF1 (little endian: F1 0F)
        # 15 decimal = 0x000F (little endian: 0F 00)
        "pattern": b"\xf1\x0f",  # 4081 in LE
        "follow_pattern": b"\x0f\x00",  # 15 in LE
        "confidence": 50,
        "description": "EDC17 DPF switch area (4081+15)"
    },
    "map_boundary_7fff_8000": {
        # 32767, 32768 boundary - common in map areas
        "pattern": b"\xff\x7f\x00\x80",  # 7FFF 8000 in LE
        "min_count": 2,
        "confidence": 35,
        "description": "Map boundary markers (7FFF/8000)"
    },
    "map_boundary_8000_7fff": {
        "pattern": b"\x00\x80\xff\x7f",  # 8000 7FFF in LE
        "min_count": 2,
        "confidence": 35,
        "description": "Map boundary markers (8000/7FFF)"
    },
    "dpf_text_markers": [
        (b"DPF", 45), (b"dpf", 40), (b"DpF", 40),
        (b"FAP", 45), (b"Fap", 40), (b"fap", 35),
        (b"DPF_", 50), (b"_DPF", 50),
        (b"FAP_", 50), (b"_FAP", 50),
        (b"SOOT", 35), (b"soot", 30),
        (b"REGEN", 35), (b"regen", 30),
        (b"Partikel", 40), (b"PARTIKEL", 40),
        (b"DIESEL_PARTICULATE", 50),
        (b"PARTICULATE", 40),
    ],
    "denso_dpf_patterns": [
        (b"\x00\x80\x00\x80\x00\x80", 30),  # Repeated 8000 boundary
        (b"\xff\x7f\xff\x7f\xff\x7f", 30),  # Repeated 7FFF
    ]
}

# EGR Map Detection Patterns
EGR_DETECTION_PATTERNS = {
    "egr_text_markers": [
        (b"EGR", 50), (b"egr", 45), (b"Egr", 45),
        (b"AGR", 50), (b"agr", 45), (b"Agr", 45),
        (b"EGR_", 55), (b"_EGR", 55),
        (b"AGR_", 55), (b"_AGR", 55),
        (b"EGR_VALVE", 60), (b"EGRVALVE", 55),
        (b"EGR_FLOW", 55), (b"EGRFLOW", 50),
        (b"RECIRCULATION", 45),
    ]
}

# SCR/AdBlue Map Detection Patterns
SCR_DETECTION_PATTERNS = {
    "scr_text_markers": [
        (b"ADBLUE", 60), (b"AdBlue", 60), (b"adblue", 55),
        (b"UREA", 55), (b"Urea", 50), (b"urea", 45),
        (b"DENOX", 55), (b"DeNOx", 55), (b"denox", 50),
        (b"SCR_", 55), (b"_SCR", 55),
        (b"NOX_", 50), (b"_NOX", 50), (b"NOx_", 50),
        (b"NOX_SENSOR", 60), (b"NOXSENSOR", 60),
        (b"AFTERTREATMENT", 50), (b"Aftertreatment", 45),
        (b"REDUCTANT", 55), (b"Reductant", 50),
        (b"NH3", 50),
        (b"BLUETEC", 60), (b"BlueTec", 55),
        (b"DENOXTRONIC", 65), (b"Denoxtronic", 60),
    ],
    "scr_dcu_identifiers": [
        (b"DCU", 40),  # Dosing Control Unit
        (b"DOSING_UNIT", 55),
        (b"UREA_TANK", 50),
        (b"DEF_TANK", 50),
    ]
}

# Map Size Characteristics by ECU type (approximate)
ECU_MAP_CHARACTERISTICS = {
    "EDC17": {
        "typical_dpf_map_size": (8, 8),  # 8x8 or similar
        "typical_egr_map_size": (13, 16),
        "value_range": (0, 65535),  # 16-bit
    },
    "EDC16": {
        "typical_dpf_map_size": (8, 8),
        "value_range": (0, 65535),
    },
    "Denso": {
        "typical_dpf_map_size": (10, 12),
        "value_range": (0, 65535),
    },
}
