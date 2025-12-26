"""
ECU Type Mapping System
=======================
Maps vehicle manufacturers, fuel types, and engine characteristics to likely ECU types.
Based on real-world industry knowledge of ECU supplier relationships.

This is a smart mapping system that provides relevant ECU options based on:
1. Vehicle manufacturer → Primary ECU supplier
2. Fuel type → ECU family (diesel vs gasoline)
3. Engine characteristics → Specific ECU variants
"""

from typing import List, Dict, Optional


# =============================================================================
# ECU DATABASE - Comprehensive list of ECU types
# =============================================================================

ECU_DATABASE = {
    # ==========================================================================
    # BOSCH - Primary supplier for European brands (VW, Audi, BMW, Mercedes, etc.)
    # ==========================================================================
    "bosch": {
        "diesel": {
            "modern": [  # 2010+
                {"id": "bosch-edc17c46", "name": "Bosch EDC17C46", "years": "2010-2020"},
                {"id": "bosch-edc17c49", "name": "Bosch EDC17C49", "years": "2010-2018"},
                {"id": "bosch-edc17c50", "name": "Bosch EDC17C50", "years": "2012-2020"},
                {"id": "bosch-edc17c54", "name": "Bosch EDC17C54", "years": "2012-2020"},
                {"id": "bosch-edc17c57", "name": "Bosch EDC17C57", "years": "2014-2022"},
                {"id": "bosch-edc17c60", "name": "Bosch EDC17C60", "years": "2013-2020"},
                {"id": "bosch-edc17c64", "name": "Bosch EDC17C64", "years": "2014-2022"},
                {"id": "bosch-edc17c74", "name": "Bosch EDC17C74", "years": "2016-2022"},
                {"id": "bosch-edc17cp14", "name": "Bosch EDC17CP14", "years": "2008-2016"},
                {"id": "bosch-edc17cp20", "name": "Bosch EDC17CP20", "years": "2010-2018"},
                {"id": "bosch-edc17cp44", "name": "Bosch EDC17CP44", "years": "2012-2020"},
                {"id": "bosch-edc17cp52", "name": "Bosch EDC17CP52", "years": "2014-2022"},
            ],
            "latest": [  # 2018+
                {"id": "bosch-md1cp004", "name": "Bosch MD1CP004", "years": "2018+"},
                {"id": "bosch-md1cs001", "name": "Bosch MD1CS001", "years": "2019+"},
                {"id": "bosch-md1cs006", "name": "Bosch MD1CS006", "years": "2020+"},
                {"id": "bosch-md1ce100", "name": "Bosch MD1CE100", "years": "2020+"},
            ],
            "legacy": [  # Pre-2012
                {"id": "bosch-edc16c34", "name": "Bosch EDC16C34", "years": "2004-2012"},
                {"id": "bosch-edc16c39", "name": "Bosch EDC16C39", "years": "2006-2012"},
                {"id": "bosch-edc16u1", "name": "Bosch EDC16U1", "years": "2005-2010"},
                {"id": "bosch-edc16u31", "name": "Bosch EDC16U31", "years": "2006-2012"},
                {"id": "bosch-edc16cp35", "name": "Bosch EDC16CP35", "years": "2006-2012"},
                {"id": "bosch-edc15c2", "name": "Bosch EDC15C2", "years": "2000-2008"},
            ],
            "truck": [
                {"id": "bosch-edc7uc31", "name": "Bosch EDC7UC31", "years": "2005-2015"},
                {"id": "bosch-edc17cv41", "name": "Bosch EDC17CV41", "years": "2012-2020"},
                {"id": "bosch-edc17cv44", "name": "Bosch EDC17CV44", "years": "2014-2022"},
                {"id": "bosch-edc17cv54", "name": "Bosch EDC17CV54", "years": "2016-2023"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "bosch-med17.1", "name": "Bosch MED17.1", "years": "2010-2018"},
                {"id": "bosch-med17.5", "name": "Bosch MED17.5", "years": "2012-2020"},
                {"id": "bosch-med17.5.2", "name": "Bosch MED17.5.2", "years": "2014-2022"},
                {"id": "bosch-med17.5.21", "name": "Bosch MED17.5.21", "years": "2016-2023"},
                {"id": "bosch-med17.5.25", "name": "Bosch MED17.5.25", "years": "2018-2024"},
                {"id": "bosch-mevd17.2", "name": "Bosch MEVD17.2", "years": "2012-2020"},
                {"id": "bosch-mevd17.2.6", "name": "Bosch MEVD17.2.6", "years": "2014-2022"},
            ],
            "latest": [
                {"id": "bosch-mg1cs001", "name": "Bosch MG1CS001", "years": "2018+"},
                {"id": "bosch-mg1cs002", "name": "Bosch MG1CS002", "years": "2019+"},
                {"id": "bosch-mg1cs011", "name": "Bosch MG1CS011", "years": "2020+"},
            ],
            "legacy": [
                {"id": "bosch-me7.5", "name": "Bosch ME7.5", "years": "2000-2008"},
                {"id": "bosch-me7.8", "name": "Bosch ME7.8", "years": "2002-2010"},
                {"id": "bosch-med9.1", "name": "Bosch MED9.1", "years": "2005-2012"},
                {"id": "bosch-med9.5", "name": "Bosch MED9.5", "years": "2006-2014"},
            ],
        },
    },
    
    # ==========================================================================
    # CONTINENTAL/SIEMENS - VW, PSA, Ford, Volvo
    # ==========================================================================
    "continental": {
        "diesel": {
            "modern": [
                {"id": "continental-sid206", "name": "Continental SID206", "years": "2010-2018"},
                {"id": "continental-sid208", "name": "Continental SID208", "years": "2012-2020"},
                {"id": "continental-sid209", "name": "Continental SID209", "years": "2014-2022"},
                {"id": "continental-sid305", "name": "Continental SID305", "years": "2010-2016"},
                {"id": "continental-sid310", "name": "Continental SID310", "years": "2014-2022"},
                {"id": "continental-sid807", "name": "Continental SID807", "years": "2012-2020"},
                {"id": "continental-pcr2.1", "name": "Continental PCR2.1", "years": "2012-2020"},
            ],
            "legacy": [
                {"id": "continental-sid201", "name": "Continental SID201", "years": "2004-2012"},
                {"id": "continental-sid803", "name": "Continental SID803", "years": "2008-2016"},
                {"id": "continental-sid803a", "name": "Continental SID803A", "years": "2008-2016"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "continental-simos18.1", "name": "Continental Simos 18.1", "years": "2014-2022"},
                {"id": "continental-simos18.2", "name": "Continental Simos 18.2", "years": "2016-2024"},
                {"id": "continental-simos18.10", "name": "Continental Simos 18.10", "years": "2018-2024"},
                {"id": "continental-simos19.3", "name": "Continental Simos 19.3", "years": "2020+"},
            ],
            "legacy": [
                {"id": "continental-simos6.2", "name": "Continental Simos 6.2", "years": "2004-2012"},
                {"id": "continental-simos7.1", "name": "Continental Simos 7.1", "years": "2006-2014"},
                {"id": "continental-simos8.4", "name": "Continental Simos 8.4", "years": "2008-2016"},
            ],
        },
    },
    
    # ==========================================================================
    # DENSO - Toyota, Mazda, Honda, Subaru, Mitsubishi, Suzuki
    # ==========================================================================
    "denso": {
        "diesel": {
            "modern": [
                {"id": "denso-sh7059", "name": "Denso SH7059", "years": "2010-2020"},
                {"id": "denso-rh850", "name": "Denso RH850", "years": "2018+"},
                {"id": "denso-gen4", "name": "Denso Gen4", "years": "2018+"},
            ],
            "legacy": [
                {"id": "denso-sh7058", "name": "Denso SH7058", "years": "2005-2015"},
                {"id": "denso-sh7055", "name": "Denso SH7055", "years": "2002-2012"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "denso-sh7059", "name": "Denso SH7059", "years": "2010-2020"},
                {"id": "denso-sh72531", "name": "Denso SH72531", "years": "2014-2022"},
                {"id": "denso-rh850", "name": "Denso RH850", "years": "2018+"},
                {"id": "denso-gen4", "name": "Denso Gen4", "years": "2018+"},
            ],
            "legacy": [
                {"id": "denso-sh7058", "name": "Denso SH7058", "years": "2004-2014"},
                {"id": "denso-sh7055", "name": "Denso SH7055", "years": "2000-2010"},
            ],
        },
    },
    
    # ==========================================================================
    # HITACHI - Nissan, Infiniti, older Honda
    # ==========================================================================
    "hitachi": {
        "diesel": {
            "modern": [
                {"id": "hitachi-gen3", "name": "Hitachi Gen3", "years": "2012-2022"},
            ],
            "legacy": [
                {"id": "hitachi-gen2", "name": "Hitachi Gen2", "years": "2006-2014"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "hitachi-gen3", "name": "Hitachi Gen3", "years": "2012-2022"},
            ],
            "legacy": [
                {"id": "hitachi-gen2", "name": "Hitachi Gen2", "years": "2004-2014"},
                {"id": "hitachi-mecm", "name": "Hitachi MECM", "years": "2002-2012"},
            ],
        },
    },
    
    # ==========================================================================
    # KEIHIN - Honda, some Mazda
    # ==========================================================================
    "keihin": {
        "petrol": {
            "modern": [
                {"id": "keihin-sh7059", "name": "Keihin SH7059", "years": "2012-2022"},
                {"id": "keihin-sh72543", "name": "Keihin SH72543", "years": "2016-2024"},
            ],
            "legacy": [
                {"id": "keihin-sh7058", "name": "Keihin SH7058", "years": "2004-2014"},
            ],
        },
    },
    
    # ==========================================================================
    # DELPHI - GM, Ford, Chrysler, Renault, Korean
    # ==========================================================================
    "delphi": {
        "diesel": {
            "modern": [
                {"id": "delphi-dcm3.5", "name": "Delphi DCM3.5", "years": "2010-2020"},
                {"id": "delphi-dcm6.2", "name": "Delphi DCM6.2", "years": "2014-2024"},
                {"id": "delphi-dcm7.1", "name": "Delphi DCM7.1", "years": "2018+"},
            ],
            "legacy": [
                {"id": "delphi-dcm2", "name": "Delphi DCM2", "years": "2004-2012"},
                {"id": "delphi-ddcr", "name": "Delphi DDCR", "years": "2006-2014"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "delphi-mt80", "name": "Delphi MT80", "years": "2010-2020"},
                {"id": "delphi-mt86", "name": "Delphi MT86", "years": "2016-2024"},
            ],
            "legacy": [
                {"id": "delphi-mt35", "name": "Delphi MT35", "years": "2002-2012"},
            ],
        },
    },
    
    # ==========================================================================
    # MARELLI - Fiat, Alfa Romeo, Ferrari, some PSA
    # ==========================================================================
    "marelli": {
        "diesel": {
            "modern": [
                {"id": "marelli-mjd8", "name": "Marelli MJD8", "years": "2010-2020"},
                {"id": "marelli-mjd9", "name": "Marelli MJD9", "years": "2014-2024"},
            ],
            "legacy": [
                {"id": "marelli-mjd6", "name": "Marelli MJD6", "years": "2006-2014"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "marelli-8gmf", "name": "Marelli 8GMF", "years": "2010-2020"},
                {"id": "marelli-9gf", "name": "Marelli 9GF", "years": "2016-2024"},
            ],
            "legacy": [
                {"id": "marelli-iaw5sf", "name": "Marelli IAW5SF", "years": "2004-2014"},
                {"id": "marelli-iaw5am", "name": "Marelli IAW5AM", "years": "2006-2014"},
            ],
        },
    },
    
    # ==========================================================================
    # KEFICO - Hyundai, Kia
    # ==========================================================================
    "kefico": {
        "diesel": {
            "modern": [
                {"id": "kefico-edc17c57", "name": "Kefico EDC17C57 (Bosch)", "years": "2014-2024"},
            ],
            "legacy": [
                {"id": "kefico-edc17c08", "name": "Kefico EDC17C08 (Bosch)", "years": "2010-2018"},
            ],
        },
        "petrol": {
            "modern": [
                {"id": "kefico-med17.9.8", "name": "Kefico MED17.9.8 (Bosch)", "years": "2014-2024"},
                {"id": "kefico-cpegd2", "name": "Kefico CPEGD2", "years": "2018+"},
            ],
            "legacy": [
                {"id": "kefico-med17.9", "name": "Kefico MED17.9 (Bosch)", "years": "2010-2018"},
                {"id": "kefico-simk43", "name": "Kefico SIMK43", "years": "2008-2016"},
            ],
        },
    },
    
    # ==========================================================================
    # CUMMINS - Commercial trucks, buses
    # ==========================================================================
    "cummins": {
        "diesel": {
            "modern": [
                {"id": "cummins-cm2350", "name": "Cummins CM2350", "years": "2014+"},
                {"id": "cummins-cm2450", "name": "Cummins CM2450", "years": "2018+"},
            ],
            "legacy": [
                {"id": "cummins-cm870", "name": "Cummins CM870", "years": "2005-2010"},
                {"id": "cummins-cm2150", "name": "Cummins CM2150", "years": "2008-2016"},
                {"id": "cummins-cm2250", "name": "Cummins CM2250", "years": "2010-2018"},
                {"id": "cummins-celect", "name": "Cummins CELECT", "years": "1990-2008"},
            ],
        },
    },
    
    # ==========================================================================
    # CHINESE TRUCK ECUs
    # ==========================================================================
    "chinese_truck": {
        "diesel": {
            "modern": [
                {"id": "weichai-bosch-edc17cv44", "name": "Weichai Bosch EDC17CV44", "years": "2014+"},
                {"id": "weichai-bosch-edc17cv54", "name": "Weichai Bosch EDC17CV54", "years": "2018+"},
                {"id": "weichai-ecm", "name": "Weichai ECM", "years": "2010+"},
                {"id": "yuchai-bosch-edc17", "name": "Yuchai Bosch EDC17", "years": "2012+"},
                {"id": "faw-bosch-edc17", "name": "FAW Bosch EDC17", "years": "2012+"},
                {"id": "sinotruk-bosch-edc17", "name": "Sinotruk Bosch EDC17", "years": "2012+"},
                {"id": "dongfeng-bosch-edc17", "name": "Dongfeng Bosch EDC17", "years": "2012+"},
                {"id": "foton-bosch-edc17", "name": "Foton Bosch EDC17", "years": "2012+"},
            ],
        },
    },
}


