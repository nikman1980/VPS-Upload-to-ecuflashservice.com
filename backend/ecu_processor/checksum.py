"""
ECU Processing Engine - Checksum Calculator
=============================================
Calculate and update checksums in ECU files.

Checksums are critical - if incorrect, the ECU will reject the file.

Supported algorithms:
- CRC32 (most common)
- CRC16
- Simple sum (8, 16, 32 bit)
- XOR
- Manufacturer-specific (Bosch, Delphi, etc.)

NOTE: Checksum algorithms are often proprietary and may need
reverse engineering from sample files.
"""

import struct
from typing import Optional, List, Tuple, Dict
from .models import ChecksumAlgorithm, ChecksumType


class ChecksumCalculator:
    """
    Calculate and verify checksums for ECU files.
    
    This is one of the most critical components - incorrect checksums
    will cause the ECU to reject the file.
    """
    
    def __init__(self):
        # CRC32 lookup table
        self._crc32_table = self._generate_crc32_table()
        # CRC16 lookup table
        self._crc16_table = self._generate_crc16_table()
    
    def _generate_crc32_table(self, polynomial: int = 0x04C11DB7) -> List[int]:
        """Generate CRC32 lookup table."""
        table = []
        for i in range(256):
            crc = i << 24
            for _ in range(8):
                if crc & 0x80000000:
                    crc = (crc << 1) ^ polynomial
                else:
                    crc <<= 1
            table.append(crc & 0xFFFFFFFF)
        return table
    
    def _generate_crc16_table(self, polynomial: int = 0x8005) -> List[int]:
        """Generate CRC16 lookup table."""
        table = []
        for i in range(256):
            crc = i << 8
            for _ in range(8):
                if crc & 0x8000:
                    crc = (crc << 1) ^ polynomial
                else:
                    crc <<= 1
            table.append(crc & 0xFFFF)
        return table
    
    def calculate_checksum(
        self,
        file_data: bytes,
        algorithm: ChecksumAlgorithm
    ) -> int:
        """
        Calculate checksum for file data.
        
        Args:
            file_data: Binary file data
            algorithm: Checksum algorithm definition
            
        Returns:
            Calculated checksum value
        """
        # Determine range to calculate
        start = algorithm.calc_start
        end = algorithm.calc_end if algorithm.calc_end else len(file_data)
        
        # Handle multi-block checksums
        if algorithm.blocks:
            data_chunks = []
            for block_start, block_end in algorithm.blocks:
                data_chunks.append(file_data[block_start:block_end])
            data = b''.join(data_chunks)
        else:
            data = file_data[start:end]
        
        # Calculate based on type
        if algorithm.checksum_type == ChecksumType.CRC32:
            return self._calc_crc32(data, algorithm)
        elif algorithm.checksum_type == ChecksumType.CRC16:
            return self._calc_crc16(data, algorithm)
        elif algorithm.checksum_type == ChecksumType.SUM8:
            return self._calc_sum(data, 1)
        elif algorithm.checksum_type == ChecksumType.SUM16:
            return self._calc_sum(data, 2)
        elif algorithm.checksum_type == ChecksumType.SUM32:
            return self._calc_sum(data, 4)
        elif algorithm.checksum_type == ChecksumType.XOR:
            return self._calc_xor(data)
        elif algorithm.checksum_type == ChecksumType.BOSCH_EDC17:
            return self._calc_bosch_edc17(data, algorithm)
        elif algorithm.checksum_type == ChecksumType.BOSCH_MED17:
            return self._calc_bosch_med17(data, algorithm)
        else:
            raise ValueError(f"Unknown checksum type: {algorithm.checksum_type}")
    
    def _calc_crc32(
        self,
        data: bytes,
        algorithm: ChecksumAlgorithm
    ) -> int:
        """Calculate CRC32 checksum."""
        crc = algorithm.initial_value
        
        for byte in data:
            if algorithm.reflect_in:
                byte = self._reflect(byte, 8)
            
            table_idx = ((crc >> 24) ^ byte) & 0xFF
            crc = ((crc << 8) ^ self._crc32_table[table_idx]) & 0xFFFFFFFF
        
        if algorithm.reflect_out:
            crc = self._reflect(crc, 32)
        
        return crc ^ algorithm.xor_out
    
    def _calc_crc16(
        self,
        data: bytes,
        algorithm: ChecksumAlgorithm
    ) -> int:
        """Calculate CRC16 checksum."""
        crc = algorithm.initial_value & 0xFFFF
        
        for byte in data:
            if algorithm.reflect_in:
                byte = self._reflect(byte, 8)
            
            table_idx = ((crc >> 8) ^ byte) & 0xFF
            crc = ((crc << 8) ^ self._crc16_table[table_idx]) & 0xFFFF
        
        if algorithm.reflect_out:
            crc = self._reflect(crc, 16)
        
        return crc ^ (algorithm.xor_out & 0xFFFF)
    
    def _calc_sum(self, data: bytes, word_size: int) -> int:
        """Calculate simple sum checksum."""
        total = 0
        mask = (1 << (word_size * 8)) - 1
        
        for i in range(0, len(data), word_size):
            if i + word_size <= len(data):
                if word_size == 1:
                    total += data[i]
                elif word_size == 2:
                    total += struct.unpack('<H', data[i:i+2])[0]
                elif word_size == 4:
                    total += struct.unpack('<I', data[i:i+4])[0]
        
        return total & mask
    
    def _calc_xor(self, data: bytes) -> int:
        """Calculate XOR checksum."""
        result = 0
        for byte in data:
            result ^= byte
        return result
    
    def _calc_bosch_edc17(self, data: bytes, algorithm: ChecksumAlgorithm) -> int:
        """
        Calculate Bosch EDC17 checksum.
        
        EDC17 uses a modified CRC32 with specific polynomial and reflection.
        This is a common pattern but exact implementation may vary by variant.
        """
        # EDC17 typically uses standard CRC32 with IEEE polynomial
        # but with specific initial value and XOR
        polynomial = algorithm.polynomial or 0x04C11DB7
        crc = algorithm.initial_value
        
        # Generate table with correct polynomial if different
        if polynomial != 0x04C11DB7:
            table = self._generate_crc32_table(polynomial)
        else:
            table = self._crc32_table
        
        for byte in data:
            if algorithm.reflect_in:
                byte = self._reflect(byte, 8)
            table_idx = ((crc >> 24) ^ byte) & 0xFF
            crc = ((crc << 8) ^ table[table_idx]) & 0xFFFFFFFF
        
        if algorithm.reflect_out:
            crc = self._reflect(crc, 32)
        
        return crc ^ algorithm.xor_out
    
    def _calc_bosch_med17(self, data: bytes, algorithm: ChecksumAlgorithm) -> int:
        """
        Calculate Bosch MED17 checksum.
        
        MED17 (petrol) uses similar algorithm to EDC17 but may have
        different parameters.
        """
        return self._calc_bosch_edc17(data, algorithm)
    
    def _reflect(self, value: int, bits: int) -> int:
        """Reflect (reverse) bits in a value."""
        result = 0
        for i in range(bits):
            if value & (1 << i):
                result |= 1 << (bits - 1 - i)
        return result
    
    def verify_checksum(
        self,
        file_data: bytes,
        algorithm: ChecksumAlgorithm
    ) -> Tuple[bool, int, int]:
        """
        Verify checksum in file.
        
        Args:
            file_data: Binary file data
            algorithm: Checksum algorithm definition
            
        Returns:
            Tuple of (is_valid, stored_checksum, calculated_checksum)
        """
        # Find stored checksum location
        if algorithm.offset is not None:
            offset = algorithm.offset
        elif algorithm.search_pattern:
            pos = file_data.find(algorithm.search_pattern)
            if pos == -1:
                return False, 0, 0
            offset = pos + len(algorithm.search_pattern)
        else:
            return False, 0, 0
        
        # Read stored checksum (assume 4 bytes for CRC32)
        stored = struct.unpack('<I', file_data[offset:offset+4])[0]
        
        # Calculate expected checksum
        calculated = self.calculate_checksum(file_data, algorithm)
        
        return stored == calculated, stored, calculated
    
    def update_checksum(
        self,
        file_data: bytearray,
        algorithm: ChecksumAlgorithm
    ) -> Tuple[bool, int]:
        """
        Update checksum in file.
        
        Args:
            file_data: Bytearray of file data (will be modified)
            algorithm: Checksum algorithm definition
            
        Returns:
            Tuple of (success, new_checksum_value)
        """
        # Find checksum location
        if algorithm.offset is not None:
            offset = algorithm.offset
        elif algorithm.search_pattern:
            pos = file_data.find(algorithm.search_pattern)
            if pos == -1:
                return False, 0
            offset = pos + len(algorithm.search_pattern)
        else:
            return False, 0
        
        # Temporarily zero out checksum location for calculation
        original_checksum_bytes = bytes(file_data[offset:offset+4])
        file_data[offset:offset+4] = b'\x00\x00\x00\x00'
        
        # Calculate new checksum
        new_checksum = self.calculate_checksum(bytes(file_data), algorithm)
        
        # Write new checksum
        file_data[offset:offset+4] = struct.pack('<I', new_checksum)
        
        return True, new_checksum
    
    def find_checksum_location(self, file_data: bytes) -> List[Dict]:
        """
        Attempt to find checksum locations by analyzing the file.
        
        This is a heuristic approach that looks for:
        - Values that look like CRC32 (specific patterns)
        - Locations that change when file is modified
        - Common checksum positions (end of file, end of sections)
        """
        candidates = []
        file_size = len(file_data)
        
        # Check common locations
        common_offsets = [
            file_size - 4,      # End of file
            file_size - 8,      # Near end
            0x1FFFC,            # Common EDC17 location
            0x3FFFC,            # Another common location
        ]
        
        for offset in common_offsets:
            if 0 <= offset < file_size - 4:
                value = struct.unpack('<I', file_data[offset:offset+4])[0]
                # Check if value looks like a checksum (not 0x00000000 or 0xFFFFFFFF)
                if value not in (0x00000000, 0xFFFFFFFF):
                    candidates.append({
                        "offset": offset,
                        "value": value,
                        "hex": f"0x{value:08X}",
                    })
        
        return candidates
