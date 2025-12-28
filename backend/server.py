from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum
import shutil
import json

# Import AI ECU Processor (mock - for fallback)
from ecu_processor import ECUProcessor, ConfidenceLevel

# Import Real ECU Analyzer
from ecu_analyzer import ECUAnalyzer

# Import Email Service
from email_service import send_order_confirmation

# Import TuningFiles API (real ECU processing)
from tuningfiles_api import TuningFilesAPI

# Import NEW ECU Processing Engine (for automated processing)
from ecu_engine import ECUFileProcessor, ECUDefinitionDB, ModificationType as EngineModType

# Import DTC Delete Engine
from dtc_engine import dtc_delete_engine, DTCDatabase


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads and processed directories (relative to server.py location)
UPLOAD_DIR = ROOT_DIR / "uploads"
PROCESSED_DIR = ROOT_DIR / "processed"
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# Initialize AI ECU Processor
ecu_processor = ECUProcessor()

# Initialize NEW ECU Processing Engine
ecu_file_processor = ECUFileProcessor()
ecu_definition_db = ECUDefinitionDB()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Enums
class RequestStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


# Vehicle Database - COMPREHENSIVE list including ALL major brands worldwide
VEHICLE_MAKES = [
    # === PASSENGER VEHICLES & LIGHT TRUCKS (A-Z) ===
    "Abarth", "Acura", "Alfa Romeo", "Aston Martin", "Audi", 
    "Bentley", "BMW", "Bugatti", "Buick", "BYD",
    "Cadillac", "Chery", "Chevrolet", "Chrysler", "Citroen", 
    "Cupra", "Dacia", "Daewoo", "Daihatsu", "Dodge", 
    "DS Automobiles", "Ferrari", "Fiat", "Ford", "Geely",
    "Genesis", "GMC", "Great Wall", "Haval", "Honda", 
    "Hummer", "Hyundai", "Infiniti", "Isuzu", "Jaguar",
    "Jeep", "Kia", "Koenigsegg", "Lada", "Lamborghini",
    "Lancia", "Land Rover", "Lexus", "Lincoln", "Lotus",
    "Maserati", "Maybach", "Mazda", "McLaren", "Mercedes-Benz",
    "MG", "Mini", "Mitsubishi", "Nissan", "Opel",
    "Pagani", "Peugeot", "Plymouth", "Polestar", "Pontiac",
    "Porsche", "Proton", "RAM", "Renault", "Rolls-Royce",
    "Rover", "Saab", "Saturn", "Seat", "Skoda",
    "Smart", "SsangYong", "Subaru", "Suzuki", "Tata",
    "Tesla", "Toyota", "Vauxhall", "Volkswagen", "Volvo",
    
    # === HEAVY DUTY TRUCKS (Commercial/Class 8) ===
    # North American Trucks
    "Peterbilt", "Kenworth", "Freightliner", "Mack", "International", 
    "Western Star", "Autocar", "Oshkosh",
    
    # European Trucks
    "Volvo Trucks", "Scania", "MAN", "DAF", "Iveco", "Renault Trucks",
    "Mercedes-Benz Trucks", "FUSO (Mitsubishi Fuso)",
    
    # Asian Trucks
    "Hino", "Isuzu Trucks", "UD Trucks (Nissan)", "Foton", "Shacman",
    "Sinotruk (HOWO)", "Dongfeng", "FAW", "JAC", "Tata Trucks",
    
    # === BUSES & COACHES ===
    # North American Buses
    "Blue Bird", "Thomas Built Buses", "IC Bus", "Collins Bus",
    "New Flyer", "Gillig", "Nova Bus", "ARBOC",
    "Eldorado National", "Starcraft Bus", "Champion Bus",
    
    # Motor Coaches
    "MCI (Motor Coach Industries)", "Prevost", "Van Hool", 
    "Setra", "Temsa", "ABC Bus Companies",
    
    # European Buses
    "Mercedes-Benz Bus", "Volvo Bus", "Scania Bus", "MAN Bus",
    "Iveco Bus", "VDL Bus & Coach", "Solaris Bus & Coach",
    "Neoplan", "Irizar", "King Long", "Yutong"
]

# Common models by make (subset - can be expanded)
VEHICLE_MODELS = {
    # Pickup Trucks & SUVs
    "Ford": ["F-150", "F-250", "F-250 Super Duty", "F-350", "F-350 Super Duty", "F-450", "F-550", "Transit", "Ranger", "Explorer", "Expedition", "Mustang", "E-Series"],
    "Chevrolet": ["Silverado 1500", "Silverado 2500HD", "Silverado 3500HD", "Colorado", "Tahoe", "Suburban", "Express Van"],
    "Dodge": ["RAM 1500", "RAM 2500", "RAM 3500", "RAM 4500", "RAM 5500", "Durango", "Challenger", "Charger", "Sprinter"],
    "RAM": ["1500", "2500", "3500", "4500", "5500", "ProMaster", "ProMaster City"],
    "GMC": ["Sierra 1500", "Sierra 2500HD", "Sierra 3500HD", "Canyon", "Yukon", "Savana"],
    "Toyota": ["Tundra", "Tacoma", "Hilux", "Land Cruiser", "4Runner", "Camry", "Sequoia"],
    "Nissan": ["Titan", "Titan XD", "Frontier", "NV Cargo", "NV Passenger"],
    "Mercedes-Benz": ["Sprinter", "Vito", "X-Class", "GLE", "GLC", "E-Class", "Actros", "Arocs"],
    "Volkswagen": ["Amarok", "Transporter", "Caddy", "Touareg", "Passat", "Golf", "Crafter"],
    "BMW": ["X3", "X5", "X6", "X7", "3 Series", "5 Series", "7 Series"],
    "Audi": ["A4", "A6", "Q5", "Q7", "Q8", "A3"],
    
    # Heavy Duty Trucks
    "Peterbilt": ["379", "389", "567", "579", "520", "337", "348", "365", "367"],
    "Kenworth": ["W900", "T680", "T880", "T800", "T370", "T270", "T170"],
    "Freightliner": ["Cascadia", "Coronado", "M2 106", "M2 112", "114SD", "122SD", "Business Class"],
    "Mack": ["Anthem", "Pinnacle", "Granite", "TerraPro", "LR"],
    "International": ["LT Series", "RH Series", "HV Series", "HX Series", "MV Series", "CV Series"],
    "Western Star": ["49X", "47X", "57X", "5700XE", "4700"],
    "Volvo Trucks": ["VNL", "VNR", "VHD", "VAH", "VNX"],
    "Scania": ["R Series", "S Series", "P Series", "G Series", "XT Series"],
    "MAN": ["TGX", "TGS", "TGL", "TGM"],
    "DAF": ["XF", "XG", "XG+", "CF", "LF"],
    "Iveco": ["S-Way", "X-Way", "Stralis", "Eurocargo", "Daily"],
    "Hino": ["XL Series", "L Series", "M Series", "195", "268", "338"],
    "Isuzu Trucks": ["F-Series", "N-Series", "NPR", "NQR", "NRR", "FTR", "FVR"],
    "UD Trucks": ["Quon", "Quester", "Croner", "Condor"],
    
    # Buses
    "Blue Bird": ["Vision", "All American", "Micro Bird"],
    "Thomas Built": ["Saf-T-Liner C2", "Saf-T-Liner HDX", "Saf-T-Liner EFX"],
    "IC Bus": ["CE Series", "RE Series", "HC Series"],
    "New Flyer": ["Xcelsior", "XE Series", "XD Series"],
    "Gillig": ["Low Floor", "BRT Plus", "CNG"],
    "MCI (Motor Coach)": ["J4500", "D4505", "D45 CRT LE"],
    "Prevost": ["H3-45", "X3-45", "H Series", "X Series"],
    "Van Hool": ["CX Series", "TX Series", "TDX Series"],
    "Mercedes-Benz Bus": ["Tourismo", "Intouro", "Citaro"],
    "Setra": ["S 515 HD", "S 516 HD", "S 517 HDH", "S 531 DT", "MultiClass"],
    "Neoplan": ["Cityliner", "Tourliner", "Skyliner"],
    "Volvo Bus": ["9700", "9900", "7900", "8900"],
    "Scania Bus": ["Touring", "Interlink", "Citywide"],
    "MAN Bus": ["Lion's Coach", "Lion's City", "Lion's Intercity"]
}

# Service pricing (direct customer prices - no markup)
SERVICE_PRICING = {
    "dtc-single": {
        "base_price": 20.00,
        "name": "DTC Removal (Single Code)"
    },
    "dtc-multiple": {
        "base_price": 50.00,
        "name": "DTC Removal (Multiple Codes)"
    },
    "checksum": {
        "base_price": 10.00,
        "name": "Checksum Correction"
    },
    "egr-removal": {
        "base_price": 50.00,
        "name": "EGR Removal"
    },
    "dpf-removal": {
        "base_price": 248.00,
        "name": "DPF Removal"
    },
    "egr-dpf-combo": {
        "base_price": 248.00,
        "name": "EGR + DPF Combo"
    },
    "adblue-removal": {
        "base_price": 698.00,
        "name": "AdBlue/DEF Removal"
    },
    "immo-off": {
        "base_price": 70.00,
        "name": "Immobilizer Off"
    },
    "decat": {
        "base_price": 40.00,
        "name": "Decat (Cat OFF)"
    },
    "vmax-off": {
        "base_price": 30.00,
        "name": "Speed Limiter OFF"
    },
    "swirl-flap-off": {
        "base_price": 40.00,
        "name": "Swirl Flap OFF"
    },
    "exhaust-flaps": {
        "base_price": 40.00,
        "name": "Exhaust Flaps OFF"
    },
    "nox-off": {
        "base_price": 40.00,
        "name": "NOX Sensor OFF"
    },
    "opf-gpf-off": {
        "base_price": 40.00,
        "name": "OPF/GPF OFF"
    },
    "maf-off": {
        "base_price": 40.00,
        "name": "MAF Sensor OFF"
    },
    "cold-start-off": {
        "base_price": 40.00,
        "name": "Cold Start Noise OFF"
    },
    "start-stop-off": {
        "base_price": 40.00,
        "name": "Start & Stop OFF"
    },
    "cylinder-demand-off": {
        "base_price": 40.00,
        "name": "Cylinder On Demand OFF"
    }
}

