from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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


# Vehicle Database - Comprehensive list including Trucks and Buses
VEHICLE_MAKES = [
    # Passenger Vehicles
    "Abarth", "Alfa Romeo", "Audi", "BMW", "Chevrolet", "Chrysler", 
    "Citroen", "Dacia", "Dodge", "Fiat", "Ford", "GMC",
    "Honda", "Hyundai", "Infiniti", "Isuzu", "Jaguar",
    "Jeep", "Kia", "Land Rover", "Lexus", "Mazda", "Mercedes-Benz",
    "Mini", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Porsche",
    "RAM", "Renault", "Saab", "Seat", "Skoda", "SsangYong",
    "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
    
    # Heavy Duty Trucks (Commercial)
    "Peterbilt", "Kenworth", "Freightliner", "Mack", "International",
    "Western Star", "Volvo Trucks", "Scania", "MAN", "DAF", "Iveco",
    "Hino", "UD Trucks", "Isuzu Trucks",
    
    # Buses
    "Blue Bird", "Thomas Built", "IC Bus", "New Flyer", "Gillig",
    "MCI (Motor Coach)", "Prevost", "Van Hool", "Mercedes-Benz Bus",
    "Setra", "Neoplan", "Scania Bus", "Volvo Bus", "MAN Bus"
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

# Service pricing (base prices before 25% markup)
SERVICE_PRICING = {
    "dpf-removal": {
        "base_price": 150.00,
        "name": "DPF Removal"
    },
    "adblue-removal": {
        "base_price": 350.00,
        "name": "AdBlue/DEF Removal"
    },
    "egr-removal": {
        "base_price": 120.00,
        "name": "EGR Removal"
    },
    "ecu-remap": {
        "base_price": 200.00,
        "name": "ECU Remapping"
    }
}

MARKUP_PERCENTAGE = 25  # 25% markup


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
    
    # Status and Timestamps
    status: RequestStatus = RequestStatus.PENDING_PAYMENT
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Processing (for future dpfoffservice.com integration)
    dpfoff_task_id: Optional[str] = None
    processed_files: List[dict] = []


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
    
    for service_id in service_ids:
        if service_id in SERVICE_PRICING:
            service_info = SERVICE_PRICING[service_id]
            base_price = service_info["base_price"]
            markup_amount = base_price * (MARKUP_PERCENTAGE / 100)
            final_price = base_price + markup_amount
            
            base_total += base_price
            
            breakdown.append({
                "service_id": service_id,
                "service_name": service_info["name"],
                "base_price": base_price,
                "markup_percentage": MARKUP_PERCENTAGE,
                "markup_amount": markup_amount,
                "final_price": final_price
            })
    
    markup_total = base_total * (MARKUP_PERCENTAGE / 100)
    total_price = base_total + markup_total
    
    return {
        "base_total": base_total,
        "markup_amount": markup_total,
        "total_price": total_price,
        "pricing_breakdown": breakdown
    }


# Services catalog with pricing
AVAILABLE_SERVICES = [
    {
        "id": "dpf-removal",
        "name": "DPF Removal",
        "description": "Complete diesel particulate filter removal and ECU remapping to eliminate DPF-related issues and improve performance.",
        "icon": "🔧",
        "base_price": SERVICE_PRICING["dpf-removal"]["base_price"],
        "final_price": SERVICE_PRICING["dpf-removal"]["base_price"] * 1.25
    },
    {
        "id": "adblue-removal",
        "name": "AdBlue/DEF Removal",
        "description": "Remove AdBlue/DEF system and reprogram ECU to eliminate AdBlue warnings and system failures.",
        "icon": "💧",
        "base_price": SERVICE_PRICING["adblue-removal"]["base_price"],
        "final_price": SERVICE_PRICING["adblue-removal"]["base_price"] * 1.25
    },
    {
        "id": "egr-removal",
        "name": "EGR Removal",
        "description": "Exhaust Gas Recirculation system removal to prevent carbon buildup and improve engine efficiency.",
        "icon": "⚙️",
        "base_price": SERVICE_PRICING["egr-removal"]["base_price"],
        "final_price": SERVICE_PRICING["egr-removal"]["base_price"] * 1.25
    },
    {
        "id": "ecu-remap",
        "name": "ECU Remapping",
        "description": "Professional ECU remapping for improved performance, fuel economy, and power delivery.",
        "icon": "🚀",
        "base_price": SERVICE_PRICING["ecu-remap"]["base_price"],
        "final_price": SERVICE_PRICING["ecu-remap"]["base_price"] * 1.25
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
async def update_payment_status(request_id: str, payment_update: PaymentUpdate):
    """Update payment status after PayPal payment"""
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
