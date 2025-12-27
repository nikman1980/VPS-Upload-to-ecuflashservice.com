"""
ECU Processing Engine - ECU Definition Database
================================================
Database of ECU definitions, maps, and modification rules.

This is the core knowledge base that makes processing possible.
Each ECU type needs:
1. Identification patterns (how to recognize this ECU)
2. Map definitions (where DPF, EGR, etc. maps are located)
3. Checksum algorithms (how to recalculate checksums)
4. Modification rules (what to change for DPF off, EGR off, etc.)
"""

from typing import Dict, List, Optional
from .models import (
    ECUDefinition,
    ECUManufacturer,
    MapDefinition,
    MapType,
    ModificationRule,
    ModificationType,
    ChecksumAlgorithm,
    ChecksumType,
)


class ECUDefinitionDB:
    """
    Database of ECU definitions.
    
    This class manages all known ECU types and their processing rules.
    New ECU support is added by creating definitions here.
    """
    
    def __init__(self):
        self._definitions: Dict[str, ECUDefinition] = {}
        self._load_builtin_definitions()
    
    def _load_builtin_definitions(self):
        """Load built-in ECU definitions"""
        # Bosch EDC17 Family
        self._load_bosch_edc17_definitions()
        
        # Bosch EDC16 Family
        self._load_bosch_edc16_definitions()
        
        # Delphi DCM Family
        self._load_delphi_dcm_definitions()
        
        # Denso (detection only for now)
        self._load_denso_definitions()
    
    def _load_bosch_edc17_definitions(self):
        """Load Bosch EDC17 family definitions"""
        
        # =================================================================
        # BOSCH EDC17 COMMON PATTERNS
        # =================================================================
        # EDC17 uses characteristic patterns for DPF switch area:
        # - Value 4081 (0x0FF1) followed by 15 (0x000F) indicates DPF switch
        # - Map boundaries often marked by 0x7FFF/0x8000 sequences
        # - DTC tables have P0xxx codes in ASCII near hex representations
        
        # Common DPF maps for EDC17
        edc17_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_SWITCH,
                name="DPF Switch",
                description="Main DPF on/off switch - set to 0 to disable",
                search_pattern=b'\xf1\x0f',  # 4081 in little endian
                pattern_offset=-2,
                rows=1,
                columns=1,
                data_size=2,
                off_value=0,
            ),
            MapDefinition(
                map_type=MapType.DPF_REGEN,
                name="DPF Regeneration Enable",
                description="DPF regeneration trigger map",
                search_pattern=b'DPF_REG',
                rows=8,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
        ]
        
        # Common EGR maps for EDC17
        edc17_egr_maps = [
            MapDefinition(
                map_type=MapType.EGR_FLOW,
                name="EGR Flow Map",
                description="EGR valve flow rate map - zero to disable",
                search_pattern=b'EGR',
                rows=16,
                columns=16,
                data_size=2,
                zero_fill=True,
            ),
            MapDefinition(
                map_type=MapType.EGR_SWITCH,
                name="EGR Switch",
                description="EGR enable/disable switch",
                rows=1,
                columns=1,
                data_size=2,
                off_value=0,
            ),
        ]
        
        # Common checksum for EDC17
        edc17_checksums = [
            ChecksumAlgorithm(
                checksum_type=ChecksumType.BOSCH_EDC17,
                name="EDC17 Main Checksum",
                calc_start=0x0000,
                calc_end=None,  # Full file
                polynomial=0x04C11DB7,
                initial_value=0xFFFFFFFF,
                xor_out=0xFFFFFFFF,
                reflect_in=True,
                reflect_out=True,
            ),
        ]
        
        # Modification rules for EDC17
        edc17_mod_rules = [
            ModificationRule(
                modification_type=ModificationType.DPF_OFF,
                map_types=[MapType.DPF_SWITCH, MapType.DPF_REGEN],
                description="Disable DPF regeneration and monitoring",
                zero_fill=True,
                related_dtcs=["P2002", "P2003", "P244A", "P244B", "P2458", "P2463"],
            ),
            ModificationRule(
                modification_type=ModificationType.EGR_OFF,
                map_types=[MapType.EGR_FLOW, MapType.EGR_SWITCH],
                description="Disable EGR valve operation",
                zero_fill=True,
                related_dtcs=["P0400", "P0401", "P0402", "P0403", "P0404"],
            ),
            ModificationRule(
                modification_type=ModificationType.DTC_OFF,
                map_types=[MapType.DTC_TABLE],
                description="Remove/disable diagnostic trouble codes",
                custom_handler="dtc_removal_handler",
            ),
        ]
        
        # EDC17C54 (Common in VW/Audi)
        self._definitions["bosch_edc17c54"] = ECUDefinition(
            id="bosch_edc17c54",
            manufacturer=ECUManufacturer.BOSCH,
            family="EDC17",
            variant="C54",
            full_name="Bosch EDC17C54",
            identification_patterns=[
                b"EDC17C54",
                b"EDC17 C54",
            ],
            file_size_range=(1_500_000, 4_500_000),  # 1.5MB - 4.5MB
            maps=edc17_dpf_maps + edc17_egr_maps,
            checksums=edc17_checksums,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
                ModificationType.STAGE1_TUNE,
            ],
            modification_rules=edc17_mod_rules,
            vehicles=["VW Golf", "VW Passat", "Audi A3", "Audi A4", "Skoda Octavia"],
            notes="Common VAG diesel ECU. Well documented.",
            verified=False,
        )
        
        # EDC17CP54
        self._definitions["bosch_edc17cp54"] = ECUDefinition(
            id="bosch_edc17cp54",
            manufacturer=ECUManufacturer.BOSCH,
            family="EDC17",
            variant="CP54",
            full_name="Bosch EDC17CP54",
            identification_patterns=[
                b"EDC17CP54",
                b"EDC17 CP54",
            ],
            file_size_range=(1_500_000, 4_500_000),
            maps=edc17_dpf_maps + edc17_egr_maps,
            checksums=edc17_checksums,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
                ModificationType.ADBLUE_OFF,
            ],
            modification_rules=edc17_mod_rules,
            vehicles=["BMW 3-Series", "BMW 5-Series", "BMW X3", "BMW X5"],
            notes="Common BMW diesel ECU. Has SCR/AdBlue support.",
            verified=False,
        )
        
        # EDC17C46 (Ford/PSA)
        self._definitions["bosch_edc17c46"] = ECUDefinition(
            id="bosch_edc17c46",
            manufacturer=ECUManufacturer.BOSCH,
            family="EDC17",
            variant="C46",
            full_name="Bosch EDC17C46",
            identification_patterns=[
                b"EDC17C46",
            ],
            file_size_range=(1_500_000, 3_000_000),
            maps=edc17_dpf_maps + edc17_egr_maps,
            checksums=edc17_checksums,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            modification_rules=edc17_mod_rules,
            vehicles=["Ford Transit", "Ford Ranger", "Peugeot 308", "Citroen C4"],
            verified=False,
        )
        
        # Generic EDC17 (fallback)
        self._definitions["bosch_edc17_generic"] = ECUDefinition(
            id="bosch_edc17_generic",
            manufacturer=ECUManufacturer.BOSCH,
            family="EDC17",
            variant="Generic",
            full_name="Bosch EDC17 (Generic)",
            identification_patterns=[
                b"EDC17",
            ],
            file_size_range=(1_000_000, 8_000_000),
            maps=edc17_dpf_maps + edc17_egr_maps,
            checksums=edc17_checksums,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            modification_rules=edc17_mod_rules,
            notes="Generic EDC17 definition. Use specific variant if possible.",
            verified=False,
        )
    
    def _load_bosch_edc16_definitions(self):
        """Load Bosch EDC16 family definitions"""
        
        # EDC16 DPF maps (simpler than EDC17)
        edc16_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_SWITCH,
                name="DPF Enable",
                description="DPF enable byte - set to 0x00",
                rows=1,
                columns=1,
                data_size=1,
                off_value=0,
            ),
        ]
        
        edc16_egr_maps = [
            MapDefinition(
                map_type=MapType.EGR_FLOW,
                name="EGR Flow",
                description="EGR flow map",
                rows=16,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
        ]
        
        # EDC16C39 (Common PSA/Ford)
        self._definitions["bosch_edc16c39"] = ECUDefinition(
            id="bosch_edc16c39",
            manufacturer=ECUManufacturer.BOSCH,
            family="EDC16",
            variant="C39",
            full_name="Bosch EDC16C39",
            identification_patterns=[
                b"EDC16C39",
            ],
            file_size_range=(500_000, 2_000_000),
            maps=edc16_dpf_maps + edc16_egr_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            vehicles=["Peugeot 206", "Peugeot 307", "Citroen C3", "Ford Focus"],
            notes="Older diesel ECU. No SCR/AdBlue.",
            verified=False,
        )
    
    def _load_delphi_dcm_definitions(self):
        """Load Delphi DCM family definitions"""
        
        dcm_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_SWITCH,
                name="DPF Switch",
                description="DPF enable switch",
                search_pattern=b'DPF',
                rows=1,
                columns=1,
                data_size=2,
                off_value=0,
            ),
        ]
        
        # DCM6.2
        self._definitions["delphi_dcm62"] = ECUDefinition(
            id="delphi_dcm62",
            manufacturer=ECUManufacturer.DELPHI,
            family="DCM",
            variant="6.2",
            full_name="Delphi DCM6.2",
            identification_patterns=[
                b"DCM6.2",
                b"DCM 6.2",
            ],
            file_size_range=(1_000_000, 4_000_000),
            maps=dcm_dpf_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            vehicles=["Peugeot 308", "Peugeot 3008", "Citroen DS3"],
            verified=False,
        )
        
        # DCM3.5
        self._definitions["delphi_dcm35"] = ECUDefinition(
            id="delphi_dcm35",
            manufacturer=ECUManufacturer.DELPHI,
            family="DCM",
            variant="3.5",
            full_name="Delphi DCM3.5",
            identification_patterns=[
                b"DCM3.5",
            ],
            file_size_range=(500_000, 2_000_000),
            maps=dcm_dpf_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
            ],
            vehicles=["Renault Megane", "Renault Scenic", "Dacia Duster"],
            verified=False,
        )
    
    def _load_denso_definitions(self):
        """Load Denso ECU definitions - Enhanced based on real file analysis"""
        
        # =================================================================
        # DENSO Toyota Hiace (89663-26606) - ANALYZED FROM REAL FILE
        # =================================================================
        # Analysis from dpfoffservice.com task_916783
        # - Part number location: 0x7EC
        # - DPF temp maps: 0xAE00-0xAF00
        # - DTC P0248 at: 0x5970, 0x5BC8, 0x5E20
        
        denso_hiace_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_REGEN,
                name="DPF Regen Temperature Map 1",
                description="DPF regeneration temperature map - zero to disable",
                offset=0xAE00,
                rows=16,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
            MapDefinition(
                map_type=MapType.DPF_REGEN,
                name="DPF Regen Temperature Map 2",
                description="DPF regeneration temperature map - zero to disable",
                offset=0xAF00,
                rows=16,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
            MapDefinition(
                map_type=MapType.DPF_SWITCH,
                name="DPF Enable Area",
                description="Zeroed region found in processed file",
                offset=0x7A00,
                rows=16,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
        ]
        
        denso_egr_maps = [
            MapDefinition(
                map_type=MapType.EGR_FLOW,
                name="EGR Flow Map",
                description="Denso EGR valve flow rate map",
                rows=16,
                columns=16,
                data_size=2,
                zero_fill=True,
            ),
        ]
        
        # Toyota Hiace 2.5/2.8 D-4D with Denso ECU
        self._definitions["denso_toyota_hiace"] = ECUDefinition(
            id="denso_toyota_hiace",
            manufacturer=ECUManufacturer.DENSO,
            family="Toyota",
            variant="Hiace D-4D",
            full_name="Denso Toyota Hiace (89663)",
            identification_patterns=[
                b"89663-26",    # Hiace part number prefix
                b"89663-2660",  # Specific Hiace
            ],
            file_size_range=(1_000_000, 2_000_000),
            maps=denso_hiace_dpf_maps + denso_egr_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            modification_rules=[
                ModificationRule(
                    modification_type=ModificationType.DPF_OFF,
                    map_types=[MapType.DPF_SWITCH, MapType.DPF_REGEN],
                    description="Disable DPF regeneration on Denso Hiace",
                    zero_fill=True,
                    related_dtcs=["P0248", "P2002", "P2003", "P2458", "P2463"],
                ),
                ModificationRule(
                    modification_type=ModificationType.EGR_OFF,
                    map_types=[MapType.EGR_FLOW],
                    description="Disable EGR on Denso Hiace",
                    zero_fill=True,
                    related_dtcs=["P0400", "P0401", "P0402", "P0403"],
                ),
            ],
            vehicles=["Toyota Hiace 2.5 D-4D", "Toyota Hiace 2.8 D-4D", "Toyota Fortuner D-4D"],
            notes="Verified from dpfoffservice.com processed file. DPF maps at 0xAE00-0xAF00.",
            verified=True,
        )
        
        # =================================================================
        # DENSO Hino SH7058 - ANALYZED FROM REAL FILE
        # =================================================================
        # Analysis from task_915823: BP40YL36B410_SH7058
        # Part number: 89663-E1041
        # DENSO identifier at 0x6028
        
        denso_hino_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_REGEN,
                name="Hino DPF Regen Map",
                description="Hino truck DPF regeneration map",
                search_pattern=b'DENSO',
                pattern_offset=0x1000,
                rows=16,
                columns=8,
                data_size=2,
                zero_fill=True,
            ),
        ]
        
        # Hino 500 Series with Denso SH7058
        self._definitions["denso_hino_sh7058"] = ECUDefinition(
            id="denso_hino_sh7058",
            manufacturer=ECUManufacturer.DENSO,
            family="SH7058",
            variant="Hino",
            full_name="Denso SH7058 (Hino)",
            identification_patterns=[
                b"DENSO",
                b"89663-E",     # Hino part number prefix
                b"SH7058",
            ],
            file_size_range=(1_000_000, 2_000_000),
            maps=denso_hino_dpf_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
                ModificationType.DTC_OFF,
            ],
            vehicles=["Hino 300", "Hino 500", "Hino 700", "Hino Ranger"],
            notes="Verified from dpfoffservice.com. Hino truck ECU with SH7058 processor.",
            verified=True,
        )
        
        # =================================================================
        # Generic Denso NEC (fallback)
        # =================================================================
        denso_dpf_maps = [
            MapDefinition(
                map_type=MapType.DPF_SWITCH,
                name="DPF Switch",
                description="Denso DPF control - pattern varies by variant",
                search_pattern=b'DpF',
                rows=1,
                columns=1,
                data_size=2,
            ),
        ]
        
        self._definitions["denso_nec"] = ECUDefinition(
            id="denso_nec",
            manufacturer=ECUManufacturer.DENSO,
            family="NEC",
            variant="Gen3",
            full_name="Denso NEC Gen 3",
            identification_patterns=[
                b"DENSO",
                b"89661",
                b"89663",
            ],
            file_size_range=(1_000_000, 4_000_000),
            maps=denso_dpf_maps,
            supported_modifications=[
                ModificationType.DPF_OFF,
                ModificationType.EGR_OFF,
            ],
            vehicles=["Toyota Hilux", "Toyota Fortuner", "Toyota Land Cruiser"],
            notes="Generic Denso NEC. Use specific definitions when available.",
            verified=False,
        )
    
    # =========================================================================
    # PUBLIC METHODS
    # =========================================================================
    
    def get_definition(self, ecu_id: str) -> Optional[ECUDefinition]:
        """Get ECU definition by ID"""
        return self._definitions.get(ecu_id)
    
    def identify_ecu(self, file_data: bytes) -> Optional[ECUDefinition]:
        """
        Identify ECU type from binary file data.
        Returns the most specific matching definition.
        """
        matches = []
        file_size = len(file_data)
        
        for ecu_id, definition in self._definitions.items():
            # Check file size range
            min_size, max_size = definition.file_size_range
            if min_size > 0 and max_size > 0:
                if not (min_size <= file_size <= max_size):
                    continue
            
            # Check identification patterns
            pattern_matches = 0
            for pattern in definition.identification_patterns:
                if pattern in file_data:
                    pattern_matches += 1
            
            if pattern_matches > 0:
                # Score based on specificity (longer patterns = more specific)
                specificity = sum(len(p) for p in definition.identification_patterns if p in file_data)
                matches.append((definition, pattern_matches, specificity))
        
        if not matches:
            return None
        
        # Sort by pattern matches (desc), then specificity (desc)
        matches.sort(key=lambda x: (x[1], x[2]), reverse=True)
        return matches[0][0]
    
    def get_all_definitions(self) -> List[ECUDefinition]:
        """Get all ECU definitions"""
        return list(self._definitions.values())
    
    def get_definitions_by_manufacturer(self, manufacturer: ECUManufacturer) -> List[ECUDefinition]:
        """Get all definitions for a manufacturer"""
        return [
            d for d in self._definitions.values()
            if d.manufacturer == manufacturer
        ]
    
    def add_definition(self, definition: ECUDefinition):
        """Add or update an ECU definition"""
        self._definitions[definition.id] = definition
    
    def get_supported_modifications(self, ecu_id: str) -> List[ModificationType]:
        """Get list of supported modifications for an ECU"""
        definition = self.get_definition(ecu_id)
        if definition:
            return definition.supported_modifications
        return []