MARKUP_PERCENTAGE = 0  # No markup - direct pricing


# Define Models
class Service(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    base_price: float
    final_price: float  # With 25% markup


class VehicleDatabase(BaseModel):
    makes: List[str]
    models: dict


class PricingBreakdown(BaseModel):
    service_id: str
    service_name: str
    base_price: float
    markup_percentage: float
    markup_amount: float
    final_price: float


class ServiceRequestCreate(BaseModel):
    # Customer Information
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    
    # Vehicle Information (now with dropdowns)
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    engine_type: str
    ecu_type: Optional[str] = None
    vin: Optional[str] = None
    
    # Service Details
    selected_services: List[str]  # List of service IDs
    issues_description: Optional[str] = None
    additional_notes: Optional[str] = None


class ServiceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Customer Information
    customer_name: str
    customer_email: str
    customer_phone: str
    
    # Vehicle Information
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    engine_type: str
    ecu_type: Optional[str] = None
    vin: Optional[str] = None
    
    # Service Details
    selected_services: List[str]
    issues_description: Optional[str] = None
    additional_notes: Optional[str] = None
    
    # File Upload
    uploaded_files: List[dict] = []  # [{"filename": "...", "filepath": "...", "size": ...}]
    
    # Pricing
    base_total: float = 0.0
    markup_amount: float = 0.0
    total_price: float = 0.0
    pricing_breakdown: List[dict] = []
    
    # Payment
    payment_status: PaymentStatus = PaymentStatus.PENDING
    paypal_order_id: Optional[str] = None
    paypal_transaction_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    
    # AI Processing
    processing_status: str = "pending"  # pending, analyzing, processing, completed, failed
    ai_confidence: Optional[float] = None
    confidence_level: Optional[str] = None  # high, medium, low, very_low
    detected_ecu_type: Optional[str] = None
    processing_warnings: List[str] = []
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processed_files: List[dict] = []  # Processed ECU files ready for download
    
    # Status and Timestamps
    status: RequestStatus = RequestStatus.PENDING_PAYMENT
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusUpdate(BaseModel):
    status: RequestStatus


class PaymentUpdate(BaseModel):
    paypal_order_id: str
    paypal_transaction_id: Optional[str] = None
    payment_status: PaymentStatus


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    orderNumber: Optional[str] = None
    message: str


# Helper function to calculate pricing
def calculate_pricing(service_ids: List[str]) -> dict:
    base_total = 0.0
    breakdown = []
    
    # Check for EGR + DPF combo
    has_egr = "egr-removal" in service_ids
    has_dpf = "dpf-removal" in service_ids
    
    # If both EGR and DPF selected, use combo pricing
    if has_egr and has_dpf:
        # Remove individual services and add combo
        service_ids = [s for s in service_ids if s not in ["egr-removal", "dpf-removal"]]
        if "egr-dpf-combo" not in service_ids:
            service_ids.append("egr-dpf-combo")
    
    for service_id in service_ids:
        if service_id in SERVICE_PRICING:
            service_info = SERVICE_PRICING[service_id]
            price = service_info["base_price"]
            base_total += price
            
            breakdown.append({
                "service_id": service_id,
                "service_name": service_info["name"],
                "base_price": price,
                "markup_percentage": 0,
                "markup_amount": 0.0,
                "final_price": price
            })
    
    # Check for DTC options - only allow one
    dtc_services = [s for s in service_ids if s.startswith("dtc-")]
    if len(dtc_services) > 1:
        # Remove single if multiple is present
        if "dtc-multiple" in dtc_services:
            service_ids = [s for s in service_ids if s != "dtc-single"]
        
        # Recalculate
        base_total = 0.0
        breakdown = []
        for service_id in service_ids:
            if service_id in SERVICE_PRICING:
                service_info = SERVICE_PRICING[service_id]
                price = service_info["base_price"]
                base_total += price
                
                breakdown.append({
                    "service_id": service_id,
                    "service_name": service_info["name"],
                    "base_price": price,
                    "markup_percentage": 0,
                    "markup_amount": 0.0,
                    "final_price": price
                })
    
    return {
        "base_total": base_total,
        "markup_amount": 0.0,
        "total_price": base_total,
        "pricing_breakdown": breakdown
    }


# Services catalog with pricing
# 100% markup applied - base_price is customer price, cost_price is our cost
MARKUP_PERCENTAGE = 100  # 100% markup

AVAILABLE_SERVICES = [
    {
        "id": "dtc-single",
        "name": "DTC Removal (Single Code)",
        "description": "Remove one diagnostic trouble code from ECU file.",
        "icon": "🔍",
        "base_price": 20.00,
        "final_price": 20.00,
        "cost_price": 10.00,
        "category": "diagnostics"
    },
    {
        "id": "dtc-multiple",
        "name": "DTC Removal (Multiple Codes)",
        "description": "Remove all diagnostic trouble codes from ECU file.",
        "icon": "✓",
        "base_price": 50.00,
        "final_price": 50.00,
        "cost_price": 25.00,
        "category": "diagnostics"
    },
    {
        "id": "checksum",
        "name": "Checksum Correction",
        "description": "Automatic checksum recalculation for modified files.",
        "icon": "♻️",
        "base_price": 10.00,
        "final_price": 10.00,
        "cost_price": 5.00,
        "category": "utility"
    },
    {
        "id": "egr-removal",
        "name": "EGR Removal",
        "description": "Exhaust Gas Recirculation system removal.",
        "icon": "🚫",
        "base_price": 50.00,
        "final_price": 50.00,
        "cost_price": 25.00,
        "category": "emissions"
    },
    {
        "id": "dpf-removal",
        "name": "DPF Removal",
        "description": "Diesel particulate filter removal.",
        "icon": "💥",
        "base_price": 248.00,
        "final_price": 248.00,
        "cost_price": 124.00,
        "category": "emissions"
    },
    {
        "id": "egr-dpf-combo",
        "name": "EGR + DPF Combo",
        "description": "Best deal! Remove both EGR and DPF together.",
        "icon": "💧",
        "base_price": 248.00,
        "final_price": 248.00,
        "cost_price": 124.00,
        "is_combo": True,
        "category": "emissions"
    },
    {
        "id": "adblue-removal",
        "name": "AdBlue/DEF Removal",
        "description": "Complete AdBlue/DEF system removal. DCU data may be required.",
        "icon": "🔓",
        "base_price": 698.00,
        "final_price": 698.00,
        "cost_price": 349.00,
        "category": "emissions"
    },
    {
        "id": "immo-off",
        "name": "Immobilizer Off",
        "description": "Disable vehicle immobilizer.",
        "icon": "🔥",
        "base_price": 70.00,
        "final_price": 70.00,
        "cost_price": 35.00,
        "category": "security"
    },
    {
        "id": "decat",
        "name": "Decat (Cat OFF)",
        "description": "Catalytic converter removal and disable.",
        "icon": "🚀",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "vmax-off",
        "name": "Speed Limiter OFF",
        "description": "Remove speed limiter for maximum velocity.",
        "icon": "🌀",
        "base_price": 30.00,
        "final_price": 30.00,
        "cost_price": 15.00,
        "category": "performance"
    },
    {
        "id": "swirl-flap-off",
        "name": "Swirl Flap OFF",
        "description": "Disable intake manifold swirl flaps.",
        "icon": "💨",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "intake"
    },
    {
        "id": "exhaust-flaps",
        "name": "Exhaust Flaps OFF",
        "description": "Disable exhaust valve flaps.",
        "icon": "🌫️",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "exhaust"
    },
    {
        "id": "nox-off",
        "name": "NOX Sensor OFF",
        "description": "Disable NOx sensor and system.",
        "icon": "🏭",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "opf-gpf-off",
        "name": "OPF/GPF OFF",
        "description": "Petrol particulate filter removal.",
        "icon": "📊",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "maf-off",
        "name": "MAF Sensor OFF",
        "description": "Mass Air Flow sensor delete.",
        "icon": "❄️",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "sensors"
    },
    {
        "id": "cold-start-off",
        "name": "Cold Start Noise OFF",
        "description": "Disable cold start noise reduction.",
        "icon": "🔄",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "comfort"
    },
    {
        "id": "start-stop-off",
        "name": "Start & Stop OFF",
        "description": "Disable automatic start-stop system.",
        "icon": "⚡",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "comfort"
    },
    {
        "id": "cylinder-demand-off",
        "name": "Cylinder On Demand OFF",
        "description": "Disable cylinder deactivation system.",
        "icon": "🔧",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "performance"
    }
]


# Routes
@api_router.get("/")
async def root():
    return {"message": "DPF AdBlue Removal Service API with File Upload & Payment"}


@api_router.get("/services", response_model=List[Service])
async def get_services():
    """Get all available services with pricing"""
    return AVAILABLE_SERVICES


@api_router.get("/vehicles")
async def get_vehicle_database():
    """Get vehicle makes and models database"""
    return {
        "makes": VEHICLE_MAKES,
        "models": VEHICLE_MODELS
    }


@api_router.post("/calculate-price")
async def calculate_price(service_ids: List[str]):
    """Calculate price for selected services with 25% markup"""
    return calculate_pricing(service_ids)


@api_router.post("/analyze-and-process-file")
async def analyze_and_process_file(file: UploadFile = File(...)):
    """
    Analyze ECU file and return available services
    Uses real ECU analyzer to detect manufacturer and ECU type
    """
    try:
        # Read file
        file_data = await file.read()
        
        # Validate file extension
        allowed_extensions = [".bin", ".hex", ".ecu", ".ori", ".mod", ".frf", ".sgm"]
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Only ECU files ({', '.join(allowed_extensions)}) are allowed."
            )
        
        # Generate file ID and save original file
        file_id = str(uuid.uuid4())
        original_filename = f"{file_id}_original{file_ext}"
        original_filepath = UPLOAD_DIR / original_filename
        
        with open(original_filepath, "wb") as f:
            f.write(file_data)
        
        # Use real ECU Analyzer
        analyzer = ECUAnalyzer()
        analyzer.analyze(file_data)
        display_info = analyzer.get_display_info()
        
        # Get detected services from analyzer
        detected_services = display_info.get('available_services', [])
        
        # Define all possible services with CORRECT pricing (matching SERVICE_PRICING)
        all_services = {
            "dpf_off": {"service_name": "DPF Removal", "price": 248.0},
            "egr_off": {"service_name": "EGR Removal", "price": 50.0},
            "dpf_egr_off": {"service_name": "DPF & EGR Combo", "price": 248.0},  # Combo deal
            "adblue_off": {"service_name": "AdBlue/SCR Removal", "price": 698.0},
            "dtc_off": {"service_name": "DTC/Error Code Removal", "price": 50.0},
            "lambda_off": {"service_name": "Lambda/O2 Sensor Removal", "price": 50.0},
            "cat_off": {"service_name": "Catalyst Removal", "price": 50.0},
            "speed_limiter": {"service_name": "Speed Limiter Removal", "price": 50.0},
            "start_stop_off": {"service_name": "Start/Stop Disable", "price": 50.0},
            "swirl_off": {"service_name": "Swirl Flaps Removal", "price": 50.0},
            "hot_start": {"service_name": "Hot Start Fix / Immo", "price": 70.0},
            "stage_tuning": {"service_name": "Stage 1/2 Tuning", "price": 248.0},
        }
        
        # Check if DPF was detected
        dpf_detected = any(s.get('service_id') == 'dpf_off' for s in detected_services)
        egr_detected = any(s.get('service_id') == 'egr_off' for s in detected_services)
        
        dpf_confidence = "low"
        dpf_indicators = []
        egr_confidence = "low"
        egr_indicators = []
        
        for s in detected_services:
            if s.get('service_id') == 'dpf_off':
                dpf_confidence = s.get('confidence', 'low')
                dpf_indicators = s.get('indicators', [])
            if s.get('service_id') == 'egr_off':
                egr_confidence = s.get('confidence', 'low')
                egr_indicators = s.get('indicators', [])
        
        # Build available options - ONLY show what was actually detected
        available_options = []
        
        # Add DPF if detected
        if dpf_detected:
            available_options.append({
                "service_id": "dpf_off",
                "service_name": all_services["dpf_off"]["service_name"],
                "price": all_services["dpf_off"]["price"],
                "file_id": f"{file_id}_dpf_off",
                "detected": True,
                "confidence": dpf_confidence,
                "indicators": dpf_indicators
            })
        
        # Add EGR if detected
        if egr_detected:
            available_options.append({
                "service_id": "egr_off",
                "service_name": all_services["egr_off"]["service_name"],
                "price": all_services["egr_off"]["price"],
                "file_id": f"{file_id}_egr_off",
                "detected": True,
                "confidence": egr_confidence,
                "indicators": egr_indicators
            })
        
        # Add DPF & EGR Combo only if BOTH are detected
        if dpf_detected and egr_detected:
            combo_confidence = min(dpf_confidence, egr_confidence, key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x, 3))
            available_options.append({
                "service_id": "dpf_egr_off",
                "service_name": all_services["dpf_egr_off"]["service_name"],
                "price": all_services["dpf_egr_off"]["price"],
                "file_id": f"{file_id}_dpf_egr_off",
                "detected": True,
                "confidence": combo_confidence,
                "indicators": ["DPF + EGR both detected in file"]
            })
        
        # Add other detected services
        for detected_svc in detected_services:
            service_id = detected_svc.get('service_id', '')
            # Skip DPF and EGR as they're handled above
            if service_id in ['dpf_off', 'egr_off']:
                continue
            if service_id in all_services:
                svc_info = all_services[service_id]
                available_options.append({
                    "service_id": service_id,
                    "service_name": svc_info["service_name"],
                    "price": svc_info["price"],
                    "file_id": f"{file_id}_{service_id}",
                    "detected": True,
                    "confidence": detected_svc.get('confidence', 'low'),
                    "indicators": detected_svc.get('indicators', [])
                })
        
        # Sort: DPF/EGR/Combo first (by service_id), then by confidence
        def sort_key(x):
            # Priority order for DPF-related services
            priority = {
                "dpf_off": 0,
                "egr_off": 1, 
                "dpf_egr_off": 2
            }
            service_priority = priority.get(x.get('service_id', ''), 10)
            confidence_order = {"high": 0, "medium": 1, "low": 2}
            conf_priority = confidence_order.get(x.get('confidence', 'low'), 3)
            return (service_priority, conf_priority)
        
        available_options.sort(key=sort_key)
        
        # Build ECU info string
        ecu_info = display_info['ecu_type']
        if display_info['manufacturer'] and display_info['manufacturer'] != 'Unknown':
            if display_info['manufacturer'] not in ecu_info:
                ecu_info = f"{display_info['manufacturer']} - {ecu_info}"
        
        # Add metadata if found
        metadata = {}
        if display_info.get('calibration_id'):
            metadata['calibration_id'] = display_info['calibration_id']
        if display_info.get('software_version'):
            metadata['software_version'] = display_info['software_version']
        if display_info.get('part_number'):
            metadata['part_number'] = display_info['part_number']
        if display_info.get('vin'):
            metadata['vin'] = display_info['vin']
        if display_info.get('strings'):
            metadata['strings'] = display_info['strings']
        
        return {
            "success": True,
            "file_id": file_id,
            "original_filename": file.filename,
            "file_size_mb": display_info['file_size_mb'],
            "detected_ecu": display_info['ecu_type'],
            "detected_manufacturer": display_info['manufacturer'],
            "metadata": metadata,
            "available_options": available_options,
            "detected_maps": display_info.get('detected_maps', {}),
            "total_services_detected": len(available_options),
            "message": f"File analyzed! {len(available_options)} service(s) detected based on ECU content."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing file: {e}")
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")


@api_router.post("/purchase-processed-file")
async def purchase_processed_file(
    background_tasks: BackgroundTasks,
    file_id: str = Form(...),
    selected_services: str = Form(...),  # JSON string of service IDs
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    vehicle_info: str = Form(...),  # JSON string
    dtc_codes: str = Form("{}"),  # JSON string with DTC codes
    paypal_order_id: str = Form(...),
    paypal_transaction_id: str = Form(None)
):
    """
    STEP 2: Customer pays for selected processed files
    - Creates order in database
    - Uploads file to Sedox/TuningFiles
    - Creates tuning project
    - Starts background polling for completion
    - Returns order confirmation
    """
    from sedox_integration import sedox_client, poll_sedox_project
    
    try:
        selected_service_ids = json.loads(selected_services)
        vehicle_data = json.loads(vehicle_info)
        dtc_data = json.loads(dtc_codes) if dtc_codes else {}
        
        # Calculate total price
        total_price = 0.0
        purchased_services = []
        
        for service_id in selected_service_ids:
            if service_id in SERVICE_PRICING:
                price = SERVICE_PRICING[service_id]["base_price"]
                total_price += price
                service_info = {
                    "service_id": service_id,
                    "service_name": SERVICE_PRICING[service_id]["name"],
                    "price": price
                }
                # Add DTC codes to the service info if applicable
                if service_id in ['dtc-single', 'dtc-multiple'] and dtc_data.get('dtc_codes'):
                    service_info['dtc_codes'] = dtc_data['dtc_codes']
                purchased_services.append(service_info)
        
        # Create order record
        order_id = str(uuid.uuid4())
        order_doc = {
            "id": order_id,
            "file_id": file_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "vehicle_make": vehicle_data.get("vehicle_make"),
            "vehicle_model": vehicle_data.get("vehicle_model"),
            "vehicle_year": vehicle_data.get("vehicle_year"),
            "purchased_services": purchased_services,
            "dtc_codes": dtc_data.get('dtc_codes', []),  # Store DTC codes separately too
            "dtc_type": dtc_data.get('dtc_type'),  # 'single' or 'multiple'
            "total_price": total_price,
            "paypal_order_id": paypal_order_id,
            "paypal_transaction_id": paypal_transaction_id,
            "payment_status": "completed",
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "download_links": selected_service_ids,
            "processing_status": "pending",  # Will be updated by Sedox
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order_doc)
        
        # ==================== SEDOX INTEGRATION ====================
        sedox_project_id = None
        sedox_file_id = None
        
        try:
            # Find the original uploaded file
            original_file_pattern = f"{file_id}_original*"
            matching_files = list(UPLOAD_DIR.glob(original_file_pattern))
            
            if matching_files:
                original_file_path = str(matching_files[0])
                
                # Upload file to Sedox
                logger.info(f"Uploading file to Sedox for order {order_id}")
                upload_result = await sedox_client.upload_file(original_file_path)
                sedox_file_id = upload_result.get("id")
                
                # Create tuning project on Sedox
                logger.info(f"Creating Sedox project for order {order_id}")
                project_result = await sedox_client.create_tuning_project(
                    sedox_file_id=sedox_file_id,
                    vehicle_make=vehicle_data.get("vehicle_make", "Unknown"),
                    vehicle_model=vehicle_data.get("vehicle_model", "Unknown"),
                    vehicle_year=int(vehicle_data.get("vehicle_year", 2020)),
                    services=selected_service_ids,
                    dtc_codes=dtc_data.get('dtc_codes', []),
                    order_id=order_id
                )
                
                sedox_project_id = project_result.get("id")
                
                # Update order with Sedox info
                await db.orders.update_one(
                    {"id": order_id},
                    {
                        "$set": {
                            "sedox_project_id": sedox_project_id,
                            "sedox_file_id": sedox_file_id,
                            "processing_status": "submitted_to_sedox",
                            "sedox_submitted_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Start background polling for completion
                background_tasks.add_task(
                    poll_sedox_project,
                    project_id=sedox_project_id,
                    order_id=order_id,
                    db=db
                )
                
                logger.info(f"Sedox project {sedox_project_id} created for order {order_id}")
                
        except Exception as sedox_error:
            logger.error(f"Sedox integration error: {sedox_error}")
            # Update order to show Sedox failed
            await db.orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "processing_status": "sedox_error",
                        "sedox_error": str(sedox_error)
                    }
                }
            )
        
        # ==================== END SEDOX INTEGRATION ====================
        
        # Send order received email (not completion - that comes later)
        try:
            email_sent = send_order_confirmation(
                customer_email=customer_email,
                customer_name=customer_name,
                order_id=order_id,
                order_details={
                    "file_id": file_id,
                    "purchased_services": purchased_services,
                    "total_price": total_price,
                    "vehicle_make": vehicle_data.get("vehicle_make"),
                    "vehicle_model": vehicle_data.get("vehicle_model"),
                    "vehicle_year": vehicle_data.get("vehicle_year"),
                    "dtc_codes": dtc_data.get('dtc_codes', []),
                    "download_links": [],  # Empty for now - will be sent when ready
                    "processing_status": "processing",
                    "estimated_time": "20-60 minutes"
                }
            )
            logger.info(f"Order received email sent: {email_sent} for order {order_id}")
        except Exception as email_error:
            logger.error(f"Failed to send email: {email_error}")
        
        # Return order confirmation
        return {
            "success": True,
            "order_id": order_id,
            "processing_status": "submitted",
            "sedox_project_id": sedox_project_id,
            "message": "Your file has been submitted for processing. You will receive an email when it's ready (typically 20-60 minutes).",
            "estimated_time": "20-60 minutes",
            "total_paid": total_price
        }
        
    except Exception as e:
        logger.error(f"Error creating purchase: {e}")
        raise HTTPException(status_code=500, detail=f"Purchase failed: {str(e)}")


@api_router.get("/order-status/{order_id}")
async def get_order_status(order_id: str):
    """
    Get order processing status
    Customer can use this to check if their file is ready
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    processing_status = order.get("processing_status", "unknown")
    
    response = {
        "order_id": order_id,
        "processing_status": processing_status,
        "payment_status": order.get("payment_status"),
        "created_at": order.get("created_at"),
        "vehicle": f"{order.get('vehicle_year', '')} {order.get('vehicle_make', '')} {order.get('vehicle_model', '')}".strip(),
        "services": [s.get("service_name") for s in order.get("purchased_services", [])],
        "total_paid": order.get("total_price", 0)
    }
    
    if processing_status == "completed":
        response["download_ready"] = True
        response["download_url"] = f"/api/download-order/{order_id}"
        response["message"] = "Your processed file is ready for download!"
    elif processing_status == "submitted_to_sedox":
        response["download_ready"] = False
        response["message"] = "Your file is being processed. Please check back in 20-60 minutes."
    elif processing_status == "sedox_error":
        response["download_ready"] = False
        response["message"] = "There was an error processing your file. Please contact support."
    elif processing_status == "timeout":
        response["download_ready"] = False
        response["message"] = "Processing is taking longer than expected. Please contact support."
    else:
        response["download_ready"] = False
        response["message"] = "Your order is being processed."
    
    return response


class CreateOrderRequest(BaseModel):
    file_id: str
    services: List[str]
    total_amount: float
    vehicle_info: dict
    customer_email: str
    customer_name: str
    payment_status: str = "pending"
    paypal_order_id: Optional[str] = None
    paypal_transaction_id: Optional[str] = None


@api_router.post("/orders")
async def create_order_json(request: CreateOrderRequest):
    """
    Create an order via JSON (used by Skip Payment and other flows)
    """
    try:
        order_id = str(uuid.uuid4())
        
        # Build services info
        purchased_services = []
        total_price = 0.0
        for service_id in request.services:
            if service_id in SERVICE_PRICING:
                price = SERVICE_PRICING[service_id]["base_price"]
                total_price += price
                purchased_services.append({
                    "service_id": service_id,
                    "service_name": SERVICE_PRICING[service_id]["name"],
                    "price": price
                })
        
        # Create order document
        order_doc = {
            "id": order_id,
            "file_id": request.file_id,
            "customer_name": request.customer_name,
            "customer_email": request.customer_email.lower().strip(),
            "vehicle_make": request.vehicle_info.get("vehicle_make") or request.vehicle_info.get("manufacturer"),
            "vehicle_model": request.vehicle_info.get("vehicle_model") or request.vehicle_info.get("model"),
            "vehicle_year": request.vehicle_info.get("vehicle_year") or request.vehicle_info.get("year"),
            "vehicle_engine": request.vehicle_info.get("engine"),
            "vehicle_ecu": request.vehicle_info.get("ecu"),
            "vehicle_type": request.vehicle_info.get("type"),
            "purchased_services": purchased_services,
            "total_price": request.total_amount or total_price,
            "paypal_order_id": request.paypal_order_id,
            "paypal_transaction_id": request.paypal_transaction_id,
            "payment_status": request.payment_status,
            "payment_date": datetime.now(timezone.utc).isoformat() if request.payment_status in ["completed", "test_completed"] else None,
            "processing_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order_doc)
        
        logger.info(f"Order created: {order_id} for {request.customer_email}")
        
        return {
            "success": True,
            "order_id": order_id,
            "message": "Order created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@api_router.get("/order-status-check/{order_id}")
async def get_order_status_check(order_id: str):
    """
    Get order processing status (alternative endpoint)
    Customer can use this to check if their file is ready
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    processing_status = order.get("processing_status", "unknown")
    
    response = {
        "order_id": order_id,
        "processing_status": processing_status,
        "payment_status": order.get("payment_status"),
        "created_at": order.get("created_at"),
        "vehicle": f"{order.get('vehicle_year', '')} {order.get('vehicle_make', '')} {order.get('vehicle_model', '')}".strip(),
        "services": [s.get("service_name") for s in order.get("purchased_services", [])],
        "total_paid": order.get("total_price", 0)
    }
    
    if processing_status == "completed":
        response["download_ready"] = True
        response["download_url"] = f"/api/download-order/{order_id}"
        response["message"] = "Your processed file is ready for download!"
    elif processing_status == "submitted_to_sedox":
        response["download_ready"] = False
        response["message"] = "Your file is being processed. Please check back in 20-60 minutes."
    elif processing_status == "sedox_error":
        response["download_ready"] = False
        response["message"] = "There was an error processing your file. Please contact support."
    elif processing_status == "timeout":
        response["download_ready"] = False
        response["message"] = "Processing is taking longer than expected. Please contact support."
    else:
        response["download_ready"] = False
        response["message"] = "Your order is being processed."
    
    return response


@api_router.get("/download-order/{order_id}")
async def download_order_file(order_id: str):
    """
    Download processed file by order ID
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("processing_status") != "completed":
        raise HTTPException(status_code=400, detail="File is not ready yet. Please check order status.")
    
    processed_file_path = order.get("processed_file_path")
    
    if not processed_file_path or not Path(processed_file_path).exists():
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    filename = order.get("processed_filename", f"processed_{order_id}.bin")
    
    return FileResponse(
        path=processed_file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@api_router.get("/download-purchased/{file_id}/{service_id}")
async def download_purchased_file(file_id: str, service_id: str):
    """Download purchased processed file"""
    
    # Verify purchase
    order = await db.orders.find_one({
        "file_id": file_id,
        "download_links": service_id,
        "payment_status": "completed"
    })
    
    if not order:
        raise HTTPException(status_code=403, detail="File not purchased or payment not completed")
    
    # Find file
    file_pattern = f"{file_id}_{service_id}*"
    matching_files = list(PROCESSED_DIR.glob(file_pattern))
    
    if not matching_files:
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    filepath = matching_files[0]
    
    return FileResponse(
        path=filepath,
        filename=f"processed_{service_id}{filepath.suffix}",
        media_type="application/octet-stream"
    )


@api_router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Upload ECU file - only accepts .bin, .hex, .ecu, .ori, .mod files"""
    
    # Validate file extension
    allowed_extensions = [".bin", ".hex", ".ecu", ".ori", ".mod"]
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only ECU files ({', '.join(allowed_extensions)}) are allowed."
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = filepath.stat().st_size
        
        return {
            "success": True,
            "file_id": file_id,
            "original_filename": file.filename,
            "stored_filename": filename,
            "filepath": str(filepath),
            "size": file_size,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@api_router.post("/service-requests", response_model=ServiceRequest)
async def create_service_request(
    request_data: str = Form(...),
    files: List[UploadFile] = File(None)
):
    """Create a new service request with file uploads"""
    
    # Parse request data
    request_dict = json.loads(request_data)
    
    # Calculate pricing
    pricing = calculate_pricing(request_dict["selected_services"])
    request_dict.update(pricing)
    
    # Handle file uploads
    uploaded_files = []
    if files:
        for file in files:
            # Validate file extension
            allowed_extensions = [".bin", ".hex", ".ecu", ".ori", ".mod"]
            file_ext = Path(file.filename).suffix.lower()
            
            if file_ext not in allowed_extensions:
                continue  # Skip invalid files
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            filename = f"{file_id}{file_ext}"
            filepath = UPLOAD_DIR / filename
            
            # Save file
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append({
                "file_id": file_id,
                "original_filename": file.filename,
                "stored_filename": filename,
                "filepath": str(filepath),
                "size": filepath.stat().st_size,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            })
    
    request_dict["uploaded_files"] = uploaded_files
    
    # Create service request object
    request_obj = ServiceRequest(**request_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = request_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('payment_date'):
        doc['payment_date'] = doc['payment_date'].isoformat()
    
    await db.service_requests.insert_one(doc)
    return request_obj


@api_router.get("/service-requests", response_model=List[ServiceRequest])
async def get_service_requests():
    """Get all service requests (Admin endpoint)"""
    requests = await db.service_requests.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for req in requests:
        if isinstance(req['created_at'], str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req['updated_at'], str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
        if req.get('payment_date') and isinstance(req['payment_date'], str):
            req['payment_date'] = datetime.fromisoformat(req['payment_date'])
    
    # Sort by created_at descending (newest first)
    requests.sort(key=lambda x: x['created_at'], reverse=True)
    
    return requests


@api_router.get("/service-requests/{request_id}", response_model=ServiceRequest)
async def get_service_request(request_id: str):
    """Get a specific service request by ID"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Convert ISO string timestamps back to datetime objects
    if isinstance(request['created_at'], str):
        request['created_at'] = datetime.fromisoformat(request['created_at'])
    if isinstance(request['updated_at'], str):
        request['updated_at'] = datetime.fromisoformat(request['updated_at'])
    if request.get('payment_date') and isinstance(request['payment_date'], str):
        request['payment_date'] = datetime.fromisoformat(request['payment_date'])
    
    return request


@api_router.patch("/service-requests/{request_id}/status", response_model=ServiceRequest)
async def update_service_request_status(request_id: str, status_update: StatusUpdate):
    """Update the status of a service request"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Update the status and updated_at timestamp
    updated_at = datetime.now(timezone.utc).isoformat()
    
    await db.service_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status_update.status, "updated_at": updated_at}}
    )
    
    # Fetch and return the updated request
    updated_request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    # Convert ISO string timestamps back to datetime objects
    if isinstance(updated_request['created_at'], str):
        updated_request['created_at'] = datetime.fromisoformat(updated_request['created_at'])
    if isinstance(updated_request['updated_at'], str):
        updated_request['updated_at'] = datetime.fromisoformat(updated_request['updated_at'])
    if updated_request.get('payment_date') and isinstance(updated_request['payment_date'], str):
        updated_request['payment_date'] = datetime.fromisoformat(updated_request['payment_date'])
    
    return updated_request


@api_router.patch("/service-requests/{request_id}/payment")
async def update_payment_status(request_id: str, payment_update: PaymentUpdate, background_tasks: BackgroundTasks):
    """Update payment status after PayPal payment"""
    from email_service import send_admin_new_order_notification
    
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Update payment information
    updated_at = datetime.now(timezone.utc).isoformat()
    payment_date = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "payment_status": payment_update.payment_status,
        "paypal_order_id": payment_update.paypal_order_id,
        "updated_at": updated_at
    }
    
    if payment_update.paypal_transaction_id:
        update_data["paypal_transaction_id"] = payment_update.paypal_transaction_id
    
    if payment_update.payment_status == PaymentStatus.COMPLETED:
        update_data["payment_date"] = payment_date
        update_data["status"] = RequestStatus.PAID
        
        # Send admin notification for new paid order
        background_tasks.add_task(
            send_admin_new_order_notification,
            order_id=request_id,
            customer_name=request.get("customer_name", "Customer"),
            customer_email=request.get("customer_email", ""),
            order_details=request
        )
        
        # Note: Removed automatic AI processing - admin will manually process
        # background_tasks.add_task(process_ecu_files_background, request_id)
    
    await db.service_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Payment status updated"}


