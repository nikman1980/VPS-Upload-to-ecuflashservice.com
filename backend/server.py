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
import asyncio

# Import AI ECU Processor (mock - for fallback)
from ecu_processor import ECUProcessor, ConfidenceLevel

# Import Real ECU Analyzer
from ecu_analyzer import ECUAnalyzer, analyze_ecu_file, get_available_services, SERVICE_PRICING

# Import Email Service
from email_service import send_order_confirmation

# Import TuningFiles API (real ECU processing)
from tuningfiles_api import TuningFilesAPI, calculate_customer_price, calculate_profit


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
        "base_price": 10.00,
        "name": "DTC Removal (Single Code)"
    },
    "dtc-multiple": {
        "base_price": 25.00,
        "name": "DTC Removal (Multiple Codes)"
    },
    "checksum": {
        "base_price": 5.00,
        "name": "Checksum Correction"
    },
    "egr-removal": {
        "base_price": 25.00,
        "name": "EGR Removal"
    },
    "dpf-removal": {
        "base_price": 79.00,
        "name": "DPF Removal"
    },
    "egr-dpf-combo": {
        "base_price": 79.00,
        "name": "EGR + DPF Combo"
    },
    "adblue-removal": {
        "base_price": 199.00,
        "name": "AdBlue/DEF Removal"
    },
    "immo-off": {
        "base_price": 35.00,
        "name": "Immobilizer Off"
    },
    "decat": {
        "base_price": 20.00,
        "name": "Decat (Cat OFF)"
    },
    "vmax-off": {
        "base_price": 15.00,
        "name": "Vmax OFF"
    },
    "swirl-flap-off": {
        "base_price": 20.00,
        "name": "Swirl Flap OFF"
    },
    "exhaust-flaps": {
        "base_price": 20.00,
        "name": "Exhaust Flaps OFF"
    },
    "nox-off": {
        "base_price": 20.00,
        "name": "NOX OFF"
    },
    "opf-gpf-off": {
        "base_price": 20.00,
        "name": "OPF/GPF OFF"
    },
    "maf-off": {
        "base_price": 20.00,
        "name": "MAF OFF"
    },
    "cold-start-off": {
        "base_price": 20.00,
        "name": "Cold Start OFF"
    },
    "start-stop-off": {
        "base_price": 20.00,
        "name": "Start & Stop OFF"
    },
    "cylinder-demand-off": {
        "base_price": 15.00,
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
        "icon": "🔍",
        "base_price": 50.00,
        "final_price": 50.00,
        "cost_price": 25.00,
        "category": "diagnostics"
    },
    {
        "id": "checksum",
        "name": "Checksum Correction",
        "description": "Automatic checksum recalculation for modified files.",
        "icon": "✓",
        "base_price": 10.00,
        "final_price": 10.00,
        "cost_price": 5.00,
        "category": "utility"
    },
    {
        "id": "egr-removal",
        "name": "EGR Removal",
        "description": "Exhaust Gas Recirculation system removal.",
        "icon": "♻️",
        "base_price": 50.00,
        "final_price": 50.00,
        "cost_price": 25.00,
        "category": "emissions"
    },
    {
        "id": "dpf-removal",
        "name": "DPF Removal",
        "description": "Diesel particulate filter removal.",
        "icon": "🚫",
        "base_price": 158.00,
        "final_price": 158.00,
        "cost_price": 79.00,
        "category": "emissions"
    },
    {
        "id": "egr-dpf-combo",
        "name": "EGR + DPF Combo",
        "description": "Best deal! Remove both EGR and DPF together.",
        "icon": "💥",
        "base_price": 158.00,
        "final_price": 158.00,
        "cost_price": 79.00,
        "is_combo": True,
        "category": "emissions"
    },
    {
        "id": "adblue-removal",
        "name": "AdBlue/DEF Removal",
        "description": "Complete AdBlue/DEF system removal.",
        "icon": "💧",
        "base_price": 398.00,
        "final_price": 398.00,
        "cost_price": 199.00,
        "category": "emissions"
    },
    {
        "id": "immo-off",
        "name": "Immobilizer Off",
        "description": "Disable vehicle immobilizer.",
        "icon": "🔓",
        "base_price": 70.00,
        "final_price": 70.00,
        "cost_price": 35.00,
        "category": "security"
    },
    {
        "id": "decat",
        "name": "Decat (Cat OFF)",
        "description": "Catalytic converter removal and disable.",
        "icon": "🔥",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "vmax-off",
        "name": "Speed Limiter OFF",
        "description": "Remove speed limiter for maximum velocity.",
        "icon": "🚀",
        "base_price": 30.00,
        "final_price": 30.00,
        "cost_price": 15.00,
        "category": "performance"
    },
    {
        "id": "swirl-flap-off",
        "name": "Swirl Flap OFF",
        "description": "Disable intake manifold swirl flaps.",
        "icon": "🌀",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "intake"
    },
    {
        "id": "exhaust-flaps",
        "name": "Exhaust Flaps OFF",
        "description": "Disable exhaust valve flaps.",
        "icon": "💨",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "exhaust"
    },
    {
        "id": "nox-off",
        "name": "NOX Sensor OFF",
        "description": "Disable NOx sensor and system.",
        "icon": "🌫️",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "opf-gpf-off",
        "name": "OPF/GPF OFF",
        "description": "Petrol particulate filter removal.",
        "icon": "🏭",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "emissions"
    },
    {
        "id": "maf-off",
        "name": "MAF Sensor OFF",
        "description": "Mass Air Flow sensor delete.",
        "icon": "📊",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "sensors"
    },
    {
        "id": "cold-start-off",
        "name": "Cold Start Noise OFF",
        "description": "Disable cold start noise reduction.",
        "icon": "❄️",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "comfort"
    },
    {
        "id": "start-stop-off",
        "name": "Start & Stop OFF",
        "description": "Disable automatic start-stop system.",
        "icon": "🔄",
        "base_price": 40.00,
        "final_price": 40.00,
        "cost_price": 20.00,
        "category": "comfort"
    },
    {
        "id": "cylinder-demand-off",
        "name": "Cylinder On Demand OFF",
        "description": "Disable cylinder deactivation system.",
        "icon": "⚡",
        "base_price": 30.00,
        "final_price": 30.00,
        "cost_price": 15.00,
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
        analysis = analyzer.analyze(file_data)
        display_info = analyzer.get_display_info()
        
        # Build available services list
        services = [
            {"service_id": "dpf_off", "service_name": "DPF/FAP Removal", "price": 50.0},
            {"service_id": "adblue_off", "service_name": "AdBlue/SCR Removal", "price": 60.0},
            {"service_id": "egr_off", "service_name": "EGR Removal", "price": 40.0},
            {"service_id": "dtc_off", "service_name": "DTC/Error Code Removal", "price": 30.0},
            {"service_id": "lambda_off", "service_name": "Lambda/O2 Sensor Removal", "price": 35.0},
            {"service_id": "cat_off", "service_name": "Catalyst Removal", "price": 45.0},
            {"service_id": "speed_limit_off", "service_name": "Speed Limiter Removal", "price": 40.0},
            {"service_id": "start_stop_off", "service_name": "Start/Stop Disable", "price": 25.0},
            {"service_id": "flaps_off", "service_name": "Swirl Flaps Removal", "price": 35.0},
            {"service_id": "immo_off", "service_name": "Immobilizer Removal", "price": 80.0},
            {"service_id": "stage1", "service_name": "Stage 1 Tuning (+20-30% Power)", "price": 150.0},
            {"service_id": "stage2", "service_name": "Stage 2 Tuning (+30-50% Power)", "price": 250.0},
        ]
        
        available_options = []
        for svc in services:
            available_options.append({
                "service_id": svc["service_id"],
                "service_name": svc["service_name"],
                "price": svc["price"],
                "file_id": f"{file_id}_{svc['service_id']}",
            })
        
        # Build ECU info string
        ecu_info = display_info['ecu_type']
        if display_info['manufacturer'] and display_info['manufacturer'] != 'Unknown':
            if display_info['manufacturer'] not in ecu_info:
                ecu_info = f"{display_info['manufacturer']} - {ecu_info}"
        
        # Add metadata if found
        metadata = {}
        if display_info['calibration_id'] != 'N/A':
            metadata['calibration_id'] = display_info['calibration_id']
        if display_info['software_version'] != 'N/A':
            metadata['software_version'] = display_info['software_version']
        if display_info['part_number'] != 'N/A':
            metadata['part_number'] = display_info['part_number']
        
        return {
            "success": True,
            "file_id": file_id,
            "original_filename": file.filename,
            "file_size_mb": display_info['file_size_mb'],
            "ecu_type": ecu_info,
            "manufacturer": display_info['manufacturer'],
            "metadata": metadata,
            "available_options": available_options,
            "message": "File uploaded successfully! Select the services you need."
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
    """Get all vehicle types (Cars, Trucks, Agriculture, Marine, Motorcycles)"""
    types = await db.vehicle_types.find({}, {"_id": 0}).to_list(100)
    if not types:
        # Fallback to default types if database not populated yet
        return [
            {"id": 1, "name": "Cars & LCV", "slug": "cars"},
            {"id": 2, "name": "Trucks & Buses", "slug": "trucks"},
            {"id": 3, "name": "Agriculture", "slug": "agriculture"},
            {"id": 4, "name": "Marine", "slug": "marine"},
            {"id": 5, "name": "Motorcycles & ATVs", "slug": "motorcycles"}
        ]
    return types


@api_router.get("/vehicles/manufacturers/{vehicle_type_id}")
async def get_manufacturers(vehicle_type_id: int):
    """Get all manufacturers for a vehicle type"""
    manufacturers = await db.manufacturers.find(
        {"vehicle_type_id": vehicle_type_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return manufacturers


@api_router.get("/vehicles/models/{manufacturer_id}")
async def get_models(manufacturer_id: int):
    """Get all models for a manufacturer"""
    models = await db.models.find(
        {"manufacturer_id": manufacturer_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return models


@api_router.get("/vehicles/generations/{model_id}")
async def get_generations(model_id: int):
    """Get all generations/years for a model"""
    generations = await db.generations.find(
        {"model_id": model_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(200)
    return generations


@api_router.get("/vehicles/engines/{generation_id}")
async def get_engines(generation_id: int):
    """Get all engines for a generation"""
    engines = await db.engines.find(
        {"generation_id": generation_id}, 
        {"_id": 0}
    ).sort("name", 1).to_list(200)
    return engines


@api_router.get("/vehicles/engine/{engine_id}")
async def get_engine_details(engine_id: int):
    """Get detailed engine information by ID"""
    engine = await db.engines.find_one(
        {"id": engine_id}, 
        {"_id": 0}
    )
    if not engine:
        raise HTTPException(status_code=404, detail="Engine not found")
    return engine


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