# =============================================================================
# MANUFACTURER TO ECU SUPPLIER MAPPING
# =============================================================================

MANUFACTURER_ECU_MAP = {
    # German - Primary: Bosch, Secondary: Continental
    "volkswagen": ["bosch", "continental"],
    "vw": ["bosch", "continental"],
    "audi": ["bosch", "continental"],
    "bmw": ["bosch", "continental"],
    "mercedes": ["bosch", "continental"],
    "mercedes-benz": ["bosch", "continental"],
    "porsche": ["bosch", "continental"],
    "mini": ["bosch", "continental"],
    "smart": ["bosch", "continental"],
    "opel": ["bosch", "continental", "delphi"],
    "vauxhall": ["bosch", "continental", "delphi"],
    
    # French - Primary: Continental, Secondary: Bosch, Delphi
    "peugeot": ["continental", "bosch", "delphi"],
    "citroen": ["continental", "bosch", "delphi"],
    "renault": ["continental", "bosch", "delphi"],
    "dacia": ["continental", "bosch", "delphi"],
    "alpine": ["continental", "bosch"],
    
    # Italian - Primary: Marelli, Secondary: Bosch
    "fiat": ["marelli", "bosch"],
    "alfa romeo": ["marelli", "bosch"],
    "alfa": ["marelli", "bosch"],
    "lancia": ["marelli", "bosch"],
    "ferrari": ["marelli", "bosch"],
    "maserati": ["marelli", "bosch"],
    "lamborghini": ["bosch", "marelli"],
    
    # Swedish - Mixed
    "volvo": ["bosch", "continental", "denso"],
    "saab": ["bosch", "delphi"],
    
    # British
    "jaguar": ["bosch", "continental", "denso"],
    "land rover": ["bosch", "continental", "denso"],
    "range rover": ["bosch", "continental", "denso"],
    "bentley": ["bosch", "continental"],
    "rolls-royce": ["bosch", "continental"],
    "aston martin": ["bosch"],
    "lotus": ["bosch"],
    "mclaren": ["bosch"],
    
    # Japanese - Primary: Denso, Hitachi, Keihin
    "toyota": ["denso"],
    "lexus": ["denso"],
    "mazda": ["denso"],
    "honda": ["keihin", "denso"],
    "acura": ["keihin", "denso"],
    "nissan": ["hitachi", "denso"],
    "infiniti": ["hitachi", "denso"],
    "mitsubishi": ["denso"],
    "subaru": ["denso", "hitachi"],
    "suzuki": ["denso"],
    "isuzu": ["denso"],
    "daihatsu": ["denso"],
    
    # Korean - Primary: Kefico (often Bosch-based)
    "hyundai": ["kefico", "bosch"],
    "kia": ["kefico", "bosch"],
    "genesis": ["kefico", "bosch"],
    "ssangyong": ["bosch", "delphi"],
    
    # American - Mixed
    "ford": ["bosch", "continental", "delphi"],
    "chevrolet": ["delphi", "bosch"],
    "gmc": ["delphi", "bosch"],
    "cadillac": ["delphi", "bosch"],
    "dodge": ["bosch", "continental"],
    "chrysler": ["bosch", "continental"],
    "jeep": ["bosch", "continental"],
    "ram": ["bosch", "cummins"],
    "buick": ["delphi", "bosch"],
    "lincoln": ["bosch", "continental"],
    "tesla": [],  # Proprietary
    
    # Chinese - Often Bosch-based or proprietary
    "geely": ["bosch", "continental"],
    "byd": ["bosch"],
    "chery": ["bosch"],
    "great wall": ["bosch"],
    "haval": ["bosch"],
    "mg": ["bosch", "continental"],
    "nio": [],  # Proprietary
    
    # Chinese Trucks
    "faw": ["chinese_truck", "bosch", "cummins"],
    "dongfeng": ["chinese_truck", "bosch", "cummins"],
    "sinotruk": ["chinese_truck", "bosch"],
    "howo": ["chinese_truck", "bosch"],
    "foton": ["chinese_truck", "bosch", "cummins"],
    "weichai": ["chinese_truck", "bosch"],
    "yuchai": ["chinese_truck", "bosch"],
    "shacman": ["chinese_truck", "bosch"],
    
    # Indian
    "tata": ["bosch"],
    "mahindra": ["bosch"],
    "maruti": ["denso", "bosch"],
    "maruti suzuki": ["denso", "bosch"],
    
    # European Trucks
    "man": ["bosch"],
    "scania": ["bosch"],
    "volvo trucks": ["bosch"],
    "daf": ["bosch"],
    "iveco": ["bosch", "marelli"],
    "mercedes trucks": ["bosch"],
    "renault trucks": ["bosch"],
}


