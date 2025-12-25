"""
ECU Database - Maps vehicles/engines to their ECU types

This module provides ECU information based on:
- Manufacturer
- Fuel type (Diesel/Petrol/Hybrid)
- Engine size/power
- Model year (when available)
"""

# Comprehensive ECU mapping by manufacturer
ECU_MAPPING = {
    # =====================================================================
    # EUROPEAN MANUFACTURERS
    # =====================================================================
    
    "Audi": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "small": "Bosch EDC17C46",      # 1.6 TDI, 2.0 TDI
                "medium": "Bosch EDC17CP44",    # 2.0 TDI, 3.0 TDI
                "large": "Bosch EDC17CP14",     # 3.0 TDI V6, 4.2 TDI V8
                "modern": "Bosch MD1",          # 2019+
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "small": "Bosch MED17.5.2",     # 1.4 TFSI, 1.8 TFSI
                "medium": "Bosch MED17.1",      # 2.0 TFSI
                "large": "Bosch MED17.1.1",     # 3.0 TFSI, 4.0 TFSI
                "performance": "Bosch MED17.1.62",  # RS models
                "modern": "Bosch MG1",          # 2019+
                "simos": "Siemens SIMOS18",     # Some 2.0 TFSI
            }
        }
    },
    
    "Volkswagen": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "small": "Bosch EDC17C46",      # 1.6 TDI
                "medium": "Bosch EDC17C64",     # 2.0 TDI CR
                "old": "Bosch EDC16",           # Pre-2008
                "modern": "Bosch MD1",          # 2019+
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "small": "Siemens SIMOS10",     # 1.2 TSI, 1.4 TSI
                "medium": "Siemens SIMOS18",    # 2.0 TSI Gen3
                "old": "Bosch ME7.5",           # Pre-2008
                "modern": "Bosch MG1",          # 2019+
            }
        }
    },
    
    "BMW": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "small": "Bosch EDC17C50",      # N47 2.0d
                "medium": "Bosch EDC17C56",     # N57 3.0d
                "large": "Bosch EDC17CP45",     # N57 3.0d Quad Turbo
                "modern": "Bosch MD1",          # B47, B57 2019+
            }
        },
        "Petrol": {
            "default": "Bosch MSD80/81",
            "variants": {
                "small": "Bosch MSD81",         # N43, N13
                "medium": "Bosch MEVD17.2",     # N55
                "large": "Bosch MSD85",         # N63 V8
                "modern": "Bosch MG1",          # B48, B58 2019+
                "m_series": "Bosch MEVD17.2.G", # M3, M4
            }
        }
    },
    
    "Mercedes-Benz": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "small": "Bosch EDC17C66",      # OM651
                "medium": "Bosch EDC17CP57",    # OM642 V6
                "modern": "Bosch MD1",          # OM654, OM656
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "small": "Bosch MED17.7.2",     # M270, M274
                "medium": "Bosch MED17.7.3",    # M276 V6
                "large": "Bosch MED17.7.5",     # M278 V8
                "amg": "Bosch MED17.7.8",       # M157 AMG
                "modern": "Bosch MG1",          # M256, M264
            }
        }
    },
    
    "Porsche": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "cayenne": "Bosch EDC17CP44",   # Cayenne Diesel
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "911": "Bosch MED17.1.11",      # 991 911
                "turbo": "Bosch MED17.1.27",    # 911 Turbo
                "cayenne": "Bosch MED17.1.6",   # Cayenne
                "modern": "Bosch MG1",          # 992 911
            }
        }
    },
    
    "Volvo": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "d5": "Bosch EDC17CP22",        # D5 5-cyl
                "d4": "Bosch EDC17C10",         # D4 4-cyl
                "modern": "Denso",              # VEA engines
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "t5": "Bosch MED17.0",          # T5 5-cyl
                "t6": "Bosch MED17.0",          # T6 6-cyl
                "modern": "Denso",              # VEA engines
            }
        }
    },
    
    "Jaguar": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "ingenium": "Bosch EDC17C70",   # Ingenium diesel
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "v6": "Bosch MED17.8.31",       # 3.0 V6 SC
                "v8": "Bosch MED17.8.32",       # 5.0 V8 SC
                "ingenium": "Bosch MED17.9.8",  # Ingenium petrol
            }
        }
    },
    
    "Land Rover": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "tdv6": "Bosch EDC17CP42",      # TDV6
                "tdv8": "Bosch EDC17CP11",      # TDV8
                "ingenium": "Bosch EDC17C70",   # Ingenium
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "v6": "Bosch MED17.8.31",       # 3.0 V6 SC
                "v8": "Bosch MED17.8.32",       # 5.0 V8 SC
            }
        }
    },
    
    "Peugeot": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "hdi": "Bosch EDC17C10",        # 1.6 HDI, 2.0 HDI
                "bluehdi": "Bosch EDC17C60",    # BlueHDI
                "delphi": "Delphi DCM3.5",      # Some 1.6 HDI
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "thp": "Bosch MED17.4.4",       # 1.6 THP
                "puretech": "Bosch MED17.4.2",  # PureTech
            }
        }
    },
    
    "Citroën": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "hdi": "Bosch EDC17C10",
                "bluehdi": "Bosch EDC17C60",
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "thp": "Bosch MED17.4.4",
                "puretech": "Bosch MED17.4.2",
            }
        }
    },
    
    "Renault": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "dci": "Bosch EDC17C42",        # 1.5 dCi, 1.6 dCi
                "large": "Bosch EDC17C11",      # 2.0 dCi, 3.0 dCi
                "siemens": "Siemens SID305",    # Some 1.5 dCi
            }
        },
        "Petrol": {
            "default": "Siemens EMS3",
            "variants": {
                "tce": "Siemens EMS3150",       # 0.9 TCe, 1.2 TCe
                "large": "Siemens EMS3155",     # 1.6 TCe
            }
        }
    },
    
    "Fiat": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "multijet": "Bosch EDC17C49",   # 1.3 MJ, 1.6 MJ
                "large": "Bosch EDC17C69",      # 2.0 MJ
                "marelli": "Marelli MJD8F3",    # Some 1.3 MJ
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "fire": "Bosch ME7.9.10",       # Fire engines
                "multiair": "Marelli 8GMF",     # MultiAir
            }
        }
    },
    
    "Alfa Romeo": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "jtdm": "Bosch EDC17C49",       # 1.6 JTDM, 2.0 JTDM
                "large": "Bosch EDC17C69",      # 2.2 JTDM
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "multiair": "Bosch MED17.3.5",  # MultiAir
                "qv": "Bosch MED17.3.4",        # QV/Veloce
            }
        }
    },
    
    "Opel": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "cdti": "Bosch EDC17C59",       # 1.6 CDTI, 2.0 CDTI
                "old": "Bosch EDC16C9",         # Pre-2010
                "delphi": "Delphi DCM3.5",      # Some CDTI
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "ecotec": "Delco E83",          # EcoTec
                "turbo": "Bosch MED17.6.9",     # Turbo EcoTec
            }
        }
    },
    
    "Ford": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "tdci": "Bosch EDC17C10",       # 1.6 TDCi, 2.0 TDCi
                "large": "Delphi DCM3.5",       # 2.2 TDCi
                "ecoblue": "Bosch EDC17C70",    # EcoBlue
            }
        },
        "Petrol": {
            "default": "Bosch MED17",
            "variants": {
                "ecoboost": "Bosch MED17.2",    # 1.0 EcoBoost
                "large": "Bosch MED17.0.7",     # 1.6 EcoBoost, 2.0 EcoBoost
                "mustang": "Bosch MED17.2.2",   # Mustang
            }
        }
    },
    
    # =====================================================================
    # JAPANESE MANUFACTURERS
    # =====================================================================
    
    "Toyota": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "d4d": "Denso 89661",           # D-4D engines
                "modern": "Denso 89663",        # Modern D-4D
            }
        },
        "Petrol": {
            "default": "Denso",
            "variants": {
                "vvti": "Denso 89661",          # VVT-i engines
                "d4s": "Denso 89663",           # D-4S direct injection
            }
        },
        "Hybrid": {
            "default": "Denso Hybrid ECU",
            "variants": {
                "ths": "Denso THS",             # Toyota Hybrid System
            }
        }
    },
    
    "Lexus": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "d4d": "Denso 89661",
            }
        },
        "Petrol": {
            "default": "Denso",
            "variants": {
                "vvti": "Denso 89661",
                "d4s": "Denso 89663",
            }
        },
        "Hybrid": {
            "default": "Denso Hybrid ECU",
        }
    },
    
    "Honda": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "ictdi": "Bosch EDC17C58",      # i-CTDi
            }
        },
        "Petrol": {
            "default": "Keihin",
            "variants": {
                "vtec": "Keihin 37820",         # VTEC
                "earth_dreams": "Keihin 37805", # Earth Dreams
                "type_r": "Keihin 37820-5AN",   # Type R
            }
        }
    },
    
    "Nissan": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "dci": "Bosch EDC17C42",        # dCi (Renault-based)
            }
        },
        "Petrol": {
            "default": "Hitachi",
            "variants": {
                "vq": "Hitachi MEC",            # VQ engines
                "mr": "Hitachi MEC32",          # MR engines
                "hr": "Hitachi MEC121",         # HR engines
            }
        }
    },
    
    "Mazda": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "skyactiv_d": "Denso SH01",     # SKYACTIV-D
            }
        },
        "Petrol": {
            "default": "Denso",
            "variants": {
                "skyactiv_g": "Denso PE01",     # SKYACTIV-G
                "mzr": "Denso L8/LF",           # MZR
            }
        }
    },
    
    "Subaru": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "boxer_d": "Denso 22611",       # Boxer Diesel
            }
        },
        "Petrol": {
            "default": "Denso",
            "variants": {
                "fa": "Denso 22765",            # FA engines
                "fb": "Denso 22611",            # FB engines
                "ej": "Denso 22611",            # EJ engines
            }
        }
    },
    
    "Mitsubishi": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "did": "Denso",                 # DI-D
            }
        },
        "Petrol": {
            "default": "Mitsubishi Electric",
            "variants": {
                "mivec": "Mitsubishi E6T",      # MIVEC
            }
        }
    },
    
    "Suzuki": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "ddis": "Bosch EDC17C69",       # DDiS
            }
        },
        "Petrol": {
            "default": "Denso",
            "variants": {
                "boosterjet": "Bosch MED17.9",  # BoosterJet
            }
        }
    },
    
    "Isuzu": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "dmax": "Denso",                # D-MAX
                "truck": "Bosch EDC17",         # Trucks
            }
        },
        "Petrol": {
            "default": "Denso",
        }
    },
    
    # =====================================================================
    # KOREAN MANUFACTURERS
    # =====================================================================
    
    "Hyundai": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "crdi": "Bosch EDC17C08",       # CRDi
                "modern": "Bosch EDC17C57",     # Modern CRDi
            }
        },
        "Petrol": {
            "default": "Kefico",
            "variants": {
                "gdi": "Kefico CPGDSH2",        # GDI
                "mpi": "Kefico 39100",          # MPI
            }
        }
    },
    
    "Kia": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "crdi": "Bosch EDC17C08",
                "modern": "Bosch EDC17C57",
            }
        },
        "Petrol": {
            "default": "Kefico",
            "variants": {
                "gdi": "Kefico CPGDSH2",
                "mpi": "Kefico 39100",
            }
        }
    },
    
    # =====================================================================
    # AMERICAN MANUFACTURERS
    # =====================================================================
    
    "Chevrolet": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "duramax": "Bosch EDC17CP18",   # Duramax
            }
        },
        "Petrol": {
            "default": "Delco E",
            "variants": {
                "small_block": "Delco E38",     # Small Block V8
                "ecotec": "Delco E83",          # Ecotec
            }
        }
    },
    
    "Dodge": {
        "Diesel": {
            "default": "Cummins CM",
            "variants": {
                "cummins": "Cummins CM2350",    # Cummins diesel
            }
        },
        "Petrol": {
            "default": "NGC",
            "variants": {
                "hemi": "NGC GPEC2",            # HEMI
            }
        }
    },
    
    "Jeep": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "multijet": "Bosch EDC17C49",   # MultiJet (FCA)
                "ecodiesel": "Bosch EDC17C79",  # EcoDiesel VM Motori
            }
        },
        "Petrol": {
            "default": "NGC",
            "variants": {
                "pentastar": "NGC GPEC2",       # Pentastar V6
                "hemi": "NGC GPEC2A",           # HEMI
            }
        }
    },
    
    # =====================================================================
    # TRUCKS AND COMMERCIAL
    # =====================================================================
    
    "Mitsubishi Fuso": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "canter": "Denso",              # Canter
                "fighter": "Denso",             # Fighter
            }
        }
    },
    
    "Hino": {
        "Diesel": {
            "default": "Denso",
            "variants": {
                "truck": "Denso",               # All trucks
            }
        }
    },
    
    "Isuzu Trucks": {
        "Diesel": {
            "default": "Denso/Transtron",
            "variants": {
                "npr": "Transtron",             # N-Series
                "ftr": "Denso",                 # F-Series
            }
        }
    },
    
    "DAF": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "paccar": "Bosch EDC17CV44",    # PACCAR MX engines
            }
        }
    },
    
    "MAN": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "d08": "Bosch EDC17C53",        # D08 engines
                "d20": "Bosch EDC17CV41",       # D20 engines
                "d26": "Bosch EDC17CV41",       # D26 engines
            }
        }
    },
    
    "Scania": {
        "Diesel": {
            "default": "Scania EMS",
            "variants": {
                "dc09": "Scania EMS S8",        # DC09
                "dc13": "Scania EMS S8",        # DC13
                "dc16": "Scania EMS S8",        # DC16
            }
        }
    },
    
    "Volvo Trucks": {
        "Diesel": {
            "default": "Volvo EMS",
            "variants": {
                "d11": "Volvo EMS2",            # D11
                "d13": "Volvo EMS2",            # D13
                "d16": "Volvo EMS2",            # D16
            }
        }
    },
    
    "Iveco Trucks": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "cursor": "Bosch EDC17CV41",    # Cursor engines
                "f1c": "Bosch EDC17C49",        # F1C Daily
            }
        }
    },
    
    "Cummins": {
        "Diesel": {
            "default": "Cummins CM",
            "variants": {
                "isx": "Cummins CM2350",        # ISX
                "isb": "Cummins CM2150",        # ISB
                "isl": "Cummins CM2150",        # ISL
                "qsb": "Cummins CM850",         # QSB
            }
        }
    },
    
    "Caterpillar": {
        "Diesel": {
            "default": "Caterpillar ADEM",
            "variants": {
                "c7": "CAT ADEM A4",            # C7
                "c9": "CAT ADEM A4",            # C9
                "c13": "CAT ADEM A4",           # C13
                "c15": "CAT ADEM A4",           # C15
            }
        }
    },
    
    # =====================================================================
    # AGRICULTURAL / CONSTRUCTION
    # =====================================================================
    
    "John Deere": {
        "Diesel": {
            "default": "John Deere PowerTech",
            "variants": {
                "powertech": "Bosch EDC17CV52", # PowerTech
            }
        }
    },
    
    "Case": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "fpt": "Bosch EDC17C49",        # FPT engines
            }
        }
    },
    
    "New Holland": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "fpt": "Bosch EDC17C49",        # FPT engines
            }
        }
    },
    
    "Fendt": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "agco": "Bosch EDC17CV52",      # AGCO Power
            }
        }
    },
    
    "Claas": {
        "Diesel": {
            "default": "Bosch EDC17",
            "variants": {
                "mercedes": "Bosch EDC17C66",   # Mercedes OM engines
            }
        }
    },
}

