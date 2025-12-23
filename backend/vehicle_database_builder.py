"""
Vehicle Database Builder
Fetches complete vehicle database from TuningFiles API and stores in MongoDB
"""

import asyncio
import httpx
import os
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
TUNINGFILES_API_KEY = os.environ.get('TUNINGFILES_API_KEY', '')
TUNINGFILES_API_BASE = "https://api.tuningfiles.com"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# API Headers
HEADERS = {
    "x-api-key": TUNINGFILES_API_KEY,
    "x-lang": "en"
}


async def fetch_with_retry(client: httpx.AsyncClient, url: str, max_retries: int = 3) -> list | dict | None:
    """Fetch data with retry logic"""
    for attempt in range(max_retries):
        try:
            response = await client.get(url, headers=HEADERS, timeout=30.0)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return []  # No data found is okay
            else:
                logger.warning(f"API error {response.status_code} for {url}")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
            await asyncio.sleep(1)
    return None


async def build_vehicle_database():
    """Main function to build the complete vehicle database"""
    
    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Collections
    vehicle_types_col = db.vehicle_types
    manufacturers_col = db.manufacturers
    models_col = db.models
    generations_col = db.generations
    engines_col = db.engines
    
    # Clear existing data
    logger.info("Clearing existing vehicle data...")
    await vehicle_types_col.delete_many({})
    await manufacturers_col.delete_many({})
    await models_col.delete_many({})
    await generations_col.delete_many({})
    await engines_col.delete_many({})
    
    async with httpx.AsyncClient() as client:
        # Step 1: Fetch Vehicle Types
        logger.info("Fetching vehicle types...")
        types_url = f"{TUNINGFILES_API_BASE}/vehicles/types"
        vehicle_types = await fetch_with_retry(client, types_url)
        
        if not vehicle_types:
            logger.error("Failed to fetch vehicle types")
            return
        
        # Store vehicle types
        for vtype in vehicle_types:
            vtype['_sync_date'] = datetime.now(timezone.utc).isoformat()
        await vehicle_types_col.insert_many(vehicle_types)
        logger.info(f"Stored {len(vehicle_types)} vehicle types")
        
        # Step 2: Fetch Manufacturers for each type
        total_manufacturers = 0
        for vtype in vehicle_types:
            type_id = vtype['id']
            type_name = vtype['name']
            logger.info(f"Fetching manufacturers for {type_name}...")
            
            mfr_url = f"{TUNINGFILES_API_BASE}/vehicles/manufacturers/{type_id}"
            manufacturers = await fetch_with_retry(client, mfr_url)
            
            if manufacturers:
                for mfr in manufacturers:
                    mfr['vehicle_type_id'] = type_id
                    mfr['_sync_date'] = datetime.now(timezone.utc).isoformat()
                await manufacturers_col.insert_many(manufacturers)
                total_manufacturers += len(manufacturers)
                logger.info(f"  - Stored {len(manufacturers)} manufacturers for {type_name}")
            
            await asyncio.sleep(0.2)  # Rate limiting
        
        logger.info(f"Total manufacturers stored: {total_manufacturers}")
        
        # Step 3: Fetch Models for each manufacturer
        all_manufacturers = await manufacturers_col.find({}, {'_id': 0}).to_list(None)
        total_models = 0
        
        for i, mfr in enumerate(all_manufacturers):
            mfr_id = mfr['id']
            mfr_name = mfr['name']
            
            if i % 20 == 0:
                logger.info(f"Fetching models... ({i}/{len(all_manufacturers)} manufacturers)")
            
            models_url = f"{TUNINGFILES_API_BASE}/vehicles/models/{mfr_id}"
            models = await fetch_with_retry(client, models_url)
            
            if models and isinstance(models, list) and len(models) > 0:
                for model in models:
                    model['manufacturer_id'] = mfr_id
                    model['vehicle_type_id'] = mfr.get('vehicle_type_id')
                    model['_sync_date'] = datetime.now(timezone.utc).isoformat()
                await models_col.insert_many(models)
                total_models += len(models)
            
            await asyncio.sleep(0.1)  # Rate limiting
        
        logger.info(f"Total models stored: {total_models}")
        
        # Step 4: Fetch Generations for each model
        all_models = await models_col.find({}, {'_id': 0}).to_list(None)
        total_generations = 0
        
        for i, model in enumerate(all_models):
            model_id = model['id']
            
            if i % 50 == 0:
                logger.info(f"Fetching generations... ({i}/{len(all_models)} models)")
            
            gen_url = f"{TUNINGFILES_API_BASE}/vehicles/generations/{model_id}"
            generations = await fetch_with_retry(client, gen_url)
            
            if generations and isinstance(generations, list) and len(generations) > 0:
                for gen in generations:
                    gen['model_id'] = model_id
                    gen['manufacturer_id'] = model.get('manufacturer_id')
                    gen['vehicle_type_id'] = model.get('vehicle_type_id')
                    gen['_sync_date'] = datetime.now(timezone.utc).isoformat()
                await generations_col.insert_many(generations)
                total_generations += len(generations)
            
            await asyncio.sleep(0.1)  # Rate limiting
        
        logger.info(f"Total generations stored: {total_generations}")
        
        # Step 5: Fetch Engines for each generation
        all_generations = await generations_col.find({}, {'_id': 0}).to_list(None)
        total_engines = 0
        
        for i, gen in enumerate(all_generations):
            gen_id = gen['id']
            
            if i % 100 == 0:
                logger.info(f"Fetching engines... ({i}/{len(all_generations)} generations)")
            
            eng_url = f"{TUNINGFILES_API_BASE}/vehicles/engines/{gen_id}"
            engines = await fetch_with_retry(client, eng_url)
            
            if engines and isinstance(engines, list) and len(engines) > 0:
                for eng in engines:
                    eng['generation_id'] = gen_id
                    eng['model_id'] = gen.get('model_id')
                    eng['manufacturer_id'] = gen.get('manufacturer_id')
                    eng['vehicle_type_id'] = gen.get('vehicle_type_id')
                    eng['_sync_date'] = datetime.now(timezone.utc).isoformat()
                await engines_col.insert_many(engines)
                total_engines += len(engines)
            
            await asyncio.sleep(0.1)  # Rate limiting
        
        logger.info(f"Total engines stored: {total_engines}")
        
        # Create indexes for fast queries
        logger.info("Creating database indexes...")
        await manufacturers_col.create_index("vehicle_type_id")
        await models_col.create_index("manufacturer_id")
        await generations_col.create_index("model_id")
        await engines_col.create_index("generation_id")
        
        # Summary
        logger.info("=" * 50)
        logger.info("DATABASE BUILD COMPLETE!")
        logger.info(f"  Vehicle Types: {len(vehicle_types)}")
        logger.info(f"  Manufacturers: {total_manufacturers}")
        logger.info(f"  Models: {total_models}")
        logger.info(f"  Generations: {total_generations}")
        logger.info(f"  Engines: {total_engines}")
        logger.info("=" * 50)
    
    mongo_client.close()


if __name__ == "__main__":
    asyncio.run(build_vehicle_database())
