"""
ECU Processing Engine
=====================
Professional ECU file processing for DPF, EGR, AdBlue, DTC removal.

Built for ECU Flash Service - Automated ECU modification system.

Components:
- ECUDefinitionDB: Database of ECU types, maps, and checksums
- MapLocator: Find specific maps in binary ECU files
- MapModifier: Apply modifications (DPF off, EGR off, etc.)
- ChecksumCalculator: Recalculate checksums after modification
- ECUFileProcessor: Main orchestrator for file processing

Supported ECU Families (Initial):
- Bosch EDC17 (most common diesel ECU)
- Bosch EDC16 (older diesel ECU)
- Delphi DCM (common in European vehicles)
- Denso (Toyota, Mazda, etc.) - Detection only initially

Author: ECU Flash Service
Version: 1.0.0
"""

from .models import (
    ECUDefinition,
    MapDefinition,
    ModificationRule,
    ProcessingResult,
    ChecksumAlgorithm,
    ModificationType,
)
from .database import ECUDefinitionDB
from .map_locator import MapLocator
from .map_modifier import MapModifier
from .checksum import ChecksumCalculator
from .processor import ECUFileProcessor

__version__ = "1.0.0"
__all__ = [
    "ECUDefinition",
    "MapDefinition",
    "ModificationRule",
    "ProcessingResult",
    "ChecksumAlgorithm",
    "ModificationType",
    "ECUDefinitionDB",
    "MapLocator",
    "MapModifier",
    "ChecksumCalculator",
    "ECUFileProcessor",
]
