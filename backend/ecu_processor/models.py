"""
ECU Processing Engine - Data Models
====================================
Pydantic models for ECU definitions, maps, and processing results.
"""

from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class ECUManufacturer(str, Enum):
    BOSCH = "bosch"
    DELPHI = "delphi"
    CONTINENTAL = "continental"
    SIEMENS = "siemens"
    DENSO = "denso"
    MARELLI = "marelli"
    HITACHI = "hitachi"
    TRANSTRON = "transtron"
    CUMMINS = "cummins"
    OTHER = "other"


class MapType(str, Enum):
    DPF_SWITCH = "dpf_switch"           # DPF on/off switch
    DPF_REGEN = "dpf_regen"             # DPF regeneration maps
    DPF_PRESSURE = "dpf_pressure"       # DPF pressure sensor maps
    DPF_TEMPERATURE = "dpf_temperature" # DPF temperature maps
    EGR_FLOW = "egr_flow"               # EGR flow maps
    EGR_POSITION = "egr_position"       # EGR valve position
    EGR_SWITCH = "egr_switch"           # EGR on/off switch
    SCR_DOSING = "scr_dosing"           # AdBlue/SCR dosing maps
    SCR_SWITCH = "scr_switch"           # SCR on/off switch
    NOX_SENSOR = "nox_sensor"           # NOx sensor maps
    LAMBDA = "lambda"                   # Lambda/O2 sensor maps
    DTC_TABLE = "dtc_table"             # DTC error code tables
    TORQUE_LIMITER = "torque_limiter"   # Torque limitation maps
    BOOST_LIMITER = "boost_limiter"     # Boost pressure limits
    FUEL_MAP = "fuel_map"               # Fuel injection maps
    TIMING_MAP = "timing_map"           # Injection timing
    SPEED_LIMITER = "speed_limiter"     # Speed limiter
    CHECKSUM = "checksum"               # Checksum location


class ModificationType(str, Enum):
    DPF_OFF = "dpf_off"
    EGR_OFF = "egr_off"
    ADBLUE_OFF = "adblue_off"
    DTC_OFF = "dtc_off"
    LAMBDA_OFF = "lambda_off"
    SPEED_LIMIT_OFF = "speed_limit_off"
    STAGE1_TUNE = "stage1_tune"
    STAGE2_TUNE = "stage2_tune"
    FLAPS_OFF = "flaps_off"
    START_STOP_OFF = "start_stop_off"
    HOT_START_FIX = "hot_start_fix"


class ChecksumType(str, Enum):
    CRC32 = "crc32"
    CRC16 = "crc16"
    SUM8 = "sum8"
    SUM16 = "sum16"
    SUM32 = "sum32"
    XOR = "xor"
    BOSCH_ME7 = "bosch_me7"
    BOSCH_EDC17 = "bosch_edc17"
    BOSCH_MED17 = "bosch_med17"
    DELPHI_CRC = "delphi_crc"
    DENSO_SUM = "denso_sum"
    CUSTOM = "custom"


class MapDefinition(BaseModel):
    """Definition of a map/table in an ECU file"""
    map_type: MapType
    name: str
    description: str = ""
    
    # Location info
    offset: Optional[int] = None          # Fixed offset (if known)
    search_pattern: Optional[bytes] = None # Pattern to search for
    pattern_offset: int = 0               # Offset from pattern to actual map
    
    # Map structure
    rows: int = 1
    columns: int = 1
    data_size: int = 2                    # Bytes per cell (1, 2, or 4)
    is_signed: bool = False
    byte_order: str = "little"            # little or big endian
    
    # Axis info
    x_axis_offset: Optional[int] = None
    y_axis_offset: Optional[int] = None
    x_axis_size: int = 0
    y_axis_size: int = 0
    
    # Modification info
    off_value: Optional[int] = None       # Value to set for "off"
    zero_fill: bool = False               # Fill entire map with zeros
    
    class Config:
        arbitrary_types_allowed = True


class ModificationRule(BaseModel):
    """Rule for how to modify a specific map type"""
    modification_type: ModificationType
    map_types: List[MapType]              # Maps to modify
    description: str
    
    # Modification method
    set_value: Optional[int] = None       # Set all cells to this value
    multiply_by: Optional[float] = None   # Multiply all cells
    zero_fill: bool = False               # Fill with zeros
    nop_fill: bool = False                # Fill with NOPs (for code)
    custom_handler: Optional[str] = None  # Name of custom handler function
    
    # Related DTCs to remove
    related_dtcs: List[str] = []          # P0xxx codes to remove


class ChecksumAlgorithm(BaseModel):
    """Checksum algorithm definition"""
    checksum_type: ChecksumType
    name: str
    
    # Location
    offset: Optional[int] = None
    search_pattern: Optional[bytes] = None
    
    # Range to calculate
    calc_start: int = 0
    calc_end: Optional[int] = None        # None = end of file
    
    # Algorithm params
    polynomial: Optional[int] = None      # For CRC
    initial_value: int = 0
    xor_out: int = 0
    reflect_in: bool = False
    reflect_out: bool = False
    
    # Multi-block checksums
    blocks: List[Tuple[int, int]] = []    # List of (start, end) ranges
    
    class Config:
        arbitrary_types_allowed = True


class ECUDefinition(BaseModel):
    """Complete definition for an ECU type"""
    id: str                               # Unique ID (e.g., "bosch_edc17c54")
    manufacturer: ECUManufacturer
    family: str                           # e.g., "EDC17"
    variant: str                          # e.g., "C54"
    full_name: str                        # e.g., "Bosch EDC17C54"
    
    # Identification
    identification_patterns: List[bytes] = []
    file_size_range: Tuple[int, int] = (0, 0)  # Min, max file size
    
    # Maps and checksums
    maps: List[MapDefinition] = []
    checksums: List[ChecksumAlgorithm] = []
    
    # Supported modifications
    supported_modifications: List[ModificationType] = []
    modification_rules: List[ModificationRule] = []
    
    # Metadata
    vehicles: List[str] = []              # Compatible vehicles
    notes: str = ""
    verified: bool = False                # Has been tested on real ECU
    
    class Config:
        arbitrary_types_allowed = True


class ProcessingResult(BaseModel):
    """Result of ECU file processing"""
    success: bool
    original_filename: str
    processed_filename: Optional[str] = None
    
    # ECU info
    ecu_id: Optional[str] = None
    ecu_name: Optional[str] = None
    manufacturer: Optional[str] = None
    
    # Processing details
    modifications_applied: List[str] = []
    maps_modified: List[Dict[str, Any]] = []
    dtcs_removed: List[str] = []
    checksum_updated: bool = False
    
    # Errors and warnings
    errors: List[str] = []
    warnings: List[str] = []
    
    # File info
    original_size: int = 0
    processed_size: int = 0
    processing_time_ms: int = 0
    
    # Timestamps
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            bytes: lambda v: v.hex()
        }
