"""
Sedox/TuningFiles Integration Service
Handles automated ECU file processing via TuningFiles API

Flow:
1. Customer pays -> Create Sedox project
2. Sedox processes file (20-60 min)
3. Webhook notification received
4. Auto-download processed file
5. Email customer with download link
"""

import os
import logging
import httpx
import base64
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Configuration
TUNINGFILES_API_KEY = os.environ.get('TUNINGFILES_API_KEY', '')
TUNINGFILES_API_BASE = "https://api.tuningfiles.com"
MARKUP_PERCENTAGE = float(os.environ.get('MARKUP_PERCENTAGE', '100'))

# Directories
UPLOAD_DIR = ROOT_DIR / "uploads"
PROCESSED_DIR = ROOT_DIR / "processed"
PROCESSED_DIR.mkdir(exist_ok=True)


class SedoxIntegration:
    """
    Complete Sedox/TuningFiles integration for automated ECU processing
    """
    
    def __init__(self):
        self.api_key = TUNINGFILES_API_KEY
        self.base_url = TUNINGFILES_API_BASE
        self.headers = {
            "x-api-key": self.api_key,
            "x-lang": "en"
        }
        logger.info(f"Sedox Integration initialized with key: {self.api_key[:8]}...")
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make async request to TuningFiles API"""
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=self.headers,
                **kwargs
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                error_data = response.json() if response.text else {"error": {"message": "Unknown error"}}
                logger.error(f"Sedox API error: {error_data}")
                raise Exception(f"API Error {response.status_code}: {error_data.get('error', {}).get('message', 'Unknown')}")
    
    # ==================== Core Methods ====================
    
    async def get_status(self) -> Dict[str, Any]:
        """Check API status and credits"""
        try:
            subscription = await self._request("GET", "/subscription")
            credits = await self._request("GET", "/credits/amount")
            return {
                "connected": True,
                "subscription_active": subscription.get("active", False),
                "credits": credits.get("amount", 0),
                "status": "ready" if credits.get("amount", 0) > 0 else "needs_credits"
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    async def get_notification_channels(self) -> List[Dict]:
        """Get notification channels for project updates"""
        return await self._request("GET", "/notification-channels")
    
    async def get_vehicle_types(self) -> List[Dict]:
        """Get vehicle types"""
        return await self._request("GET", "/vehicles/types")
    
    async def get_manufacturers(self, vehicle_type_id: int = 1) -> List[Dict]:
        """Get manufacturers (default: Cars)"""
        return await self._request("GET", f"/vehicles/manufacturers/{vehicle_type_id}")
    
    async def upload_file(self, file_path: str) -> Dict[str, Any]:
        """
        Upload ECU file to Sedox
        Returns: {"id": file_id, "name": filename, "size": size}
        """
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/files/upload",
                    headers=self.headers,
                    files=files
                )
                
                if response.status_code == 201:
                    result = response.json()
                    logger.info(f"File uploaded to Sedox: ID={result.get('id')}")
                    return result
                else:
                    raise Exception(f"Upload failed: {response.text}")
    
    async def create_tuning_project(
        self,
        sedox_file_id: int,
        vehicle_make: str,
        vehicle_model: str,
        vehicle_year: int,
        engine_info: str = "Unknown",
        services: List[str] = None,
        dtc_codes: List[str] = None,
        customer_comment: str = None,
        order_id: str = None
    ) -> Dict[str, Any]:
        """
        Create a tuning project on Sedox
        
        Args:
            sedox_file_id: File ID from upload_file()
            vehicle_make: e.g., "Audi"
            vehicle_model: e.g., "A4"
            vehicle_year: e.g., 2020
            engine_info: e.g., "2.0 TDI 140hp"
            services: List of service IDs (dpf-removal, egr-removal, dtc-single, etc.)
            dtc_codes: List of DTC codes to remove
            customer_comment: Additional notes
            order_id: Your internal order ID (stored in metadata)
        """
        # Get notification channel
        channels = await self.get_notification_channels()
        if not channels:
            raise Exception("No notification channels configured in Sedox account")
        
        notification_channel_id = channels[0]["id"]
        
        # Map vehicle make to Sedox manufacturer ID
        manufacturer_id = await self._get_manufacturer_id(vehicle_make)
        
        # Determine vehicle type (1=Cars, 2=Trucks)
        vehicle_type_id = 1  # Default to cars
        
        # Determine remap type and addons based on services
        remap_id, addon_ids = self._map_services_to_sedox(services or [])
        
        # Build request data
        data = {
            "ecu1-file": sedox_file_id,
            "vehicle-type-id": vehicle_type_id,
            "vehicle-manufacturer-id": manufacturer_id,
            "vehicle-model": vehicle_model,
            "vehicle-generation": str(vehicle_year),
            "vehicle-engine": engine_info or f"{vehicle_make} {vehicle_model} Engine",
            "vehicle-year": vehicle_year,
            "vehicle-gearbox": 1,  # Manual (default)
            "read-tool": "OBD",
            "remap": remap_id,
            "notification-channel[]": notification_channel_id
        }
        
        # Add addons if any
        if addon_ids:
            data["addons"] = addon_ids
        
        # Add DTC codes if any
        if dtc_codes:
            for dtc in dtc_codes:
                if "dtc-codes[]" not in data:
                    data["dtc-codes[]"] = []
                data["dtc-codes[]"] = dtc_codes
        
        # Add customer comment
        comment_parts = []
        if customer_comment:
            comment_parts.append(customer_comment)
        if dtc_codes:
            comment_parts.append(f"DTC codes to remove: {', '.join(dtc_codes)}")
        if services:
            comment_parts.append(f"Requested services: {', '.join(services)}")
        if order_id:
            comment_parts.append(f"Order ID: {order_id}")
        
        if comment_parts:
            data["customer-comment"] = "\n".join(comment_parts)
        
        # Add metadata
        if order_id:
            data["metadata"] = {"order_id": order_id}
        
        logger.info(f"Creating Sedox project for order {order_id}")
        result = await self._request("POST", "/projects", data=data)
        
        project_id = result.get("id")
        logger.info(f"Sedox project created: ID={project_id}, Status={result.get('status')}")
        
        return result
    
    async def get_project(self, project_id: int) -> Dict[str, Any]:
        """Get project details and status"""
        return await self._request("GET", f"/projects/view/{project_id}")
    
    async def purchase_file(self, file_id: int, project_id: int) -> Dict[str, Any]:
        """Purchase a processed file (uses credits)"""
        return await self._request("GET", f"/files/purchase/{file_id}/{project_id}")
    
    async def download_file(self, file_id: int, project_id: int) -> tuple:
        """
        Download processed file from Sedox
        Returns: (filename, file_bytes)
        """
        result = await self._request("GET", f"/files/download/{file_id}/{project_id}")
        filename = result.get("filename", "processed.bin")
        file_data = base64.b64decode(result.get("data", ""))
        logger.info(f"Downloaded file: {filename} ({len(file_data)} bytes)")
        return filename, file_data
    
    async def check_and_download_processed_file(
        self,
        project_id: int,
        order_id: str,
        save_dir: Path = None
    ) -> Optional[Dict[str, Any]]:
        """
        Check if project is finished and download processed file
        
        Returns dict with file info if ready, None if still processing
        """
        save_dir = save_dir or PROCESSED_DIR
        
        project = await self.get_project(project_id)
        status_code = project.get("status_code", 0)
        
        # Status: 0=Waiting, 1=In Progress, 2=Finished
        if status_code != 2:
            return {
                "ready": False,
                "status": project.get("status"),
                "status_code": status_code
            }
        
        # Find the processed (non-original) file
        files = project.get("files", [])
        processed_file = None
        
        for f in files:
            if not f.get("is_original", True):
                processed_file = f
                break
        
        if not processed_file:
            logger.warning(f"Project {project_id} finished but no processed file found")
            return {"ready": False, "status": "no_processed_file"}
        
        file_id = processed_file.get("id")
        pricing = processed_file.get("pricing", {})
        
        # Check if we need to purchase the file
        if pricing.get("is_billable") and not pricing.get("is_paid"):
            logger.info(f"Purchasing file {file_id} for project {project_id}")
            await self.purchase_file(file_id, project_id)
        
        # Download the file
        filename, file_data = await self.download_file(file_id, project_id)
        
        # Save locally
        safe_filename = f"{order_id}_{filename}"
        save_path = save_dir / safe_filename
        
        with open(save_path, "wb") as f:
            f.write(file_data)
        
        logger.info(f"Processed file saved: {save_path}")
        
        return {
            "ready": True,
            "status": "completed",
            "filename": filename,
            "local_path": str(save_path),
            "size": len(file_data),
            "sedox_file_id": file_id,
            "project": project
        }
    
    # ==================== Helper Methods ====================
    
    async def _get_manufacturer_id(self, make: str) -> int:
        """Get Sedox manufacturer ID from make name"""
        # Common manufacturer IDs (cached for performance)
        MANUFACTURER_IDS = {
            "audi": 1088,
            "bmw": 1089,
            "mercedes": 1124,
            "mercedes-benz": 1124,
            "volkswagen": 1161,
            "vw": 1161,
            "ford": 1102,
            "toyota": 1155,
            "honda": 1108,
            "nissan": 1132,
            "mazda": 1122,
            "hyundai": 1109,
            "kia": 1114,
            "peugeot": 1139,
            "citroen": 1095,
            "renault": 1143,
            "fiat": 1101,
            "opel": 1135,
            "vauxhall": 1135,
            "volvo": 1162,
            "skoda": 1149,
            "seat": 1147,
            "jaguar": 1111,
            "land rover": 1116,
            "porsche": 1141,
            "mini": 1127,
            "alfa romeo": 1026,
            "chevrolet": 1093,
            "jeep": 1112,
            "dodge": 1097,
            "chrysler": 1094,
            "subaru": 1151,
            "mitsubishi": 1128,
            "suzuki": 1152,
            "lexus": 1117,
            "infiniti": 1110,
            "acura": 7667,
            "dacia": 1096,
            "iveco": 3574,
            "man": 3580,
            "scania": 3585,
            "daf": 3572,
            "volvo trucks": 3589,
        }
        
        make_lower = make.lower().strip()
        
        if make_lower in MANUFACTURER_IDS:
            return MANUFACTURER_IDS[make_lower]
        
        # Try to find via API
        try:
            manufacturers = await self.get_manufacturers(1)  # Cars
            for m in manufacturers:
                if m.get("name", "").lower() == make_lower:
                    return m.get("id")
            
            # Try trucks
            manufacturers = await self.get_manufacturers(2)  # Trucks
            for m in manufacturers:
                if m.get("name", "").lower() == make_lower:
                    return m.get("id")
        except:
            pass
        
        # Default to Audi if not found
        logger.warning(f"Manufacturer '{make}' not found, defaulting to generic")
        return 1088
    
    def _map_services_to_sedox(self, services: List[str]) -> tuple:
        """
        Map our service IDs to Sedox remap ID and addon IDs
        
        Returns: (remap_id, addon_ids)
        """
        # Sedox Addon IDs (approximate - may need adjustment)
        ADDON_MAP = {
            "dpf-removal": 0,      # DPF OFF
            "egr-removal": 1,      # EGR OFF
            "adblue-removal": 2,   # AdBlue/SCR OFF
            "immo-off": 5,         # Immobilizer OFF
            "vmax-removal": 4,     # Speed limiter OFF
            "lambda-off": 6,       # O2/Lambda OFF
            "swirl-flaps": 3,      # Swirl flaps OFF
        }
        
        addon_ids = []
        
        for service in services:
            if service in ADDON_MAP:
                addon_ids.append(ADDON_MAP[service])
        
        # DTC removal is handled via dtc-codes parameter, not addon
        # Checksum is typically included automatically
        
        # Remap ID: 1=Stage 1, 2=Stage 2, etc.
        # For deactivation only (DPF, EGR, DTC), use remap 0 or 1
        remap_id = 1  # Stage 1 as base
        
        return remap_id, addon_ids


# ==================== Background Task for Polling ====================

async def poll_sedox_project(
    project_id: int,
    order_id: str,
    db,
    max_attempts: int = 120,  # 120 * 30s = 60 minutes max
    poll_interval: int = 30
):
    """
    Background task to poll Sedox project status and auto-download when ready
    """
    from email_service import send_order_confirmation
    
    sedox = SedoxIntegration()
    
    for attempt in range(max_attempts):
        try:
            result = await sedox.check_and_download_processed_file(
                project_id=project_id,
                order_id=order_id
            )
            
            if result and result.get("ready"):
                # Update order in database
                await db.orders.update_one(
                    {"id": order_id},
                    {
                        "$set": {
                            "processing_status": "completed",
                            "processed_file_path": result.get("local_path"),
                            "processed_filename": result.get("filename"),
                            "sedox_completed_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Get order details for email
                order = await db.orders.find_one({"id": order_id}, {"_id": 0})
                
                if order:
                    # Send completion email to customer
                    try:
                        send_order_confirmation(
                            customer_email=order.get("customer_email"),
                            customer_name=order.get("customer_name"),
                            order_id=order_id,
                            order_details={
                                "file_id": order.get("file_id"),
                                "purchased_services": order.get("purchased_services", []),
                                "total_price": order.get("total_price", 0),
                                "vehicle_make": order.get("vehicle_make"),
                                "vehicle_model": order.get("vehicle_model"),
                                "vehicle_year": order.get("vehicle_year"),
                                "dtc_codes": order.get("dtc_codes", []),
                                "download_links": [order_id],  # Use order_id for download
                                "processing_complete": True
                            }
                        )
                        logger.info(f"Completion email sent for order {order_id}")
                    except Exception as e:
                        logger.error(f"Failed to send completion email: {e}")
                
                logger.info(f"Order {order_id} processing completed!")
                return result
            
            # Update status in database
            await db.orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "processing_status": result.get("status", "processing"),
                        "last_poll_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(f"Order {order_id}: Status={result.get('status')}, attempt {attempt+1}/{max_attempts}")
            
        except Exception as e:
            logger.error(f"Error polling project {project_id}: {e}")
        
        await asyncio.sleep(poll_interval)
    
    # Timeout - mark as failed
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"processing_status": "timeout"}}
    )
    logger.error(f"Order {order_id} processing timed out after {max_attempts * poll_interval} seconds")


# Singleton instance
sedox_client = SedoxIntegration()
