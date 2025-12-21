from fastapi import FastAPI, APIRouter, HTTPException
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Enums
class RequestStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Define Models
class Service(BaseModel):
    id: str
    name: str
    description: str
    icon: str


class ServiceRequestCreate(BaseModel):
    # Customer Information
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    
    # Vehicle Information
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    engine_type: str
    vin: Optional[str] = None
    mileage: int
    
    # Service Details
    selected_services: List[str]  # List of service IDs
    issues_description: Optional[str] = None
    
    # Additional Notes
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
    vin: Optional[str] = None
    mileage: int
    
    # Service Details
    selected_services: List[str]
    issues_description: Optional[str] = None
    additional_notes: Optional[str] = None
    
    # Status and Timestamps
    status: RequestStatus = RequestStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusUpdate(BaseModel):
    status: RequestStatus


# Services catalog
AVAILABLE_SERVICES = [
    {
        "id": "dpf-removal",
        "name": "DPF Removal",
        "description": "Complete diesel particulate filter removal and ECU remapping to eliminate DPF-related issues and improve performance.",
        "icon": "🔧"
    },
    {
        "id": "adblue-removal",
        "name": "AdBlue/DEF Removal",
        "description": "Remove AdBlue/DEF system and reprogram ECU to eliminate AdBlue warnings and system failures.",
        "icon": "💧"
    },
    {
        "id": "egr-removal",
        "name": "EGR Removal",
        "description": "Exhaust Gas Recirculation system removal to prevent carbon buildup and improve engine efficiency.",
        "icon": "⚙️"
    },
    {
        "id": "ecu-remap",
        "name": "ECU Remapping",
        "description": "Professional ECU remapping for improved performance, fuel economy, and power delivery.",
        "icon": "🚀"
    }
]


# Routes
@api_router.get("/")
async def root():
    return {"message": "DPF AdBlue Removal Service API"}


@api_router.get("/services", response_model=List[Service])
async def get_services():
    """Get all available services"""
    return AVAILABLE_SERVICES


@api_router.post("/service-requests", response_model=ServiceRequest)
async def create_service_request(request: ServiceRequestCreate):
    """Create a new service request"""
    request_dict = request.model_dump()
    request_obj = ServiceRequest(**request_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = request_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
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
    
    return updated_request

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