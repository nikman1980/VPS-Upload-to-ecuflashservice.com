"""
ECU Processing Engine - Map Locator
====================================
Find specific maps and tables in ECU binary files.

This module handles the critical task of locating maps within
binary ECU files. Maps can be found by:
1. Fixed offset (known location)
2. Search pattern (pattern + offset)
3. Structural analysis (finding map-like data structures)
"""

import struct
from typing import Dict, List, Optional, Tuple, Any
from .models import MapDefinition, MapType, ECUDefinition


class MapLocator:
    """
    Locate maps and tables in ECU binary files.
    
    Maps in ECU files are typically:
    - 2D or 3D lookup tables
    - Have axis data (RPM, load, temperature, etc.)
    - Contain 8-bit, 16-bit, or 32-bit values
    - Are often aligned to specific boundaries
    """
    
    def __init__(self):
        self._cache = {}  # Cache of found map locations
    
    def find_maps(self, file_data: bytes, ecu_definition: ECUDefinition) -> Dict[MapType, List[Dict[str, Any]]]:
        """
        Find all defined maps in the file.
        
        Args:
            file_data: Raw binary ECU file
            ecu_definition: ECU definition with map definitions
            
        Returns:
            Dictionary mapping map types to list of found locations
        """
        results = {}
        
        for map_def in ecu_definition.maps:
            found = self.find_map(file_data, map_def)
            if found:
                if map_def.map_type not in results:
                    results[map_def.map_type] = []
                results[map_def.map_type].extend(found)
        
        return results
    
    def find_map(self, file_data: bytes, map_def: MapDefinition) -> List[Dict[str, Any]]:
        """
        Find a specific map in the file.
        
        Args:
            file_data: Raw binary ECU file
            map_def: Map definition to search for
            
        Returns:
            List of found map instances with their locations and data
        """
        results = []
        
        # Method 1: Fixed offset
        if map_def.offset is not None:
            map_data = self._read_map_at_offset(file_data, map_def.offset, map_def)
            if map_data:
                results.append({
                    "offset": map_def.offset,
                    "data": map_data,
                    "map_def": map_def,
                    "method": "fixed_offset",
                })
        
        # Method 2: Search pattern
        elif map_def.search_pattern is not None:
            pattern_locations = self._find_pattern(file_data, map_def.search_pattern)
            for loc in pattern_locations:
                actual_offset = loc + map_def.pattern_offset
                if 0 <= actual_offset < len(file_data):
                    map_data = self._read_map_at_offset(file_data, actual_offset, map_def)
                    if map_data:
                        results.append({
                            "offset": actual_offset,
                            "pattern_offset": loc,
                            "data": map_data,
                            "map_def": map_def,
                            "method": "pattern_search",
                        })
        
        # Method 3: Structural analysis (for common map patterns)
        if not results:
            structural_results = self._find_by_structure(file_data, map_def)
            results.extend(structural_results)
        
        return results
    
    def _read_map_at_offset(self, file_data: bytes, offset: int, map_def: MapDefinition) -> Optional[List[List[int]]]:
        """
        Read map data at a specific offset.
        
        Returns:
            2D list of map values, or None if invalid
        """
        try:
            map_data = []
            pos = offset
            
            # Determine struct format
            if map_def.data_size == 1:
                fmt = 'b' if map_def.is_signed else 'B'
            elif map_def.data_size == 2:
                fmt = '<h' if map_def.is_signed else '<H'
                if map_def.byte_order == "big":
                    fmt = '>h' if map_def.is_signed else '>H'
            elif map_def.data_size == 4:
                fmt = '<i' if map_def.is_signed else '<I'
                if map_def.byte_order == "big":
                    fmt = '>i' if map_def.is_signed else '>I'
            else:
                return None
            
            # Read map values
            for row in range(map_def.rows):
                row_data = []
                for col in range(map_def.columns):
                    if pos + map_def.data_size > len(file_data):
                        return None
                    
                    value = struct.unpack(fmt, file_data[pos:pos + map_def.data_size])[0]
                    row_data.append(value)
                    pos += map_def.data_size
                
                map_data.append(row_data)
            
            return map_data
            
        except Exception:
            return None
    
    def _find_pattern(self, file_data: bytes, pattern: bytes) -> List[int]:
        """
        Find all occurrences of a pattern in the file.
        
        Returns:
            List of offsets where pattern was found
        """
        locations = []
        start = 0
        
        while True:
            pos = file_data.find(pattern, start)
            if pos == -1:
                break
            locations.append(pos)
            start = pos + 1
        
        return locations
    
    def _find_by_structure(self, file_data: bytes, map_def: MapDefinition) -> List[Dict[str, Any]]:
        """
        Find maps by analyzing data structure patterns.
        
        This method looks for map-like structures:
        - Sequences of values within expected ranges
        - Map boundary markers (0x7FFF, 0x8000, etc.)
        - Axis data patterns
        """
        results = []
        
        # Look for EDC17-style DPF switch pattern (4081, 15 sequence)
        if map_def.map_type == MapType.DPF_SWITCH:
            dpf_switches = self._find_edc17_dpf_switch(file_data)
            for offset in dpf_switches:
                results.append({
                    "offset": offset,
                    "data": [[struct.unpack('<H', file_data[offset:offset+2])[0]]],
                    "map_def": map_def,
                    "method": "structural_analysis",
                    "pattern": "EDC17_DPF_SWITCH",
                })
        
        return results
    
    def _find_edc17_dpf_switch(self, file_data: bytes) -> List[int]:
        """
        Find EDC17-style DPF switch locations.
        
        EDC17 uses a characteristic pattern:
        - Value 4081 (0x0FF1 in LE) followed by 15 (0x000F)
        - This indicates the DPF switch/enable area
        """
        locations = []
        val_4081 = struct.pack('<H', 4081)  # 0xF1 0x0F
        val_15 = struct.pack('<H', 15)      # 0x0F 0x00
        
        # Search in first 500KB (switch usually in calibration area)
        search_limit = min(len(file_data) - 10, 500_000)
        
        for i in range(search_limit):
            if file_data[i:i+2] == val_4081:
                # Check if 15 follows within next 6 bytes
                if val_15 in file_data[i+2:i+8]:
                    locations.append(i)
        
        return locations
    
    def find_dtc_table(self, file_data: bytes) -> List[Dict[str, Any]]:
        """
        Find DTC (Diagnostic Trouble Code) tables in the file.
        
        DTC tables typically contain:
        - P0xxx, P1xxx, P2xxx codes (in ASCII or encoded)
        - Associated enable/disable flags
        - Error counter thresholds
        """
        results = []
        
        # Look for ASCII DTC patterns (P0xxx)
        dtc_pattern = b'P0'
        locations = self._find_pattern(file_data, dtc_pattern)
        
        # Filter to find actual DTC tables (multiple codes close together)
        dtc_clusters = self._find_clusters(locations, max_gap=100, min_count=5)
        
        for cluster_start, cluster_end, count in dtc_clusters:
            results.append({
                "offset": cluster_start,
                "end_offset": cluster_end,
                "dtc_count": count,
                "method": "ascii_search",
            })
        
        return results
    
    def _find_clusters(self, locations: List[int], max_gap: int, min_count: int) -> List[Tuple[int, int, int]]:
        """
        Find clusters of locations that are close together.
        
        Args:
            locations: List of offsets
            max_gap: Maximum gap between items in a cluster
            min_count: Minimum items to form a valid cluster
            
        Returns:
            List of (start, end, count) tuples for each cluster
        """
        if not locations:
            return []
        
        locations = sorted(locations)
        clusters = []
        cluster_start = locations[0]
        cluster_end = locations[0]
        count = 1
        
        for i in range(1, len(locations)):
            if locations[i] - cluster_end <= max_gap:
                cluster_end = locations[i]
                count += 1
            else:
                if count >= min_count:
                    clusters.append((cluster_start, cluster_end, count))
                cluster_start = locations[i]
                cluster_end = locations[i]
                count = 1
        
        if count >= min_count:
            clusters.append((cluster_start, cluster_end, count))
        
        return clusters
    
    def analyze_map_structure(self, file_data: bytes, offset: int, size_hint: int = 256) -> Dict[str, Any]:
        """
        Analyze the structure of data at a given offset.
        
        This helps identify map dimensions and data types.
        
        Args:
            file_data: Raw binary data
            offset: Starting offset
            size_hint: How many bytes to analyze
            
        Returns:
            Dictionary with analysis results
        """
        if offset + size_hint > len(file_data):
            size_hint = len(file_data) - offset
        
        data = file_data[offset:offset + size_hint]
        
        # Analyze as 16-bit values
        values_16 = []
        for i in range(0, len(data) - 1, 2):
            values_16.append(struct.unpack('<H', data[i:i+2])[0])
        
        # Calculate statistics
        if values_16:
            min_val = min(values_16)
            max_val = max(values_16)
            avg_val = sum(values_16) / len(values_16)
            
            # Check for common map sizes
            possible_sizes = []
            for rows in [8, 10, 12, 16, 20]:
                for cols in [8, 10, 12, 16, 20]:
                    if rows * cols == len(values_16):
                        possible_sizes.append((rows, cols))
            
            return {
                "offset": offset,
                "byte_count": size_hint,
                "value_count": len(values_16),
                "min_value": min_val,
                "max_value": max_val,
                "avg_value": avg_val,
                "possible_sizes": possible_sizes,
                "likely_map": len(possible_sizes) > 0 and max_val < 65000,
            }
        
        return {"offset": offset, "error": "No data"}
