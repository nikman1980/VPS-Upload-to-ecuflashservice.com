#!/usr/bin/env python3
"""
VPS Database Migration Script for ECU Flash Service
Run this script on your VPS to add missing vehicle types and Chinese truck data.

Usage:
    python3 migrate_vps_data.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

# MongoDB connection - adjust if needed
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'ecu_flash_db')

async def migrate_data():
    print(f"Connecting to MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # ============ VEHICLE TYPES ============
    print("\n=== Adding Vehicle Types ===")
    vehicle_types = [
        {"id": 1, "name": "Cars & LCV", "slug": "cars", "icon": "🚗"},
        {"id": 2, "name": "Trucks & Buses", "slug": "trucks", "icon": "🚛"},
        {"id": 3, "name": "Agriculture", "slug": "agriculture", "icon": "🚜"},
        {"id": 4, "name": "Marine", "slug": "marine", "icon": "🚤"},
        {"id": 5, "name": "Motorcycles & ATVs", "slug": "motorcycles", "icon": "🏍️"},
    ]
    
    for vt in vehicle_types:
        vt["_sync_date"] = datetime.now(timezone.utc).isoformat()
        result = await db.vehicle_types.update_one(
            {"id": vt["id"]},
            {"$set": vt},
            upsert=True
        )
        print(f"  ✅ {vt['name']}")
    
    # ============ CHINESE TRUCK MANUFACTURERS ============
    print("\n=== Adding Chinese Truck Manufacturers ===")
    chinese_manufacturers = [
        {"id": 90001, "name": "Shacman", "vehicle_type_id": 2},
        {"id": 90002, "name": "Sinotruk (HOWO)", "vehicle_type_id": 2},
        {"id": 90003, "name": "FAW", "vehicle_type_id": 2},
        {"id": 90004, "name": "Dongfeng", "vehicle_type_id": 2},
        {"id": 90005, "name": "Foton", "vehicle_type_id": 2},
        {"id": 90006, "name": "JAC", "vehicle_type_id": 2},
        {"id": 90007, "name": "CAMC", "vehicle_type_id": 2},
        {"id": 90008, "name": "Beiben (North Benz)", "vehicle_type_id": 2},
    ]
    
    for mfr in chinese_manufacturers:
        mfr["_sync_date"] = datetime.now(timezone.utc).isoformat()
        await db.manufacturers.update_one(
            {"id": mfr["id"]},
            {"$set": mfr},
            upsert=True
        )
        print(f"  ✅ {mfr['name']}")
    
    # ============ CHINESE TRUCK MODELS, GENERATIONS, ENGINES ============
    print("\n=== Adding Chinese Truck Models & Data ===")
    
    chinese_trucks = {
        90001: {  # Shacman
            "name": "Shacman",
            "models": [
                {"name": "X3000", "generations": ["X3000 (2016-2021)", "X3000 (2021+)"]},
                {"name": "X5000", "generations": ["X5000 (2020+)"]},
                {"name": "X6000", "generations": ["X6000 (2022+)"]},
                {"name": "F3000", "generations": ["F3000 (2014-2020)", "F3000 (2020+)"]},
                {"name": "H3000", "generations": ["H3000 (2018+)"]},
                {"name": "M3000", "generations": ["M3000 (2015+)"]},
            ]
        },
        90002: {  # Sinotruk HOWO
            "name": "Sinotruk (HOWO)",
            "models": [
                {"name": "HOWO A7", "generations": ["HOWO A7 (2015-2020)", "HOWO A7 (2020+)"]},
                {"name": "HOWO T7H", "generations": ["HOWO T7H (2017+)"]},
                {"name": "HOWO TH7", "generations": ["HOWO TH7 (2021+)"]},
                {"name": "HOWO MAX", "generations": ["HOWO MAX (2022+)"]},
                {"name": "Sitrak C7H", "generations": ["Sitrak C7H (2016+)"]},
                {"name": "Sitrak G7", "generations": ["Sitrak G7 (2020+)"]},
            ]
        },
        90003: {  # FAW
            "name": "FAW",
            "models": [
                {"name": "J6P", "generations": ["J6P (2017-2023)", "J6P (2023+)"]},
                {"name": "J6L", "generations": ["J6L (2016-2022)", "J6L (2022+)"]},
                {"name": "J7", "generations": ["J7 (2020+)"]},
                {"name": "JH6", "generations": ["JH6 (2017+)"]},
                {"name": "Tiger V", "generations": ["Tiger V (2018+)"]},
            ]
        },
        90004: {  # Dongfeng
            "name": "Dongfeng",
            "models": [
                {"name": "Tianlong KL", "generations": ["Tianlong KL (2019+)"]},
                {"name": "Tianlong KX", "generations": ["Tianlong KX (2016+)"]},
                {"name": "Tianlong VL", "generations": ["Tianlong VL (2020+)"]},
                {"name": "Tianjin KR", "generations": ["Tianjin KR (2018+)"]},
                {"name": "Duolika D9", "generations": ["Duolika D9 (2017+)"]},
                {"name": "Captain", "generations": ["Captain (2019+)"]},
            ]
        },
        90005: {  # Foton
            "name": "Foton",
            "models": [
                {"name": "Auman GTL", "generations": ["Auman GTL (2016+)"]},
                {"name": "Auman EST", "generations": ["Auman EST (2019+)"]},
                {"name": "Auman TX", "generations": ["Auman TX (2020+)"]},
                {"name": "Aumark S", "generations": ["Aumark S (2018+)"]},
                {"name": "Ollin", "generations": ["Ollin (2015+)"]},
            ]
        },
        90006: {  # JAC
            "name": "JAC",
            "models": [
                {"name": "Gallop K7", "generations": ["Gallop K7 (2019+)"]},
                {"name": "Gallop V7", "generations": ["Gallop V7 (2018+)"]},
                {"name": "Junling V6", "generations": ["Junling V6 (2017+)"]},
                {"name": "Kangling", "generations": ["Kangling (2016+)"]},
            ]
        },
        90007: {  # CAMC
            "name": "CAMC",
            "models": [
                {"name": "Hanma H9", "generations": ["Hanma H9 (2018+)"]},
                {"name": "Hanma H7", "generations": ["Hanma H7 (2016+)"]},
                {"name": "Hanma H6", "generations": ["Hanma H6 (2015+)"]},
            ]
        },
        90008: {  # Beiben (North Benz)
            "name": "Beiben (North Benz)",
            "models": [
                {"name": "V3", "generations": ["V3 (2016+)"]},
                {"name": "V3ET", "generations": ["V3ET (2019+)"]},
                {"name": "NG80B", "generations": ["NG80B (2015+)"]},
            ]
        },
    }
    
    # Common Chinese truck engines
    engines = [
        "Weichai WP10 336hp", "Weichai WP10 375hp", "Weichai WP10 400hp",
        "Weichai WP12 420hp", "Weichai WP12 460hp", "Weichai WP12 480hp",
        "Weichai WP13 480hp", "Weichai WP13 520hp", "Weichai WP13 550hp",
        "Cummins ISZ 420hp", "Cummins ISZ 460hp", "Cummins ISZ 520hp",
        "Cummins ISL 340hp", "Cummins ISL 375hp",
        "MC11 430hp", "MC11 460hp", "MC13 540hp",
        "Yuchai YC6K 420hp", "Yuchai YC6K 480hp", "Yuchai YC6K 520hp",
        "FAW CA6DM2 420hp", "FAW CA6DM2 460hp", "FAW CA6DM3 550hp",
    ]
    
    model_id_start = 100000
    gen_id_start = 200000
    engine_id_start = 300000
    
    models_added = 0
    gens_added = 0
    engines_added = 0
    
    for mfr_id, mfr_data in chinese_trucks.items():
        print(f"  Processing {mfr_data['name']}...")
        
        for model_info in mfr_data["models"]:
            model_id = model_id_start + models_added
            
            # Add model
            model_doc = {
                "id": model_id,
                "name": model_info["name"],
                "manufacturer": mfr_data["name"],
                "manufacturer_id": mfr_id,
                "vehicle_type_id": 2,
                "_sync_date": datetime.now(timezone.utc).isoformat()
            }
            await db.models.update_one({"id": model_id}, {"$set": model_doc}, upsert=True)
            models_added += 1
            
            for gen_name in model_info["generations"]:
                gen_id = gen_id_start + gens_added
                
                # Add generation
                gen_doc = {
                    "id": gen_id,
                    "name": gen_name,
                    "model_id": model_id,
                    "manufacturer_id": mfr_id,
                    "vehicle_type_id": 2,
                    "_sync_date": datetime.now(timezone.utc).isoformat()
                }
                await db.generations.update_one({"id": gen_id}, {"$set": gen_doc}, upsert=True)
                gens_added += 1
                
                # Add engines for this generation
                for engine_name in engines:
                    engine_id = engine_id_start + engines_added
                    
                    engine_doc = {
                        "id": engine_id,
                        "name": engine_name,
                        "generation_id": gen_id,
                        "model_id": model_id,
                        "manufacturer_id": mfr_id,
                        "vehicle_type_id": 2,
                        "_sync_date": datetime.now(timezone.utc).isoformat()
                    }
                    await db.engines.update_one({"id": engine_id}, {"$set": engine_doc}, upsert=True)
                    engines_added += 1
    
    print(f"\n=== Migration Complete ===")
    print(f"  ✅ Vehicle Types: 5")
    print(f"  ✅ Chinese Manufacturers: {len(chinese_manufacturers)}")
    print(f"  ✅ Models added: {models_added}")
    print(f"  ✅ Generations added: {gens_added}")
    print(f"  ✅ Engines added: {engines_added}")
    
    # Verify
    print("\n=== Verification ===")
    types_count = await db.vehicle_types.count_documents({})
    mfr_count = await db.manufacturers.count_documents({})
    models_count = await db.models.count_documents({})
    
    print(f"  Total vehicle types: {types_count}")
    print(f"  Total manufacturers: {mfr_count}")
    print(f"  Total models: {models_count}")
    
    client.close()
    print("\n✅ Migration completed successfully!")
    print("Please refresh your website (Ctrl+Shift+R) to see the changes.")

if __name__ == "__main__":
    asyncio.run(migrate_data())