def normalize_manufacturer(name: str) -> str:
    """Normalize manufacturer name for lookup"""
    if not name:
        return ""
    
    # Lowercase and clean
    name = name.lower().strip()
    
    # Handle common variations
    variations = {
        "mercedes benz": "mercedes-benz",
        "mercedes": "mercedes-benz",
        "alfa-romeo": "alfa romeo",
        "alfaromeo": "alfa romeo",
        "land-rover": "land rover",
        "landrover": "land rover",
        "rolls royce": "rolls-royce",
        "rollsroyce": "rolls-royce",
        "aston-martin": "aston martin",
        "astonmartin": "aston martin",
        "maruti-suzuki": "maruti suzuki",
    }
    
    return variations.get(name, name)


def normalize_fuel_type(fuel: str) -> str:
    """Normalize fuel type"""
    if not fuel:
        return "petrol"
    
    fuel = fuel.lower().strip()
    
    diesel_keywords = ["diesel", "tdi", "cdi", "hdi", "dci", "cdti", "crdi", "tdci", "d", "sd"]
    
    for keyword in diesel_keywords:
        if keyword in fuel:
            return "diesel"
    
    return "petrol"


def get_ecu_types_for_vehicle(
    manufacturer_name: str,
    fuel_type: str = "petrol",
    engine_name: str = "",
    year: Optional[int] = None,
    is_truck: bool = False
) -> List[Dict]:
    """
    Get relevant ECU types for a given vehicle configuration.
    
    Args:
        manufacturer_name: Vehicle manufacturer name
        fuel_type: "diesel" or "petrol"
        engine_name: Engine name (used for hints)
        year: Vehicle year (if known)
        is_truck: Whether this is a commercial truck
    
    Returns:
        List of ECU type dictionaries with id, name, and priority
    """
    
    manufacturer = normalize_manufacturer(manufacturer_name)
    fuel = normalize_fuel_type(fuel_type)
    
    result = []
    seen_ids = set()
    
    # Get ECU suppliers for this manufacturer
    suppliers = MANUFACTURER_ECU_MAP.get(manufacturer, ["bosch", "continental", "delphi"])
    
    # Handle trucks specially
    if is_truck or any(x in manufacturer for x in ["truck", "faw", "dongfeng", "sinotruk", "howo", "foton", "weichai", "yuchai", "shacman"]):
        suppliers = ["chinese_truck", "cummins", "bosch"] + suppliers
    
    # Determine era based on year
    era = "modern"
    if year:
        if year >= 2018:
            era = "latest"
        elif year >= 2010:
            era = "modern"
        else:
            era = "legacy"
    
    # Add ECUs from each supplier
    priority = 1
    for supplier in suppliers:
        if supplier not in ECU_DATABASE:
            continue
        
        supplier_ecus = ECU_DATABASE[supplier]
        
        # Check if fuel type exists for this supplier
        if fuel not in supplier_ecus and "diesel" in supplier_ecus:
            fuel_to_use = "diesel" if is_truck else fuel
        elif fuel not in supplier_ecus:
            continue
        else:
            fuel_to_use = fuel
        
        fuel_ecus = supplier_ecus.get(fuel_to_use, {})
        
        # Add ECUs in order: era-specific first, then others
        eras_to_check = [era]
        if era == "latest":
            eras_to_check.extend(["modern", "legacy"])
        elif era == "modern":
            eras_to_check.extend(["latest", "legacy"])
        else:
            eras_to_check.extend(["modern", "latest"])
        
        # Add truck-specific ECUs if applicable
        if is_truck or "truck" in manufacturer:
            eras_to_check = ["truck"] + eras_to_check
        
        for check_era in eras_to_check:
            for ecu in fuel_ecus.get(check_era, []):
                if ecu["id"] not in seen_ids:
                    seen_ids.add(ecu["id"])
                    result.append({
                        "id": ecu["id"],
                        "name": ecu["name"],
                        "years": ecu.get("years", ""),
                        "priority": priority,
                        "supplier": supplier.replace("_", " ").title()
                    })
            priority += 1
    
    # Always add "Other" option at the end
    result.append({
        "id": "other",
        "name": "Other (Enter manually)",
        "years": "",
        "priority": 999,
        "supplier": "Other"
    })
    
    # Sort by priority
    result.sort(key=lambda x: x["priority"])
    
    return result


def get_all_ecu_types() -> List[Dict]:
    """Get all ECU types (for fallback/manual entry)"""
    result = []
    seen_ids = set()
    
    for supplier, fuel_types in ECU_DATABASE.items():
        for fuel_type, eras in fuel_types.items():
            for era, ecus in eras.items():
                for ecu in ecus:
                    if ecu["id"] not in seen_ids:
                        seen_ids.add(ecu["id"])
                        result.append({
                            "id": ecu["id"],
                            "name": ecu["name"],
                            "years": ecu.get("years", ""),
                            "supplier": supplier.replace("_", " ").title(),
                            "fuel_type": fuel_type,
                            "era": era
                        })
    
    # Sort alphabetically
    result.sort(key=lambda x: x["name"])
    
    # Add "Other" at the end
    result.append({
        "id": "other",
        "name": "Other (Enter manually)",
        "years": "",
        "supplier": "Other",
        "fuel_type": "all",
        "era": "all"
    })
    
    return result