# Default ECU fallbacks by fuel type
DEFAULT_ECU = {
    "Diesel": "Bosch EDC17",
    "Petrol": "Bosch MED17",
    "Hybrid": "Manufacturer-specific Hybrid ECU",
    None: "Unknown ECU"
}


def get_ecu_for_vehicle(manufacturer, fuel_type, engine_power=None, engine_name=None):
    """
    Get the most likely ECU type for a vehicle
    
    Args:
        manufacturer: Vehicle manufacturer name
        fuel_type: 'Diesel', 'Petrol', or 'Hybrid'
        engine_power: Engine power in HP (optional)
        engine_name: Engine name/code (optional)
    
    Returns:
        dict with 'ecu_type', 'ecu_family', and 'confidence'
    """
    
    # Normalize inputs
    manufacturer = manufacturer.strip() if manufacturer else ""
    fuel_type = fuel_type if fuel_type in ["Diesel", "Petrol", "Hybrid"] else None
    
    # Try to find manufacturer in database
    mfr_data = None
    for mfr_name, mfr_ecus in ECU_MAPPING.items():
        if mfr_name.lower() in manufacturer.lower() or manufacturer.lower() in mfr_name.lower():
            mfr_data = mfr_ecus
            break
    
    if not mfr_data:
        # Use default based on fuel type
        return {
            "ecu_type": DEFAULT_ECU.get(fuel_type, "Unknown ECU"),
            "ecu_family": "Generic",
            "confidence": "low"
        }
    
    # Get fuel-specific data
    fuel_data = mfr_data.get(fuel_type, mfr_data.get("Diesel", mfr_data.get("Petrol", {})))
    
    if not fuel_data:
        return {
            "ecu_type": DEFAULT_ECU.get(fuel_type, "Unknown ECU"),
            "ecu_family": "Generic",
            "confidence": "low"
        }
    
    default_ecu = fuel_data.get("default", DEFAULT_ECU.get(fuel_type))
    variants = fuel_data.get("variants", {})
    
    # Try to match specific variant based on engine characteristics
    selected_variant = None
    
    if engine_power:
        if engine_power < 120:
            selected_variant = variants.get("small")
        elif engine_power < 250:
            selected_variant = variants.get("medium")
        else:
            selected_variant = variants.get("large") or variants.get("performance")
    
    if engine_name:
        engine_lower = engine_name.lower()
        # Check for specific engine type keywords
        if "skyactiv" in engine_lower:
            selected_variant = variants.get("skyactiv_g") or variants.get("skyactiv_d")
        elif "ecoboost" in engine_lower:
            selected_variant = variants.get("ecoboost")
        elif "tdi" in engine_lower or "crdi" in engine_lower or "dci" in engine_lower:
            selected_variant = variants.get("medium") or variants.get("small")
        elif "tfsi" in engine_lower or "tsi" in engine_lower:
            selected_variant = variants.get("medium") or variants.get("small")
        elif "gdi" in engine_lower:
            selected_variant = variants.get("gdi")
        elif "hybrid" in engine_lower:
            selected_variant = variants.get("hybrid") or fuel_data.get("default")
    
    ecu_type = selected_variant or default_ecu
    
    return {
        "ecu_type": ecu_type,
        "ecu_family": default_ecu.split()[0] if default_ecu else "Unknown",  # e.g., "Bosch" from "Bosch EDC17"
        "confidence": "high" if selected_variant else "medium"
    }


def get_ecu_info_for_engine(engine_data, manufacturer_name=None):
    """
    Get ECU information for an engine record
    
    Args:
        engine_data: dict with engine info (name, fuel, etc.)
        manufacturer_name: Optional manufacturer name
    
    Returns:
        dict with ECU information
    """
    
    fuel_type = engine_data.get("fuel")
    engine_name = engine_data.get("name", "")
    
    # Try to extract power from engine name
    engine_power = None
    import re
    power_match = re.search(r'(\d+)\s*hp', engine_name.lower())
    if power_match:
        engine_power = int(power_match.group(1))
    
    return get_ecu_for_vehicle(
        manufacturer=manufacturer_name or "",
        fuel_type=fuel_type,
        engine_power=engine_power,
        engine_name=engine_name
    )


# Export all mappings
__all__ = ['ECU_MAPPING', 'DEFAULT_ECU', 'get_ecu_for_vehicle', 'get_ecu_info_for_engine']
