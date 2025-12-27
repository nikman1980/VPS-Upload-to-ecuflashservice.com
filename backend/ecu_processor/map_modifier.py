"""
ECU Processing Engine - Map Modifier
=====================================
Modify maps and tables in ECU binary files.

This module handles the actual modifications:
- Zero-fill maps (disable functions)
- Set specific values (switches)
- Remove DTCs
- Apply tuning changes

IMPORTANT: Always work on a copy of the file data!
"""

import struct
import copy
from typing import Dict, List, Optional, Tuple, Any
from .models import MapDefinition, MapType, ModificationRule, ModificationType


class MapModifier:
    """
    Modify maps in ECU binary files.
    
    All modifications are tracked for logging and verification.
    """
    
    def __init__(self):
        self._modifications_log = []
    
    def apply_modification(
        self,
        file_data: bytearray,
        modification_type: ModificationType,
        map_locations: Dict[MapType, List[Dict[str, Any]]],
        rules: List[ModificationRule]
    ) -> Tuple[bytearray, List[Dict[str, Any]]]:
        """
        Apply a modification to the file.
        
        Args:
            file_data: Bytearray of file data (will be modified in place)
            modification_type: Type of modification to apply
            map_locations: Found map locations from MapLocator
            rules: Modification rules from ECU definition
            
        Returns:
            Tuple of (modified_data, list of modifications made)
        """
        modifications_made = []
        
        # Find the rule for this modification type
        rule = None
        for r in rules:
            if r.modification_type == modification_type:
                rule = r
                break
        
        if not rule:
            return file_data, [{"error": f"No rule found for {modification_type}"}]
        
        # Apply modification to each relevant map type
        for map_type in rule.map_types:
            if map_type not in map_locations:
                continue
            
            for map_info in map_locations[map_type]:
                result = self._modify_map(file_data, map_info, rule)
                if result:
                    modifications_made.append(result)
        
        return file_data, modifications_made
    
    def _modify_map(
        self,
        file_data: bytearray,
        map_info: Dict[str, Any],
        rule: ModificationRule
    ) -> Optional[Dict[str, Any]]:
        """
        Modify a single map based on the rule.
        
        Args:
            file_data: File data to modify
            map_info: Map location info from MapLocator
            rule: Modification rule to apply
            
        Returns:
            Dictionary describing the modification, or None if failed
        """
        offset = map_info.get("offset")
        map_def = map_info.get("map_def")
        
        if offset is None or map_def is None:
            return None
        
        # Calculate map size in bytes
        map_size = map_def.rows * map_def.columns * map_def.data_size
        
        if offset + map_size > len(file_data):
            return {"error": "Map extends beyond file", "offset": offset}
        
        # Store original values for logging
        original_data = bytes(file_data[offset:offset + map_size])
        
        # Apply the modification
        if rule.zero_fill or map_def.zero_fill:
            # Fill entire map with zeros
            for i in range(map_size):
                file_data[offset + i] = 0x00
            method = "zero_fill"
            
        elif rule.set_value is not None:
            # Set all cells to specific value
            self._set_map_value(file_data, offset, map_def, rule.set_value)
            method = f"set_value={rule.set_value}"
            
        elif map_def.off_value is not None:
            # Use map's defined "off" value
            self._set_map_value(file_data, offset, map_def, map_def.off_value)
            method = f"off_value={map_def.off_value}"
            
        elif rule.multiply_by is not None:
            # Multiply all values
            self._multiply_map_values(file_data, offset, map_def, rule.multiply_by)
            method = f"multiply={rule.multiply_by}"
            
        elif rule.nop_fill:
            # Fill with NOP instructions (for code areas)
            for i in range(map_size):
                file_data[offset + i] = 0x90  # x86 NOP
            method = "nop_fill"
            
        else:
            return {"error": "No modification method specified", "offset": offset}
        
        return {
            "success": True,
            "map_type": map_def.map_type.value,
            "map_name": map_def.name,
            "offset": offset,
            "size": map_size,
            "method": method,
            "original_preview": original_data[:16].hex(),
            "modified_preview": bytes(file_data[offset:offset + 16]).hex(),
        }
    
    def _set_map_value(
        self,
        file_data: bytearray,
        offset: int,
        map_def: MapDefinition,
        value: int
    ):
        """Set all cells in a map to a specific value."""
        pos = offset
        
        # Determine format string
        if map_def.data_size == 1:
            fmt = 'B'
        elif map_def.data_size == 2:
            fmt = '<H' if map_def.byte_order == "little" else '>H'
        elif map_def.data_size == 4:
            fmt = '<I' if map_def.byte_order == "little" else '>I'
        else:
            return
        
        packed_value = struct.pack(fmt.replace('<', '').replace('>', ''), value)
        if '<' in fmt or map_def.byte_order == "little":
            packed_value = struct.pack('<' + fmt.replace('<', '').replace('>', ''), value)
        else:
            packed_value = struct.pack('>' + fmt.replace('<', '').replace('>', ''), value)
        
        for _ in range(map_def.rows * map_def.columns):
            for i, byte in enumerate(packed_value):
                file_data[pos + i] = byte
            pos += map_def.data_size
    
    def _multiply_map_values(
        self,
        file_data: bytearray,
        offset: int,
        map_def: MapDefinition,
        multiplier: float
    ):
        """Multiply all values in a map by a factor."""
        pos = offset
        
        # Determine format strings
        if map_def.data_size == 1:
            read_fmt = 'B'
            write_fmt = 'B'
        elif map_def.data_size == 2:
            read_fmt = '<H' if map_def.byte_order == "little" else '>H'
            write_fmt = read_fmt
        elif map_def.data_size == 4:
            read_fmt = '<I' if map_def.byte_order == "little" else '>I'
            write_fmt = read_fmt
        else:
            return
        
        for _ in range(map_def.rows * map_def.columns):
            # Read current value
            current = struct.unpack(read_fmt, bytes(file_data[pos:pos + map_def.data_size]))[0]
            
            # Apply multiplier with bounds checking
            new_value = int(current * multiplier)
            max_value = (2 ** (map_def.data_size * 8)) - 1
            new_value = max(0, min(new_value, max_value))
            
            # Write new value
            packed = struct.pack(write_fmt, new_value)
            for i, byte in enumerate(packed):
                file_data[pos + i] = byte
            
            pos += map_def.data_size
    
    def remove_dtc(
        self,
        file_data: bytearray,
        dtc_code: str,
        dtc_locations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Remove a specific DTC from the file.
        
        Args:
            file_data: File data to modify
            dtc_code: DTC code to remove (e.g., "P0401")
            dtc_locations: Found DTC table locations
            
        Returns:
            Dictionary with removal result
        """
        removed_count = 0
        
        # Convert DTC to bytes for searching
        dtc_bytes = dtc_code.encode('ascii')
        
        # Search and nullify
        pos = 0
        while True:
            pos = file_data.find(dtc_bytes, pos)
            if pos == -1:
                break
            
            # Zero out the DTC code
            for i in range(len(dtc_bytes)):
                file_data[pos + i] = 0x00
            
            removed_count += 1
            pos += 1
        
        return {
            "dtc_code": dtc_code,
            "removed_count": removed_count,
            "success": removed_count > 0,
        }
    
    def remove_dtcs_by_list(
        self,
        file_data: bytearray,
        dtc_codes: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Remove multiple DTCs from the file.
        
        Args:
            file_data: File data to modify
            dtc_codes: List of DTC codes to remove
            
        Returns:
            List of removal results
        """
        results = []
        for dtc in dtc_codes:
            result = self.remove_dtc(file_data, dtc, [])
            results.append(result)
        return results
    
    def apply_dpf_off(self, file_data: bytearray, map_locations: Dict) -> List[Dict]:
        """
        Apply DPF OFF modification.
        
        This is a convenience method that:
        1. Zeros DPF switch maps
        2. Zeros DPF regeneration maps
        3. Removes related DTCs
        """
        modifications = []
        
        # Zero DPF switch
        if MapType.DPF_SWITCH in map_locations:
            for map_info in map_locations[MapType.DPF_SWITCH]:
                offset = map_info.get("offset")
                if offset:
                    # Set switch to 0
                    file_data[offset:offset+2] = b'\x00\x00'
                    modifications.append({
                        "type": "DPF_SWITCH",
                        "offset": offset,
                        "action": "set_to_zero"
                    })
        
        # Zero DPF regen maps
        if MapType.DPF_REGEN in map_locations:
            for map_info in map_locations[MapType.DPF_REGEN]:
                offset = map_info.get("offset")
                map_def = map_info.get("map_def")
                if offset and map_def:
                    size = map_def.rows * map_def.columns * map_def.data_size
                    file_data[offset:offset+size] = b'\x00' * size
                    modifications.append({
                        "type": "DPF_REGEN",
                        "offset": offset,
                        "size": size,
                        "action": "zero_fill"
                    })
        
        # Remove related DTCs
        dpf_dtcs = ["P2002", "P2003", "P244A", "P244B", "P2458", "P2463", "P2459"]
        for dtc in dpf_dtcs:
            result = self.remove_dtc(file_data, dtc, [])
            if result["removed_count"] > 0:
                modifications.append({
                    "type": "DTC_REMOVAL",
                    "dtc": dtc,
                    "count": result["removed_count"]
                })
        
        return modifications
    
    def apply_egr_off(self, file_data: bytearray, map_locations: Dict) -> List[Dict]:
        """
        Apply EGR OFF modification.
        """
        modifications = []
        
        # Zero EGR flow maps
        if MapType.EGR_FLOW in map_locations:
            for map_info in map_locations[MapType.EGR_FLOW]:
                offset = map_info.get("offset")
                map_def = map_info.get("map_def")
                if offset and map_def:
                    size = map_def.rows * map_def.columns * map_def.data_size
                    file_data[offset:offset+size] = b'\x00' * size
                    modifications.append({
                        "type": "EGR_FLOW",
                        "offset": offset,
                        "size": size,
                        "action": "zero_fill"
                    })
        
        # Zero EGR switch
        if MapType.EGR_SWITCH in map_locations:
            for map_info in map_locations[MapType.EGR_SWITCH]:
                offset = map_info.get("offset")
                if offset:
                    file_data[offset:offset+2] = b'\x00\x00'
                    modifications.append({
                        "type": "EGR_SWITCH",
                        "offset": offset,
                        "action": "set_to_zero"
                    })
        
        # Remove related DTCs
        egr_dtcs = ["P0400", "P0401", "P0402", "P0403", "P0404", "P0405", "P0406"]
        for dtc in egr_dtcs:
            result = self.remove_dtc(file_data, dtc, [])
            if result["removed_count"] > 0:
                modifications.append({
                    "type": "DTC_REMOVAL",
                    "dtc": dtc,
                    "count": result["removed_count"]
                })
        
        return modifications
