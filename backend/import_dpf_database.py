"""
Import DPFOffService Vehicle Database into MongoDB
This replaces the US-focused TuningFiles data with worldwide vehicle data
"""

import asyncio
import json
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

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Path to the extracted database
DPF_DATABASE_PATH = "/app/dpf_complete_database.json"


async def import_dpf_database():
    """Import DPFOffService database into MongoDB"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Load the DPF database
    logger.info(f"Loading database from {DPF_DATABASE_PATH}")
    with open(DPF_DATABASE_PATH, 'r') as f:
        dpf_db = json.load(f)
    
    # Clear existing data
    logger.info("Clearing existing vehicle data...")
    await db.vehicle_types.delete_many({})
    await db.manufacturers.delete_many({})
    await db.models.delete_many({})
    await db.generations.delete_many({})
    await db.engines.delete_many({})
    
    # Track stats
    stats = {
        'types': 0,
        'manufacturers': 0,
        'models': 0,
        'engines': 0,
        'ecus': 0
    }
    
    # Map type names to IDs
    type_map = {
        'Agriculture': {'id': 'agriculture', 'name': 'Agriculture', 'order': 1},
        'Bike / Marine / Snowmobile': {'id': 'marine', 'name': 'Bike / Marine / Snowmobile', 'order': 2},
        'Bus': {'id': 'bus', 'name': 'Bus', 'order': 3},
        'Car': {'id': 'car', 'name': 'Cars & LCV', 'order': 4},
        'Construction / Equipment': {'id': 'construction', 'name': 'Construction / Equipment', 'order': 5},
        'Truck': {'id': 'truck', 'name': 'Trucks & Buses', 'order': 6},
    }
    
    # Insert vehicle types
    logger.info("Inserting vehicle types...")
    for type_name, type_info in type_map.items():
        if type_name in dpf_db:
            await db.vehicle_types.insert_one({
                'id': type_info['id'],
                'name': type_info['name'],
                'original_name': type_name,
                'order': type_info['order'],
                'source': 'dpfoffservice',
                'created_at': datetime.now(timezone.utc)
            })
            stats['types'] += 1
    
    # Process each vehicle type
    for type_name, type_data in dpf_db.items():
        if type_name in ['source', 'extraction_started', 'last_update', 'vehicle_types', 'extraction_completed', 'total_vehicles']:
            continue
        
        if type_name not in type_map:
            continue
            
        type_id = type_map[type_name]['id']
        brands = type_data.get('brands', {})
        
        logger.info(f"Processing {type_name}: {len(brands)} brands")
        
        # Process each brand (manufacturer)
        for brand_name, brand_data in brands.items():
            brand_id = brand_data.get('id', brand_name.lower().replace(' ', '_'))
            
            # Insert manufacturer
            await db.manufacturers.update_one(
                {'name': brand_name, 'type_id': type_id},
                {'$set': {
                    'id': f"{type_id}_{brand_id}",
                    'name': brand_name,
                    'type_id': type_id,
                    'dpf_id': brand_id,
                    'source': 'dpfoffservice',
                    'updated_at': datetime.now(timezone.utc)
                }},
                upsert=True
            )
            stats['manufacturers'] += 1
            
            # Process each model
            models = brand_data.get('models', {})
            for model_name, model_data in models.items():
                model_id = model_data.get('id', model_name.lower().replace(' ', '_'))
                
                # Insert model
                model_doc_id = f"{type_id}_{brand_id}_{model_id}"
                await db.models.update_one(
                    {'id': model_doc_id},
                    {'$set': {
                        'id': model_doc_id,
                        'name': model_name,
                        'manufacturer_id': f"{type_id}_{brand_id}",
                        'manufacturer_name': brand_name,
                        'type_id': type_id,
                        'dpf_id': model_id,
                        'source': 'dpfoffservice',
                        'updated_at': datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                stats['models'] += 1
                
                # Process each engine
                engines = model_data.get('engines', {})
                for engine_name, engine_data in engines.items():
                    engine_id = engine_data.get('id', engine_name.lower().replace(' ', '_'))
                    ecus = engine_data.get('ecus', [])
                    
                    # Map ECU names to service capabilities
                    ecu_list = []
                    for ecu in ecus:
                        ecu_name = ecu.get('name', '') if isinstance(ecu, dict) else str(ecu)
                        ecu_list.append({
                            'id': ecu.get('id', '') if isinstance(ecu, dict) else '',
                            'name': ecu_name,
                            'has_dpf': True,  # Almost all diesel ECUs have DPF
                            'has_egr': True,  # Almost all diesel ECUs have EGR
                            'has_adblue': _has_adblue(ecu_name),
                        })
                        stats['ecus'] += 1
                    
                    # Insert engine
                    engine_doc_id = f"{model_doc_id}_{engine_id}"
                    await db.engines.update_one(
                        {'id': engine_doc_id},
                        {'$set': {
                            'id': engine_doc_id,
                            'name': engine_name,
                            'model_id': model_doc_id,
                            'model_name': model_name,
                            'manufacturer_name': brand_name,
                            'type_id': type_id,
                            'dpf_id': engine_id,
                            'ecus': ecu_list,
                            'source': 'dpfoffservice',
                            'updated_at': datetime.now(timezone.utc)
                        }},
                        upsert=True
                    )
                    stats['engines'] += 1
    
    # Create indexes
    logger.info("Creating indexes...")
    await db.manufacturers.create_index([('type_id', 1), ('name', 1)])
    await db.models.create_index([('manufacturer_id', 1), ('name', 1)])
    await db.engines.create_index([('model_id', 1), ('name', 1)])
    
    # Save import stats
    await db.import_stats.insert_one({
        'source': 'dpfoffservice',
        'imported_at': datetime.now(timezone.utc),
        'stats': stats
    })
    
    logger.info("=" * 50)
    logger.info("IMPORT COMPLETE!")
    logger.info(f"  Types: {stats['types']}")
    logger.info(f"  Manufacturers: {stats['manufacturers']}")
    logger.info(f"  Models: {stats['models']}")
    logger.info(f"  Engines: {stats['engines']}")
    logger.info(f"  ECUs: {stats['ecus']}")
    logger.info("=" * 50)
    
    client.close()
    return stats


def _has_adblue(ecu_name: str) -> bool:
    """Determine if ECU type supports AdBlue/SCR"""
    ecu_upper = ecu_name.upper()
    
    # ECUs known to have SCR/AdBlue
    scr_ecus = [
        'CM2150E', 'CM2250', 'CM2350',  # Cummins with SCR
        'EDC17CV', 'EDC17CP52', 'EDC17CP54',  # Bosch truck ECUs
        'EDC17C49', 'EDC17C54',
    ]
    
    for scr_ecu in scr_ecus:
        if scr_ecu in ecu_upper:
            return True
    
    # ECUs known NOT to have SCR in main ECU
    no_scr_ecus = [
        'TRANSTRON', 'SH7058', 'SH7055', 'SH725',  # Japanese light truck
        'EDC16', 'EDC15',  # Pre-SCR era
        'NEC',  # Denso NEC (Toyota)
        'MEVD',  # Petrol
        'MD1CS',  # Bosch MD1 (separate DCU)
    ]
    
    for no_scr in no_scr_ecus:
        if no_scr in ecu_upper:
            return False
    
    # Default: assume no AdBlue unless confirmed
    return False


if __name__ == "__main__":
    asyncio.run(import_dpf_database())