@api_router.get("/download-file/{request_id}/{file_id}")
async def download_file(request_id: str, file_id: str):
    """Download uploaded ECU file (Admin only)"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Find the file
    file_info = None
    for file in request.get("uploaded_files", []):
        if file["file_id"] == file_id:
            file_info = file
            break
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    filepath = Path(file_info["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=filepath,
        filename=file_info["original_filename"],
        media_type="application/octet-stream"
    )


@api_router.get("/download-processed/{request_id}/{file_id}")
async def download_processed_file(request_id: str, file_id: str):
    """Download processed ECU file"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Find the processed file
    file_info = None
    for file in request.get("processed_files", []):
        if file["file_id"] == file_id:
            file_info = file
            break
    
    if not file_info:
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    filepath = Path(file_info["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=filepath,
        filename=file_info["processed_filename"],
        media_type="application/octet-stream"
    )


@api_router.post("/admin/upload-processed/{request_id}")
async def admin_upload_processed_file(
    request_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Admin endpoint to upload manually processed ECU file and notify customer"""
    from email_service import send_file_ready_notification
    
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Generate file ID and save file
    file_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_ext = Path(file.filename).suffix
    processed_filename = f"processed_{request_id[:8]}_{timestamp}{original_ext}"
    filepath = PROCESSED_DIR / processed_filename
    
    # Save the uploaded file
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_size = len(content)
    
    # Create processed file info
    processed_file_info = {
        "file_id": file_id,
        "processed_filename": processed_filename,
        "original_filename": file.filename,
        "filepath": str(filepath),
        "file_size": file_size,
        "processed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update database
    updated_at = datetime.now(timezone.utc).isoformat()
    download_url = f"/api/download-processed/{request_id}/{file_id}"
    
    await db.service_requests.update_one(
        {"id": request_id},
        {
            "$push": {"processed_files": processed_file_info},
            "$set": {
                "status": RequestStatus.COMPLETED,
                "processing_status": "completed",
                "processing_complete": True,
                "completed_at": updated_at,
                "updated_at": updated_at,
                "download_url": download_url
            }
        }
    )
    
    # Send email notification to customer
    customer_email = request.get("customer_email")
    customer_name = request.get("customer_name", "Customer")
    
    if customer_email:
        try:
            await send_file_ready_notification(
                customer_email=customer_email,
                customer_name=customer_name,
                order_id=request_id,
                download_url=download_url,
                order_details=request
            )
            logger.info(f"File ready notification sent to {customer_email} for order {request_id}")
        except Exception as e:
            logger.error(f"Failed to send file ready notification: {e}")
    
    return {
        "success": True,
        "message": "Processed file uploaded and customer notified",
        "file_id": file_id,
        "download_url": download_url
    }


@api_router.get("/admin/orders")
async def get_admin_orders():
    """Get all orders for admin panel with detailed info"""
    orders = await db.service_requests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return orders


async def process_ecu_files_background(request_id: str):
    """Background task to process ECU files with AI"""
    try:
        # Get request from database
        request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
        
        if not request:
            logger.error(f"Request {request_id} not found")
            return
        
        # Update status to processing
        await db.service_requests.update_one(
            {"id": request_id},
            {"$set": {
                "processing_status": "analyzing",
                "processing_started_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        processed_files = []
        all_warnings = []
        confidences = []
        detected_ecu_types = []
        
        # Process each uploaded file
        for uploaded_file in request.get("uploaded_files", []):
            try:
                filepath = Path(uploaded_file["filepath"])
                
                if not filepath.exists():
                    all_warnings.append(f"File {uploaded_file['original_filename']} not found")
                    continue
                
                # Read file data
                with open(filepath, "rb") as f:
                    file_data = f.read()
                
                # Update status
                await db.service_requests.update_one(
                    {"id": request_id},
                    {"$set": {"processing_status": "processing"}}
                )
                
                # Process with AI
                result = ecu_processor.process_file(
                    file_data,
                    request["selected_services"]
                )
                
                if result["success"] and result["processed_file"]:
                    # Save processed file
                    processed_filename = f"processed_{uploaded_file['original_filename']}"
                    processed_filepath = PROCESSED_DIR / f"{request_id}_{uploaded_file['file_id']}_{processed_filename}"
                    
                    with open(processed_filepath, "wb") as f:
                        f.write(result["processed_file"])
                    
                    processed_files.append({
                        "file_id": str(uuid.uuid4()),
                        "original_filename": uploaded_file["original_filename"],
                        "processed_filename": processed_filename,
                        "filepath": str(processed_filepath),
                        "size": len(result["processed_file"]),
                        "ecu_type": result["ecu_type"],
                        "confidence": result["confidence"],
                        "confidence_level": result["confidence_level"],
                        "actions_applied": result["actions_applied"],
                        "warnings": result["warnings"],
                        "processed_at": datetime.now(timezone.utc).isoformat()
                    })
                    
                    confidences.append(result["confidence"])
                    detected_ecu_types.append(result["ecu_type"])
                    all_warnings.extend(result["warnings"])
                else:
                    all_warnings.append(f"Processing failed for {uploaded_file['original_filename']}")
                    all_warnings.extend(result.get("warnings", []))
                    
            except Exception as e:
                logger.error(f"Error processing file: {e}")
                all_warnings.append(f"Error processing {uploaded_file.get('original_filename', 'unknown')}: {str(e)}")
        
        # Calculate overall confidence
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Determine confidence level
        if avg_confidence >= 0.90:
            confidence_level = ConfidenceLevel.HIGH.value
        elif avg_confidence >= 0.70:
            confidence_level = ConfidenceLevel.MEDIUM.value
        elif avg_confidence >= 0.50:
            confidence_level = ConfidenceLevel.LOW.value
        else:
            confidence_level = ConfidenceLevel.VERY_LOW.value
        
        # Determine final status
        if processed_files:
            final_status = "completed"
            request_status = RequestStatus.COMPLETED.value
        else:
            final_status = "failed"
            request_status = RequestStatus.CANCELLED.value
            all_warnings.append("No files were successfully processed")
        
        # Update request with results
        await db.service_requests.update_one(
            {"id": request_id},
            {"$set": {
                "processing_status": final_status,
                "processed_files": processed_files,
                "ai_confidence": avg_confidence,
                "confidence_level": confidence_level,
                "detected_ecu_type": ", ".join(set(detected_ecu_types)) if detected_ecu_types else "unknown",
                "processing_warnings": all_warnings,
                "processing_completed_at": datetime.now(timezone.utc).isoformat(),
                "status": request_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Processing completed for request {request_id}")
        
    except Exception as e:
        logger.error(f"Background processing error for {request_id}: {e}")
        await db.service_requests.update_one(
            {"id": request_id},
            {"$set": {
                "processing_status": "failed",
                "processing_warnings": [str(e)],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


@api_router.post("/trigger-processing/{request_id}")
async def trigger_processing(request_id: str, background_tasks: BackgroundTasks):
    """Manually trigger AI processing for a request"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if request.get("payment_status") != PaymentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Payment must be completed before processing")
    
    # Add to background tasks
    background_tasks.add_task(process_ecu_files_background, request_id)
    
    return {"success": True, "message": "Processing started"}


@api_router.get("/processing-status/{request_id}")
async def get_processing_status(request_id: str):
    """Get AI processing status for a request"""
    request = await db.service_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    return {
        "processing_status": request.get("processing_status", "pending"),
        "ai_confidence": request.get("ai_confidence"),
        "confidence_level": request.get("confidence_level"),
        "detected_ecu_type": request.get("detected_ecu_type"),
        "warnings": request.get("processing_warnings", []),
        "processed_files": request.get("processed_files", []),
        "processing_started_at": request.get("processing_started_at"),
        "processing_completed_at": request.get("processing_completed_at")
    }


# ==================== TuningFiles/Sedox API Endpoints ====================

@api_router.get("/admin/tuningfiles/status")
async def get_tuningfiles_status():
    """
    Check TuningFiles API status, subscription, and credits
    Admin endpoint to monitor API health
    """
    try:
        tf_api = TuningFilesAPI()
        
        subscription = await tf_api.check_subscription()
        credits = await tf_api.get_credits()
        
        return {
            "success": True,
            "api_connected": True,
            "subscription": {
                "name": subscription.get("name"),
                "active": subscription.get("active"),
                "end_date": subscription.get("end_date")
            },
            "credits": {
                "amount": credits.get("amount"),
                "last_change": credits.get("last_change")
            },
            "markup_percentage": float(os.environ.get('MARKUP_PERCENTAGE', '100')),
            "status": "ready" if subscription.get("active") and credits.get("amount", 0) > 0 else "needs_setup"
        }
    except Exception as e:
        logger.error(f"TuningFiles API error: {e}")
        return {
            "success": False,
            "api_connected": False,
            "error": str(e),
            "status": "error"
        }


@api_router.get("/admin/tuningfiles/vehicle-types")
async def get_tf_vehicle_types():
    """Get vehicle types from TuningFiles"""
    try:
        tf_api = TuningFilesAPI()
        types = await tf_api.get_vehicle_types()
        return {"success": True, "vehicle_types": types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/tuningfiles/manufacturers/{vehicle_type_id}")
async def get_tf_manufacturers(vehicle_type_id: int):
    """Get manufacturers for a vehicle type from TuningFiles"""
    try:
        tf_api = TuningFilesAPI()
        manufacturers = await tf_api.get_manufacturers(vehicle_type_id)
        return {"success": True, "manufacturers": manufacturers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/orders")
async def get_all_orders(skip: int = 0, limit: int = 50):
    """Get all orders with profit calculation"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Calculate totals
    total_revenue = sum(order.get("total_price", 0) for order in orders)
    total_orders = await db.orders.count_documents({})
    
    return {
        "orders": orders,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "showing": len(orders)
    }


# ==================== Vehicle Database API (Local Sedox Mirror) ====================

@api_router.get("/vehicles/types")
async def get_vehicle_types():
    """Get all vehicle types sorted by order (Cars, Trucks, Buses, Bike, Construction, Agriculture)"""
    types = await db.vehicle_types.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    if not types:
        # Fallback to default types if database not populated yet
        return [
            {"id": "car", "name": "Cars & LCV", "order": 1},
            {"id": "truck", "name": "Trucks & Buses", "order": 2},
            {"id": "bus", "name": "Bus", "order": 3},
            {"id": "marine", "name": "Bike / Marine / Snowmobile", "order": 4},
            {"id": "construction", "name": "Construction / Equipment", "order": 5},
            {"id": "agriculture", "name": "Agriculture", "order": 6}
        ]
    return types


@api_router.get("/vehicles/manufacturers/{vehicle_type_id}")
async def get_manufacturers(vehicle_type_id: str):
    """Get all manufacturers for a vehicle type"""
    manufacturers = await db.manufacturers.find(
        {"type_id": vehicle_type_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return manufacturers


@api_router.get("/vehicles/models/{manufacturer_id}")
async def get_models(manufacturer_id: str):
    """Get all models for a manufacturer"""
    models = await db.models.find(
        {"manufacturer_id": manufacturer_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return models


@api_router.get("/vehicles/generations/{model_id}")
async def get_generations(model_id: str):
    """Get all generations/years for a model (for compatibility - returns empty)"""
    # New database structure doesn't use generations, engines are directly under models
    return []


@api_router.get("/vehicles/engines/{model_id}")
async def get_engines(model_id: str):
    """Get all engines for a model"""
    engines = await db.engines.find(
        {"model_id": model_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(200)
    return engines


@api_router.get("/vehicles/engine/{engine_id}")
async def get_engine_details(engine_id: str):
    """Get detailed engine information by ID"""
    engine = await db.engines.find_one(
        {"id": engine_id}, 
        {"_id": 0}
    )
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")
    return engine


@api_router.get("/vehicles/ecu-types/{engine_id}")
async def get_ecu_types_for_engine(engine_id: int):
    """
    Get recommended ECU types for a specific engine.
    Returns ECU options based on manufacturer, fuel type, and vehicle characteristics.
    """
    from ecu_mapping import get_ecu_types_for_vehicle
    
    # Get engine details
    engine = await db.engines.find_one({"id": engine_id}, {"_id": 0})
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")
    
    # Get manufacturer name
    manufacturer = await db.manufacturers.find_one(
        {"id": engine.get("manufacturer_id")}, 
        {"_id": 0}
    )
    manufacturer_name = manufacturer.get("name", "") if manufacturer else ""
    
    # Determine if this is a truck
    vehicle_type = await db.vehicle_types.find_one(
        {"id": engine.get("vehicle_type_id")}, 
        {"_id": 0}
    )
    is_truck = False
    if vehicle_type:
        vt_name = vehicle_type.get("name", "").lower()
        # Only mark as truck if explicitly truck/commercial/heavy, NOT "Cars & LCV"
        is_truck = any(x in vt_name for x in ["truck", "commercial vehicle", "heavy duty"])
        # But NOT if it's "Cars & LCV" which is passenger cars
        if "cars" in vt_name:
            is_truck = False
    
    # Get ECU types
    ecu_types = get_ecu_types_for_vehicle(
        manufacturer_name=manufacturer_name,
        fuel_type=engine.get("fuel", "Petrol"),
        engine_name=engine.get("name", ""),
        is_truck=is_truck
    )
    
    return {
        "engine_id": engine_id,
        "engine_name": engine.get("name"),
        "manufacturer": manufacturer_name,
        "fuel_type": engine.get("fuel"),
        "is_truck": is_truck,
        "ecu_types": ecu_types
    }


@api_router.get("/vehicles/ecu-types")
async def get_all_ecu_types_endpoint():
    """Get all available ECU types (for fallback/manual selection)"""
    from ecu_mapping import get_all_ecu_types
    return get_all_ecu_types()


@api_router.get("/vehicles/search")
async def search_vehicles(q: str):
    """Search across all vehicle data (manufacturers, models, generations)"""
    search_regex = {"$regex": q, "$options": "i"}
    
    # Search manufacturers
    manufacturers = await db.manufacturers.find(
        {"name": search_regex}, 
        {"_id": 0}
    ).limit(10).to_list(10)
    
    # Search models
    models = await db.models.find(
        {"name": search_regex}, 
        {"_id": 0}
    ).limit(10).to_list(10)
    
    # Search engines
    engines = await db.engines.find(
        {"name": search_regex}, 
        {"_id": 0}
    ).limit(10).to_list(10)
    
    return {
        "manufacturers": manufacturers,
        "models": models,
        "engines": engines
    }


@api_router.get("/vehicles/stats")
async def get_vehicle_database_stats():
    """Get statistics about the local vehicle database"""
    types_count = await db.vehicle_types.count_documents({})
    manufacturers_count = await db.manufacturers.count_documents({})
    models_count = await db.models.count_documents({})
    generations_count = await db.generations.count_documents({})
    engines_count = await db.engines.count_documents({})
    
    return {
        "vehicle_types": types_count,
        "manufacturers": manufacturers_count,
        "models": models_count,
        "generations": generations_count,
        "engines": engines_count,
        "total_records": types_count + manufacturers_count + models_count + generations_count + engines_count,
        "database_ready": engines_count > 0
    }


# ==================== CONTACT FORM API ====================

@api_router.post("/contact")
async def submit_contact_form(form_data: ContactFormRequest):
    """Submit a contact form message"""
    try:
        # Store the contact message in database
        contact_message = {
            "id": str(uuid.uuid4()),
            "name": form_data.name,
            "email": form_data.email,
            "phone": form_data.phone,
            "subject": form_data.subject,
            "order_number": form_data.orderNumber,
            "message": form_data.message,
            "status": "new",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "responded_at": None
        }
        
        await db.contact_messages.insert_one(contact_message)
        
        # Log the contact submission
        logging.info(f"New contact form submission from {form_data.email} - Subject: {form_data.subject}")
        
        return {
            "success": True,
            "message": "Your message has been submitted successfully. We will respond within 24 hours.",
            "ticket_id": contact_message["id"]
        }
    except Exception as e:
        logging.error(f"Error submitting contact form: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit contact form")


@api_router.get("/admin/contact-messages")
async def get_contact_messages():
    """Get all contact messages (admin only)"""
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages


# ==================== CUSTOMER PORTAL API Endpoints ====================

class PortalLoginRequest(BaseModel):
    email: str
    order_id: str


class PortalMessageRequest(BaseModel):
    order_id: str
    email: str
    message: str
    sender: str = "customer"


class PortalEmailLoginRequest(BaseModel):
    email: str


class PortalRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


@api_router.post("/portal/register")
async def portal_register(register_data: PortalRegisterRequest):
    """
    Register a new customer account for the portal
    """
    import hashlib
    
    email = register_data.email.strip().lower()
    
    # Check if account already exists
    existing = await db.portal_accounts.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please login instead.")
    
    # Hash password (simple hash for demo - use bcrypt in production)
    password_hash = hashlib.sha256(register_data.password.encode()).hexdigest()
    
    # Create account
    account = {
        "id": str(uuid.uuid4()),
        "name": register_data.name.strip(),
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None
    }
    
    await db.portal_accounts.insert_one(account)
    
    logging.info(f"New portal account created for: {email}")
    
    return {
        "success": True,
        "message": "Account created successfully! You can now login.",
        "account_id": account["id"]
    }


@api_router.post("/portal/login-email")
async def portal_login_email(login_data: PortalEmailLoginRequest):
    """
    Customer portal login with email only - returns ALL orders for this email
    """
    email = login_data.email.strip().lower()
    
    # Get all orders from service_requests collection
    orders_sr = await db.service_requests.find(
        {"customer_email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get all orders from orders collection (new flow)
    orders_new = await db.orders.find(
        {"customer_email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Combine and sort by date
    all_orders = orders_sr + orders_new
    all_orders.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    if not all_orders:
        raise HTTPException(status_code=404, detail="No orders found for this email")
    
    # Get messages for each order
    for order in all_orders:
        messages = await db.portal_messages.find(
            {"order_id": order.get("id")},
            {"_id": 0}
        ).sort("created_at", 1).to_list(50)
        order["messages"] = messages
    
    return {
        "success": True,
        "orders": all_orders,
        "total_orders": len(all_orders)
    }


@api_router.post("/portal/login")
async def portal_login(login_data: PortalLoginRequest):
    """
    Customer portal login - verify email matches order
    """
    email = login_data.email.strip().lower()
    order_id = login_data.order_id.strip()
    
    # Search in service_requests collection
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    # Also search in orders collection (for orders created via new flow)
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Invalid email or order number")
    
    # Get messages for this order
    messages = await db.portal_messages.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return {
        "success": True,
        "order": order,
        "messages": messages
    }


@api_router.get("/portal/order/{order_id}")
async def get_portal_order(order_id: str, email: str):
    """
    Get order details for customer portal (requires email verification)
    """
    email = email.strip().lower()
    
    # Search in service_requests
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    # Also search in orders collection
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Order not found or access denied")
    
    # Get messages
    messages = await db.portal_messages.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return {
        "success": True,
        "order": order,
        "messages": messages
    }


@api_router.post("/portal/message")
async def send_portal_message(msg_data: PortalMessageRequest):
    """
    Send a message from customer or admin on an order
    """
    email = msg_data.email.strip().lower()
    order_id = msg_data.order_id.strip()
    
    # Verify order access
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Order not found or access denied")
    
    # Create message
    message = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "sender": msg_data.sender,  # 'customer' or 'admin'
        "message": msg_data.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.portal_messages.insert_one(message)
    
    # If customer sends message, notify admin (optional background task)
    if msg_data.sender == "customer":
        logger.info(f"New customer message on order {order_id[:8]}: {msg_data.message[:50]}...")
    
    return {
        "success": True,
        "message": {
            "id": message["id"],
            "sender": message["sender"],
            "message": message["message"],
            "created_at": message["created_at"]
        }
    }


@api_router.post("/portal/upload-file")
async def portal_upload_file(
    file: UploadFile = File(...),
    order_id: str = Form(...),
    email: str = Form(...)
):
    """
    Customer uploads additional file through portal
    """
    email = email.strip().lower()
    
    # Verify order access
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Order not found or access denied")
    
    # Validate file extension
    allowed_extensions = [".bin", ".hex", ".ecu", ".ori", ".mod"]
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only ECU files ({', '.join(allowed_extensions)}) are allowed."
        )
    
    # Save file
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_portal{file_ext}"
    filepath = UPLOAD_DIR / filename
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    file_info = {
        "file_id": file_id,
        "original_filename": file.filename,
        "stored_filename": filename,
        "filepath": str(filepath),
        "size": len(content),
        "uploaded_via": "portal",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update order with new file
    # Try service_requests first
    result = await db.service_requests.update_one(
        {"id": order_id},
        {"$push": {"uploaded_files": file_info}}
    )
    
    if result.modified_count == 0:
        # Try orders collection
        await db.orders.update_one(
            {"id": order_id},
            {"$push": {"uploaded_files": file_info}}
        )
    
    return {
        "success": True,
        "file": file_info
    }


@api_router.get("/portal/download/{order_id}/{file_id}")
async def portal_download_file(order_id: str, file_id: str, email: str):
    """
    Download processed file from customer portal
    """
    email = email.strip().lower()
    
    # Verify order access
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Order not found or access denied")
    
    # Find the file
    file_info = None
    for f in order.get("processed_files", []):
        if f.get("file_id") == file_id:
            file_info = f
            break
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    filepath = Path(file_info.get("filepath", ""))
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=filepath,
        filename=file_info.get("processed_filename", f"processed_{file_id}.bin"),
        media_type="application/octet-stream"
    )


@api_router.get("/portal/messages/{order_id}")
async def get_portal_messages(order_id: str, email: str):
    """
    Get all messages for an order
    """
    email = email.strip().lower()
    
    # Verify order access
    order = await db.service_requests.find_one({
        "id": order_id,
        "customer_email": {"$regex": f"^{email}$", "$options": "i"}
    }, {"_id": 0})
    
    if not order:
        order = await db.orders.find_one({
            "id": order_id,
            "customer_email": {"$regex": f"^{email}$", "$options": "i"}
        }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=401, detail="Order not found or access denied")
    
    messages = await db.portal_messages.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return {
        "success": True,
        "messages": messages
    }


# Admin endpoint to send message to customer
@api_router.post("/admin/portal/message")
async def admin_send_portal_message(
    order_id: str = Form(...),
    message: str = Form(...)
):
    """
    Admin sends a message to customer on an order
    """
    # Verify order exists
    order = await db.service_requests.find_one({"id": order_id}, {"_id": 0})
    if not order:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create message
    msg = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "sender": "admin",
        "message": message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.portal_messages.insert_one(msg)
    
    return {
        "success": True,
        "message": msg
    }


# =============================================================================
# ECU PROCESSING ENGINE API
# =============================================================================
# New automated ECU file processing endpoints

@api_router.get("/engine/supported-ecus")
async def get_supported_ecus():
    """Get list of all supported ECU types and their capabilities"""
    definitions = ecu_definition_db.get_all_definitions()
    return {
        "success": True,
        "count": len(definitions),
        "ecus": [
            {
                "id": d.id,
                "name": d.full_name,
                "manufacturer": d.manufacturer.value,
                "family": d.family,
                "variant": d.variant,
                "supported_modifications": [m.value for m in d.supported_modifications],
                "vehicles": d.vehicles,
                "verified": d.verified,
            }
            for d in definitions
        ]
    }


@api_router.post("/engine/analyze")
async def analyze_ecu_file_engine(
    file: UploadFile = File(...)
):
    """
    Analyze an ECU file using the new processing engine.
    Returns detailed analysis without modifying the file.
    """
    try:
        file_data = await file.read()
        analysis = ecu_file_processor.analyze_file(file_data)
        
        return {
            "success": True,
            "filename": file.filename,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/engine/process")
async def process_ecu_file_engine(
    file: UploadFile = File(...),
    modifications: str = Form(...)  # Comma-separated: "dpf_off,egr_off,dtc_off"
):
    """
    Process an ECU file with the new processing engine.
    
    Modifications available:
    - dpf_off: Disable DPF/FAP regeneration
    - egr_off: Disable EGR valve
    - adblue_off: Disable AdBlue/SCR system
    - dtc_off: Remove related DTCs
    - lambda_off: Disable lambda sensors
    - stage1_tune: Stage 1 performance tune
    
    Returns processed file for download.
    """
    try:
        file_data = await file.read()
        
        # Parse modifications
        mod_list = [m.strip() for m in modifications.split(",") if m.strip()]
        mod_types = []
        for mod in mod_list:
            try:
                mod_types.append(EngineModType(mod))
            except ValueError:
                pass
        
        if not mod_types:
            raise HTTPException(status_code=400, detail="No valid modifications specified")
        
        # Process file
        result = ecu_file_processor.process_file(file_data, mod_types, file.filename)
        
        if result.success:
            # Save processed file
            processed_data = ecu_file_processor.get_processed_file()
            if processed_data:
                output_filename = f"processed_{file.filename}"
                output_path = PROCESSED_DIR / output_filename
                
                with open(output_path, 'wb') as f:
                    f.write(processed_data)
                
                # Store result in database
                processing_record = {
                    "id": str(uuid.uuid4()),
                    "original_filename": file.filename,
                    "processed_filename": output_filename,
                    "ecu_id": result.ecu_id,
                    "ecu_name": result.ecu_name,
                    "modifications_applied": result.modifications_applied,
                    "dtcs_removed": result.dtcs_removed,
                    "checksum_updated": result.checksum_updated,
                    "processing_time_ms": result.processing_time_ms,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.ecu_processing_log.insert_one(processing_record)
                
                return {
                    "success": True,
                    "result": {
                        "ecu_identified": result.ecu_name,
                        "modifications_applied": result.modifications_applied,
                        "maps_modified": result.maps_modified,
                        "dtcs_removed": result.dtcs_removed,
                        "checksum_updated": result.checksum_updated,
                        "processing_time_ms": result.processing_time_ms,
                        "warnings": result.warnings,
                    },
                    "download_path": f"/api/engine/download/{output_filename}"
                }
        
        return {
            "success": False,
            "errors": result.errors,
            "warnings": result.warnings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/engine/download/{filename}")
async def download_processed_file(filename: str):
    """Download a processed ECU file"""
    file_path = PROCESSED_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )


@api_router.get("/engine/status")
async def get_engine_status():
    """Get ECU Processing Engine status and statistics"""
    definitions = ecu_definition_db.get_all_definitions()
    
    # Get processing statistics
    total_processed = await db.ecu_processing_log.count_documents({})
    
    return {
        "success": True,
        "engine_version": "1.0.0",
        "supported_ecus": len(definitions),
        "total_files_processed": total_processed,
        "status": "operational",
        "capabilities": {
            "dpf_off": True,
            "egr_off": True,
            "adblue_off": True,
            "dtc_off": True,
            "checksum_correction": True,
        }
    }


# ===========================================
# DTC DELETE ENGINE ENDPOINTS
# ===========================================

@api_router.post("/dtc-engine/upload")
async def dtc_engine_upload(file: UploadFile = File(...)):
    """Upload a file for DTC analysis"""
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Save file
        file_path = UPLOAD_DIR / f"{file_id}_dtc_original{Path(file.filename).suffix}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Analyze file for DTCs
        analysis = dtc_delete_engine.analyze_file(content)
        
        # Store file info in database
        await db.dtc_files.insert_one({
            "id": file_id,
            "original_filename": file.filename,
            "file_path": str(file_path),
            "file_size": len(content),
            "analysis": {
                "file_size": analysis["file_size"],
                "detected_dtcs": analysis["detected_dtcs"],
                "checksum_info": analysis["checksum_info"],
                "ecu_info": analysis["ecu_info"]
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "analysis": {
                "file_size": analysis["file_size"],
                "detected_dtcs": analysis["detected_dtcs"],
                "checksum_info": analysis["checksum_info"],
                "ecu_info": analysis["ecu_info"]
            }
        }
    except Exception as e:
        logger.error(f"DTC upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class DTCProcessRequest(BaseModel):
    file_id: str
    dtc_codes: List[str]
    correct_checksum: bool = True
    order_id: Optional[str] = None


class DTCOrderRequest(BaseModel):
    file_id: str
    dtc_codes: List[str]
    correct_checksum: bool = True
    customer_name: str
    customer_email: str
    dtc_price: float
    checksum_price: float
    total_price: float
    payment_status: str = "pending"


@api_router.post("/dtc-engine/order")
async def dtc_engine_create_order(request: DTCOrderRequest):
    """Create a DTC deletion order"""
    try:
        order_id = str(uuid.uuid4())
        
        # Create order in database
        order_doc = {
            "id": order_id,
            "file_id": request.file_id,
            "dtc_codes": request.dtc_codes,
            "correct_checksum": request.correct_checksum,
            "customer_name": request.customer_name,
            "customer_email": request.customer_email,
            "dtc_price": request.dtc_price,
            "checksum_price": request.checksum_price,
            "total_price": request.total_price,
            "payment_status": request.payment_status,
            "processing_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.dtc_orders.insert_one(order_doc)
        
        return {
            "success": True,
            "order_id": order_id,
            "total_price": request.total_price
        }
    except Exception as e:
        logger.error(f"DTC order creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/dtc-engine/process")
async def dtc_engine_process(request: DTCProcessRequest):
    """Process file to delete specified DTCs"""
    try:
        # Get file info from database
        file_doc = await db.dtc_files.find_one({"id": request.file_id}, {"_id": 0})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read original file
        file_path = Path(file_doc["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File data not found")
        
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        # Process file - delete DTCs
        result = dtc_delete_engine.delete_dtcs(
            file_data,
            request.dtc_codes,
            request.correct_checksum
        )
        
        # Save modified file if successful
        download_id = None
        if result.success and result.modified_data:
            download_id = str(uuid.uuid4())
            modified_path = PROCESSED_DIR / f"{download_id}_dtc_deleted.bin"
            with open(modified_path, "wb") as f:
                f.write(result.modified_data)
            
            # Store in database
            await db.dtc_processed.insert_one({
                "download_id": download_id,
                "original_file_id": request.file_id,
                "original_filename": file_doc["original_filename"],
                "modified_path": str(modified_path),
                "dtcs_deleted": [{"code": d["code"], "description": d.get("description", "")} for d in result.dtcs_deleted],
                "dtcs_not_found": result.dtcs_not_found,
                "checksum_corrected": result.checksum_corrected,
                "checksum_type": result.checksum_type,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        return {
            "success": result.success,
            "download_id": download_id,
            "dtcs_requested": result.dtcs_requested,
            "dtcs_found": [{"code": d["code"], "offset": d["offset"]} for d in result.dtcs_found],
            "dtcs_deleted": [{"code": d["code"], "description": d.get("description", "")} for d in result.dtcs_deleted],
            "dtcs_not_found": result.dtcs_not_found,
            "checksum_corrected": result.checksum_corrected,
            "checksum_type": result.checksum_type,
            "error_message": result.error_message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DTC processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/dtc-engine/download/{download_id}")
async def dtc_engine_download(download_id: str):
    """Download the modified file"""
    try:
        # Get file info from database
        file_doc = await db.dtc_processed.find_one({"download_id": download_id}, {"_id": 0})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Download not found")
        
        file_path = Path(file_doc["modified_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate download filename
        original_name = file_doc.get("original_filename", "file")
        base_name = Path(original_name).stem
        download_name = f"{base_name}_dtc_deleted.bin"
        
        return FileResponse(
            path=str(file_path),
            filename=download_name,
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DTC download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/dtc-engine/scan/{file_id}")
async def dtc_engine_scan_all(file_id: str):
    """Scan file for all recognizable DTCs"""
    try:
        # Get file info from database
        file_doc = await db.dtc_files.find_one({"id": file_id}, {"_id": 0})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read file
        file_path = Path(file_doc["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File data not found")
        
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        # Scan for all DTCs
        all_dtcs = dtc_delete_engine.scan_all_dtcs(file_data)
        
        return {
            "success": True,
            "file_id": file_id,
            "total_dtcs": len(all_dtcs),
            "dtcs": all_dtcs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DTC scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/dtc-engine/lookup/{dtc_code}")
async def dtc_lookup(dtc_code: str):
    """Look up information about a specific DTC code"""
    code = dtc_code.upper().strip()
    description = DTCDatabase.get_description(code)
    
    return {
        "success": True,
        "code": code,
        "description": description,
        "category": dtc_delete_engine._categorize_dtc(code)
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
