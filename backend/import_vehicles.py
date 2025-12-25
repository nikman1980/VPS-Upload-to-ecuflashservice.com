#!/usr/bin/env python3
"""
Vehicle Database Import Script
Downloads and imports vehicle data into MongoDB
"""
import asyncio
import json
import os
import urllib.request
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATA_URL = "https://tunefiles-1.preview.emergentagent.com/vehicle_data_export.json"

async def import_data():
    print("=" * 50)
    print("Vehicle Database Import Script")
    print("=" * 50)
    
    # Download data file
    print("\n1. Downloading vehicle data...")
    try:
        urllib.request.urlretrieve(DATA_URL, "/tmp/vehicle_data.json")
        print("   ✓ Downloaded successfully")
    except Exception as e:
        print(f"   ✗ Download failed: {e}")
        return
    
    # Load JSON data
    print("\n2. Loading JSON data...")
    with open("/tmp/vehicle_data.json", "r") as f:
        data = json.load(f)
    print("   ✓ JSON loaded")
    
    # Connect to MongoDB
    print("\n3. Connecting to MongoDB...")
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'ecuflash_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    print(f"   ✓ Connected to {db_name}")
    
    # Import collections
    collections = ['vehicle_types', 'manufacturers', 'models', 'generations', 'engines']
    
    print("\n4. Importing collections...")
    for col_name in collections:
        if col_name in data:
            # Clear existing data
            await db[col_name].delete_many({})
            
            # Insert new data
            if data[col_name]:
                await db[col_name].insert_many(data[col_name])
            
            print(f"   ✓ {col_name}: {len(data[col_name])} records imported")
        else:
            print(f"   ✗ {col_name}: Not found in data file")
    
    # Verify import
    print("\n5. Verifying import...")
    total = 0
    for col_name in collections:
        count = await db[col_name].count_documents({})
        print(f"   {col_name}: {count} records")
        total += count
    
    print(f"\n{'=' * 50}")
    print(f"✓ Import complete! Total: {total} records")
    print(f"{'=' * 50}")

if __name__ == "__main__":
    asyncio.run(import_data())
