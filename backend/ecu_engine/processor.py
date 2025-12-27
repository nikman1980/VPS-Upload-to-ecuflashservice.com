"""
ECU Processing Engine - Main Processor
=======================================
Orchestrates the complete ECU file processing workflow.

Workflow:
1. Load and identify ECU file
2. Find maps based on ECU definition
3. Apply requested modifications
4. Update checksums
5. Validate and save result
"""

import time
import copy
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from .models import (
    ECUDefinition,
    ProcessingResult,
    ModificationType,
    MapType,
)
from .database import ECUDefinitionDB
from .map_locator import MapLocator
from .map_modifier import MapModifier
from .checksum import ChecksumCalculator


class ECUFileProcessor:
    """
    Main ECU file processor.
    
    This class orchestrates the complete processing workflow:
    1. ECU identification
    2. Map location
    3. Modification application
    4. Checksum update
    5. Result validation
    """
    
    def __init__(self):
        self.ecu_db = ECUDefinitionDB()
        self.map_locator = MapLocator()
        self.map_modifier = MapModifier()
        self.checksum_calc = ChecksumCalculator()
        
        # Processing state
        self._current_file: Optional[bytearray] = None
        self._current_ecu: Optional[ECUDefinition] = None
        self._found_maps: Dict[MapType, List[Dict]] = {}
    
    def process_file(
        self,
        file_data: bytes,
        modifications: List[ModificationType],
        original_filename: str = "unknown.bin"
    ) -> ProcessingResult:
        """
        Process an ECU file with requested modifications.
        
        Args:
            file_data: Raw binary ECU file data
            modifications: List of modifications to apply
            original_filename: Original filename for logging
            
        Returns:
            ProcessingResult with details of what was done
        """
        start_time = time.time()
        
        result = ProcessingResult(
            success=False,
            original_filename=original_filename,
            original_size=len(file_data),
        )
        
        try:
            # Step 1: Identify ECU
            ecu_definition = self.ecu_db.identify_ecu(file_data)
            if not ecu_definition:
                result.errors.append("Could not identify ECU type")
                result.warnings.append("File may be unsupported or corrupted")
                return result
            
            self._current_ecu = ecu_definition
            result.ecu_id = ecu_definition.id
            result.ecu_name = ecu_definition.full_name
            result.manufacturer = ecu_definition.manufacturer.value
            
            # Step 2: Validate modifications are supported
            unsupported = []
            for mod in modifications:
                if mod not in ecu_definition.supported_modifications:
                    unsupported.append(mod.value)
            
            if unsupported:
                result.warnings.append(f"Unsupported modifications for this ECU: {unsupported}")
                # Filter to only supported modifications
                modifications = [m for m in modifications if m in ecu_definition.supported_modifications]
            
            if not modifications:
                result.errors.append("No supported modifications requested")
                return result
            
            # Step 3: Find maps
            self._found_maps = self.map_locator.find_maps(file_data, ecu_definition)
            
            if not self._found_maps:
                result.warnings.append("No maps found - using pattern-based modification")
            
            # Step 4: Create working copy
            self._current_file = bytearray(file_data)
            
            # Step 5: Apply modifications
            for mod_type in modifications:
                mod_result = self._apply_modification(mod_type, ecu_definition)
                if mod_result:
                    result.modifications_applied.append(mod_type.value)
                    result.maps_modified.extend(mod_result.get("maps", []))
                    result.dtcs_removed.extend(mod_result.get("dtcs", []))
            
            # Step 6: Update checksums
            if ecu_definition.checksums:
                for checksum_def in ecu_definition.checksums:
                    success, new_checksum = self.checksum_calc.update_checksum(
                        self._current_file,
                        checksum_def
                    )
                    if success:
                        result.checksum_updated = True
                        result.maps_modified.append({
                            "type": "checksum",
                            "name": checksum_def.name,
                            "value": f"0x{new_checksum:08X}"
                        })
                    else:
                        result.warnings.append(f"Could not update checksum: {checksum_def.name}")
            else:
                result.warnings.append("No checksum definition for this ECU - checksum not updated")
            
            # Step 7: Finalize
            result.success = len(result.modifications_applied) > 0
            result.processed_size = len(self._current_file)
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            
            return result
            
        except Exception as e:
            result.errors.append(f"Processing error: {str(e)}")
            return result
    
    def _apply_modification(
        self,
        mod_type: ModificationType,
        ecu_definition: ECUDefinition
    ) -> Optional[Dict[str, Any]]:
        """
        Apply a single modification type.
        
        Returns:
            Dictionary with modification details or None if failed
        """
        maps_modified = []
        dtcs_removed = []
        
        if mod_type == ModificationType.DPF_OFF:
            # Apply DPF OFF
            mods = self.map_modifier.apply_dpf_off(self._current_file, self._found_maps)
            for mod in mods:
                if mod.get("type") == "DTC_REMOVAL":
                    dtcs_removed.append(mod.get("dtc"))
                else:
                    maps_modified.append(mod)
        
        elif mod_type == ModificationType.EGR_OFF:
            # Apply EGR OFF
            mods = self.map_modifier.apply_egr_off(self._current_file, self._found_maps)
            for mod in mods:
                if mod.get("type") == "DTC_REMOVAL":
                    dtcs_removed.append(mod.get("dtc"))
                else:
                    maps_modified.append(mod)
        
        elif mod_type == ModificationType.DTC_OFF:
            # Remove all emission-related DTCs
            emission_dtcs = [
                "P0400", "P0401", "P0402", "P0403", "P0404",  # EGR
                "P2002", "P2003", "P244A", "P244B", "P2458", "P2463",  # DPF
                "P20EE", "P2201", "P2202", "P2203",  # SCR/NOx
            ]
            results = self.map_modifier.remove_dtcs_by_list(self._current_file, emission_dtcs)
            for r in results:
                if r.get("success"):
                    dtcs_removed.append(r.get("dtc_code"))
        
        elif mod_type == ModificationType.ADBLUE_OFF:
            # Apply AdBlue/SCR OFF
            if MapType.SCR_SWITCH in self._found_maps:
                for map_info in self._found_maps[MapType.SCR_SWITCH]:
                    offset = map_info.get("offset")
                    if offset:
                        self._current_file[offset:offset+2] = b'\x00\x00'
                        maps_modified.append({
                            "type": "SCR_SWITCH",
                            "offset": offset,
                            "action": "set_to_zero"
                        })
            
            # Remove SCR-related DTCs
            scr_dtcs = ["P20EE", "P2201", "P2202", "P2203", "P2BAF", "P2BA9"]
            results = self.map_modifier.remove_dtcs_by_list(self._current_file, scr_dtcs)
            for r in results:
                if r.get("success"):
                    dtcs_removed.append(r.get("dtc_code"))
        
        else:
            # Use generic rule-based modification
            _, mods = self.map_modifier.apply_modification(
                self._current_file,
                mod_type,
                self._found_maps,
                ecu_definition.modification_rules
            )
            for mod in mods:
                if mod.get("success"):
                    maps_modified.append(mod)
        
        if maps_modified or dtcs_removed:
            return {
                "maps": maps_modified,
                "dtcs": dtcs_removed
            }
        return None
    
    def get_processed_file(self) -> Optional[bytes]:
        """
        Get the processed file data.
        
        Returns:
            Processed file as bytes, or None if no file processed
        """
        if self._current_file:
            return bytes(self._current_file)
        return None
    
    def identify_ecu(self, file_data: bytes) -> Optional[ECUDefinition]:
        """
        Identify ECU type from file data.
        
        Args:
            file_data: Raw binary ECU file
            
        Returns:
            ECUDefinition if identified, None otherwise
        """
        return self.ecu_db.identify_ecu(file_data)
    
    def get_supported_modifications(self, file_data: bytes) -> List[ModificationType]:
        """
        Get list of supported modifications for a file.
        
        Args:
            file_data: Raw binary ECU file
            
        Returns:
            List of supported ModificationType values
        """
        ecu_def = self.ecu_db.identify_ecu(file_data)
        if ecu_def:
            return ecu_def.supported_modifications
        return []
    
    def analyze_file(self, file_data: bytes) -> Dict[str, Any]:
        """
        Analyze an ECU file without modifying it.
        
        Args:
            file_data: Raw binary ECU file
            
        Returns:
            Dictionary with analysis results
        """
        result = {
            "file_size": len(file_data),
            "identified": False,
            "ecu_info": None,
            "found_maps": {},
            "checksum_info": [],
        }
        
        # Identify ECU
        ecu_def = self.ecu_db.identify_ecu(file_data)
        if ecu_def:
            result["identified"] = True
            result["ecu_info"] = {
                "id": ecu_def.id,
                "name": ecu_def.full_name,
                "manufacturer": ecu_def.manufacturer.value,
                "family": ecu_def.family,
                "variant": ecu_def.variant,
                "supported_mods": [m.value for m in ecu_def.supported_modifications],
                "verified": ecu_def.verified,
            }
            
            # Find maps
            found_maps = self.map_locator.find_maps(file_data, ecu_def)
            for map_type, locations in found_maps.items():
                result["found_maps"][map_type.value] = [
                    {
                        "offset": loc.get("offset"),
                        "method": loc.get("method"),
                    }
                    for loc in locations
                ]
            
            # Check checksums
            for checksum_def in ecu_def.checksums:
                is_valid, stored, calculated = self.checksum_calc.verify_checksum(
                    file_data, checksum_def
                )
                result["checksum_info"].append({
                    "name": checksum_def.name,
                    "valid": is_valid,
                    "stored": f"0x{stored:08X}" if stored else "N/A",
                    "calculated": f"0x{calculated:08X}" if calculated else "N/A",
                })
        
        return result


# Convenience function for quick processing
def process_ecu_file(
    file_path: str,
    modifications: List[str],
    output_path: Optional[str] = None
) -> ProcessingResult:
    """
    Convenience function to process an ECU file.
    
    Args:
        file_path: Path to ECU file
        modifications: List of modification names (e.g., ["dpf_off", "egr_off"])
        output_path: Optional output path (default: adds "_modified" to filename)
        
    Returns:
        ProcessingResult
    """
    # Load file
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    # Convert string modifications to enum
    mod_types = []
    for mod in modifications:
        try:
            mod_types.append(ModificationType(mod))
        except ValueError:
            pass
    
    # Process
    processor = ECUFileProcessor()
    result = processor.process_file(file_data, mod_types, Path(file_path).name)
    
    # Save if successful
    if result.success:
        processed_data = processor.get_processed_file()
        if processed_data:
            if not output_path:
                p = Path(file_path)
                output_path = str(p.parent / f"{p.stem}_modified{p.suffix}")
            
            with open(output_path, 'wb') as f:
                f.write(processed_data)
            
            result.processed_filename = output_path
    
    return result
