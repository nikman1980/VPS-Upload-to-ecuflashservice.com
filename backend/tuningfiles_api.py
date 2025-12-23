"""
TuningFiles/Sedox API Integration Service
Real ECU file processing via TuningFiles.com API

API Documentation: https://docs.tuningfiles.com/api/
"""

import os
import logging
import httpx
import base64
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# TuningFiles API Configuration
TUNINGFILES_API_KEY = os.environ.get('TUNINGFILES_API_KEY', '')
TUNINGFILES_API_BASE = "https://api.tuningfiles.com"

# Markup percentage (100% = double the cost)
MARKUP_PERCENTAGE = float(os.environ.get('MARKUP_PERCENTAGE', '100'))


class TuningFilesAPI:
    """
    TuningFiles/Sedox API Client for real ECU file processing
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or TUNINGFILES_API_KEY
        self.base_url = TUNINGFILES_API_BASE
        self.headers = {
            "x-api-key": self.api_key,
            "x-lang": "en"
        }
    
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make async request to TuningFiles API"""
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
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
                logger.error(f"TuningFiles API error: {error_data}")
                raise Exception(f"API Error {response.status_code}: {error_data.get('error', {}).get('message', 'Unknown')}")
    
    # ==================== Account Methods ====================
    
    async def check_subscription(self) -> Dict[str, Any]:
        """Check if API subscription is active"""
        return await self._request("GET", "/subscription")
    
    async def get_credits(self) -> Dict[str, Any]:
        """Get available credits amount"""
        return await self._request("GET", "/credits/amount")
    
    # ==================== Vehicle Database Methods ====================
    
    async def get_vehicle_types(self) -> List[Dict]:
        """Get all vehicle types (Cars, Trucks, etc.)"""
        return await self._request("GET", "/vehicles/types")
    
    async def get_manufacturers(self, vehicle_type_id: int) -> List[Dict]:
        """Get manufacturers for a vehicle type"""
        return await self._request("GET", f"/vehicles/manufacturers/{vehicle_type_id}")
    
    async def get_models(self, manufacturer_id: int) -> List[Dict]:
        """Get models for a manufacturer"""
        return await self._request("GET", f"/vehicles/models/{manufacturer_id}")
    
    async def get_generations(self, model_id: int) -> List[Dict]:
        """Get generations for a model"""
        return await self._request("GET", f"/vehicles/generations/{model_id}")
    
    async def get_engines(self, generation_id: int) -> List[Dict]:
        """Get engines for a generation"""
        return await self._request("GET", f"/vehicles/engines/{generation_id}")
    
    async def get_transmissions(self) -> List[Dict]:
        """Get available transmissions"""
        return await self._request("GET", "/vehicles/transmissions")
    
    async def get_read_tools(self) -> List[Dict]:
        """Get available read tools"""
        return await self._request("GET", "/vehicles/read-tools")
    
    async def get_remaps(self, engine_id: int) -> List[Dict]:
        """Get available remaps/addons for an engine"""
        return await self._request("GET", f"/vehicles/remaps/{engine_id}")
    
    # ==================== File Processing Methods ====================
    
    async def upload_file(self, file_path: str) -> Dict[str, Any]:
        """
        Upload original ECU file to TuningFiles
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
                    return response.json()
                else:
                    raise Exception(f"Upload failed: {response.text}")
    
    async def upload_file_from_bytes(self, file_data: bytes, filename: str) -> Dict[str, Any]:
        """
        Upload ECU file from bytes
        Returns: {"id": file_id, "name": filename, "size": size}
        """
        files = {"file": (filename, file_data)}
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/files/upload",
                headers=self.headers,
                files=files
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                raise Exception(f"Upload failed: {response.text}")
    
    async def create_project(
        self,
        file_id: int,
        vehicle_type_id: int,
        manufacturer_id: int,
        model_id: int = None,
        model_name: str = None,
        generation_id: int = None,
        generation_name: str = None,
        engine_id: int = None,
        engine_name: str = None,
        vehicle_year: int = 2020,
        gearbox_id: int = 1,  # 1 = Manual, 3 = Automatic
        ecu_name: str = None,
        read_tool: str = "OBD",
        remap_id: int = 1,  # 1 = Stage 1
        addon_ids: List[int] = None,
        dtc_codes: List[str] = None,
        customer_comment: str = None,
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        Create a tuning project
        
        Args:
            file_id: ID from upload_file response
            vehicle_type_id: 1=Cars, 2=Trucks, 3=Agriculture, 4=Marine, 5=Motorcycles
            manufacturer_id: Manufacturer ID
            model_id/model_name: Either ID or custom name
            generation_id/generation_name: Either ID or custom name
            engine_id/engine_name: Either ID or custom name
            vehicle_year: Year of manufacture
            gearbox_id: Transmission type
            ecu_name: ECU name (e.g., "Bosch EDC17")
            read_tool: Tool used to read ECU
            remap_id: 1=Stage1, 2=Stage2, etc.
            addon_ids: List of addon IDs (DPF, EGR, DTC, etc.)
            dtc_codes: List of DTC codes to remove
            customer_comment: Additional notes
            metadata: Custom metadata dict
        """
        data = {
            "ecu1-file": file_id,
            "vehicle-type-id": vehicle_type_id,
            "vehicle-manufacturer-id": manufacturer_id,
            "vehicle-year": vehicle_year,
            "vehicle-gearbox": gearbox_id,
            "read-tool": read_tool,
            "remap": remap_id
        }
        
        # Model - either ID or custom name
        if model_id:
            data["vehicle-model-id"] = model_id
        elif model_name:
            data["vehicle-model"] = model_name
        
        # Generation - either ID or custom name
        if generation_id:
            data["vehicle-generation-id"] = generation_id
        elif generation_name:
            data["vehicle-generation"] = generation_name
        
        # Engine - either ID or custom name
        if engine_id:
            data["vehicle-engine-id"] = engine_id
        elif engine_name:
            data["vehicle-engine"] = engine_name
        
        # Optional fields
        if ecu_name:
            data["vehicle-ecu"] = ecu_name
        
        if addon_ids:
            data["addons"] = addon_ids
        
        if dtc_codes:
            data["dtc-codes[]"] = dtc_codes
        
        if customer_comment:
            data["customer-comment"] = customer_comment
        
        if metadata:
            data["metadata"] = metadata
        
        return await self._request("POST", "/projects", data=data)
    
    async def get_project(self, project_id: int) -> Dict[str, Any]:
        """Get project details including status and files"""
        return await self._request("GET", f"/projects/view/{project_id}")
    
    async def list_projects(self, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """List all projects"""
        return await self._request("GET", f"/projects?page={page}&per_page={per_page}")
    
    async def purchase_file(self, file_id: int, project_id: int) -> Dict[str, Any]:
        """Purchase a processed file (deducts credits)"""
        return await self._request("GET", f"/files/purchase/{file_id}/{project_id}")
    
    async def download_file(self, file_id: int, project_id: int) -> Dict[str, Any]:
        """
        Download processed file
        Returns: {"filename": name, "data": base64_encoded_content, "size": size}
        """
        result = await self._request("GET", f"/files/download/{file_id}/{project_id}")
        return result
    
    async def download_file_decoded(self, file_id: int, project_id: int) -> tuple:
        """
        Download and decode processed file
        Returns: (filename, file_bytes)
        """
        result = await self.download_file(file_id, project_id)
        filename = result.get("filename", "processed.bin")
        file_data = base64.b64decode(result.get("data", ""))
        return filename, file_data
    
    # ==================== Utility Methods ====================
    
    async def wait_for_project_completion(
        self, 
        project_id: int, 
        timeout_minutes: int = 60,
        poll_interval_seconds: int = 30
    ) -> Dict[str, Any]:
        """
        Poll project status until finished or timeout
        
        Status codes:
        - 0 = Waiting
        - 1 = In Progress  
        - 2 = Finished
        """
        start_time = datetime.now(timezone.utc)
        timeout_seconds = timeout_minutes * 60
        
        while True:
            project = await self.get_project(project_id)
            status_code = project.get("status_code", 0)
            
            if status_code == 2:  # Finished
                logger.info(f"Project {project_id} completed!")
                return project
            
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            if elapsed > timeout_seconds:
                raise TimeoutError(f"Project {project_id} did not complete within {timeout_minutes} minutes")
            
            logger.info(f"Project {project_id} status: {project.get('status')} - waiting...")
            await asyncio.sleep(poll_interval_seconds)


def calculate_customer_price(sedox_cost: float, markup_percent: float = None) -> float:
    """
    Calculate customer price with markup
    
    Args:
        sedox_cost: Cost from Sedox/TuningFiles
        markup_percent: Markup percentage (default from env or 100%)
    
    Returns:
        Customer price (Sedox cost + markup)
    """
    if markup_percent is None:
        markup_percent = MARKUP_PERCENTAGE
    
    markup = sedox_cost * (markup_percent / 100)
    return round(sedox_cost + markup, 2)


def calculate_profit(customer_price: float, sedox_cost: float) -> float:
    """Calculate profit from a transaction"""
    return round(customer_price - sedox_cost, 2)


# ==================== Service Mapping ====================

# Map our service IDs to TuningFiles addon IDs
# These IDs should be verified from TuningFiles API
ADDON_MAPPING = {
    "dpf-removal": {"name": "DPF OFF", "addon_id": 0},      # DPF removal
    "egr-removal": {"name": "EGR OFF", "addon_id": 1},      # EGR removal  
    "adblue-removal": {"name": "AdBlue OFF", "addon_id": 2}, # AdBlue/SCR removal
    "dtc-single": {"name": "DTC", "addon_id": None},        # DTC handled separately
    "dtc-multiple": {"name": "DTC", "addon_id": None},      # DTC handled separately
    "checksum": {"name": "Checksum", "addon_id": None},     # Usually included
    "immo-off": {"name": "IMMO OFF", "addon_id": 5},        # Immobilizer off
    "egr-dpf-combo": {"name": "EGR+DPF", "addon_id": None}, # Combo
}


async def get_sedox_pricing_for_services(
    api: TuningFilesAPI,
    engine_id: int,
    service_ids: List[str]
) -> Dict[str, Any]:
    """
    Get Sedox pricing for requested services
    
    Returns dict with sedox_cost, addon_ids, and remap_id
    """
    remaps = await api.get_remaps(engine_id)
    
    # Find available addons and their prices
    available_addons = {}
    base_remap_price = 0
    
    for remap in remaps:
        if remap.get("id") == 1:  # Stage 1 (base)
            base_remap_price = remap.get("price", 0)
        
        for addon in remap.get("addons", []):
            available_addons[addon.get("code", "").upper()] = {
                "id": addon.get("id"),
                "price": addon.get("price", 0),
                "name": addon.get("name")
            }
    
    # Calculate total Sedox cost
    total_cost = base_remap_price
    addon_ids = []
    
    for service_id in service_ids:
        mapping = ADDON_MAPPING.get(service_id, {})
        addon_name = mapping.get("name", "").upper()
        
        if addon_name in available_addons:
            addon = available_addons[addon_name]
            total_cost += addon.get("price", 0)
            if addon.get("id"):
                addon_ids.append(addon.get("id"))
    
    return {
        "sedox_cost": total_cost,
        "addon_ids": addon_ids,
        "remap_id": 1,
        "available_addons": available_addons
    }
