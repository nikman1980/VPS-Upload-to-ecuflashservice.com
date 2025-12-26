#!/usr/bin/env python3
"""
DPFOffService.com Complete Vehicle Database Extractor
======================================================

This script extracts the complete vehicle database from dpfoffservice.com
including all types, brands, models, engines, and ECU types.

Requirements:
    pip install playwright
    playwright install chromium

Usage:
    python dpf_database_extractor.py

Output:
    - dpf_complete_database.json (full database)
    - dpf_extraction_progress.json (progress tracking for resume)

Estimated time: 2-4 hours depending on internet speed
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Check for playwright
try:
    from playwright.async_api import async_playwright, Page
except ImportError:
    print("ERROR: playwright not installed!")
    print("Please run: pip install playwright && playwright install chromium")
    sys.exit(1)

# ==================== CONFIGURATION ====================
# Your dpfoffservice.com credentials
EMAIL = "autolocksmith.fj@gmail.com"
PASSWORD = "Pan6sla6sep6?"

# Output files
OUTPUT_FILE = "dpf_complete_database.json"
PROGRESS_FILE = "dpf_extraction_progress.json"

# Delays (in milliseconds) - increase if you get errors
DELAY_AFTER_LOGIN = 6000
DELAY_AFTER_TYPE_CHANGE = 2000
DELAY_AFTER_BRAND_CHANGE = 2000
DELAY_AFTER_MODEL_CHANGE = 1500
DELAY_AFTER_ENGINE_CHANGE = 1500

# ==================== HELPER FUNCTIONS ====================

def load_progress() -> Dict:
    """Load extraction progress from file"""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {
        "completed_types": [],
        "completed_brands": [],
        "current_type": None,
        "current_brand": None,
        "last_update": None
    }

def save_progress(progress: Dict):
    """Save extraction progress to file"""
    progress["last_update"] = datetime.now().isoformat()
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def save_database(database: Dict):
    """Save database to file"""
    database["last_update"] = datetime.now().isoformat()
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)

async def get_select_options(page: Page, select_index: int) -> List[Dict]:
    """Get all options from a select element by index"""
    return await page.evaluate(f'''() => {{
        const selects = document.querySelectorAll('select');
        if (!selects[{select_index}]) return [];
        return Array.from(selects[{select_index}].options).map(opt => ({{
            id: opt.value,
            name: opt.text.trim()
        }})).filter(opt => opt.name && opt.id);
    }}''')

async def set_select_value(page: Page, select_index: int, value: str):
    """Set a select element value and trigger change event"""
    await page.evaluate(f'''() => {{
        const selects = document.querySelectorAll('select');
        if (selects[{select_index}]) {{
            selects[{select_index}].value = '{value}';
            selects[{select_index}].dispatchEvent(new Event('change', {{ bubbles: true }}));
        }}
    }}''')

# ==================== MAIN EXTRACTION LOGIC ====================

async def login(page: Page) -> bool:
    """Login to dpfoffservice.com"""
    print("🔐 Logging in to dpfoffservice.com...")
    
    try:
        await page.goto("https://dpfoffservice.com/client/login", timeout=60000)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Click initial Login button
        await page.click('button:has-text("Login")', timeout=10000)
        await page.wait_for_timeout(2000)
        
        # Fill credentials
        await page.locator('input[type="email"]').fill(EMAIL)
        await page.locator('input[type="password"]').fill(PASSWORD)
        
        # Submit
        await page.locator('input[type="submit"]').click()
        await page.wait_for_timeout(DELAY_AFTER_LOGIN)
        
        # Verify login success
        if "client" in page.url and "login" not in page.url:
            print("✅ Login successful!")
            return True
        else:
            print("❌ Login failed! Check your credentials.")
            return False
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False

async def go_to_process_file(page: Page) -> bool:
    """Navigate to Process File section"""
    try:
        await page.click('text=Process File', timeout=10000)
        await page.wait_for_timeout(3000)
        print("✅ Opened Process File section")
        return True
    except Exception as e:
        print(f"❌ Error opening Process File: {e}")
        return False

async def extract_database(page: Page, progress: Dict, database: Dict):
    """Main extraction loop"""
    
    # Get all vehicle types
    print("\n📋 Getting vehicle types...")
    types = await get_select_options(page, 0)
    database["vehicle_types"] = types
    print(f"   Found {len(types)} vehicle types: {[t['name'] for t in types]}")
    
    total_vehicles = 0
    
    # Iterate through each vehicle type
    for type_info in types:
        type_id = type_info["id"]
        type_name = type_info["name"]
        
        # Skip if already completed
        if type_id in progress["completed_types"]:
            print(f"\n⏭️  Skipping {type_name} (already completed)")
            continue
        
        print(f"\n{'='*60}")
        print(f"🚗 Processing Type: {type_name}")
        print(f"{'='*60}")
        
        progress["current_type"] = type_id
        
        # Select vehicle type
        await set_select_value(page, 0, type_id)
        await page.wait_for_timeout(DELAY_AFTER_TYPE_CHANGE)
        
        # Get brands for this type
        brands = await get_select_options(page, 1)
        print(f"   Found {len(brands)} brands")
        
        # Initialize type in database if not exists
        if type_name not in database:
            database[type_name] = {"brands": {}}
        
        # Iterate through brands
        for brand_idx, brand_info in enumerate(brands):
            brand_id = brand_info["id"]
            brand_name = brand_info["name"]
            
            # Skip if already completed
            brand_key = f"{type_id}_{brand_id}"
            if brand_key in progress["completed_brands"]:
                continue
            
            progress["current_brand"] = brand_id
            
            print(f"\n   📦 [{brand_idx+1}/{len(brands)}] Processing: {brand_name}")
            
            # Select brand
            await set_select_value(page, 1, brand_id)
            await page.wait_for_timeout(DELAY_AFTER_BRAND_CHANGE)
            
            # Get models
            models = await get_select_options(page, 2)
            
            if not models:
                print(f"      ⚠️  No models found for {brand_name}")
                progress["completed_brands"].append(brand_key)
                save_progress(progress)
                continue
            
            # Initialize brand in database
            if brand_name not in database[type_name]["brands"]:
                database[type_name]["brands"][brand_name] = {
                    "id": brand_id,
                    "models": {}
                }
            
            print(f"      Found {len(models)} models")
            
            # Iterate through models
            for model_info in models:
                model_id = model_info["id"]
                model_name = model_info["name"]
                
                # Select model
                await set_select_value(page, 2, model_id)
                await page.wait_for_timeout(DELAY_AFTER_MODEL_CHANGE)
                
                # Get engines
                engines = await get_select_options(page, 3)
                
                if not engines:
                    continue
                
                # Initialize model in database
                if model_name not in database[type_name]["brands"][brand_name]["models"]:
                    database[type_name]["brands"][brand_name]["models"][model_name] = {
                        "id": model_id,
                        "engines": {}
                    }
                
                # Iterate through engines
                for engine_info in engines:
                    engine_id = engine_info["id"]
                    engine_name = engine_info["name"]
                    
                    # Select engine
                    await set_select_value(page, 3, engine_id)
                    await page.wait_for_timeout(DELAY_AFTER_ENGINE_CHANGE)
                    
                    # Get ECUs
                    ecus = await get_select_options(page, 4)
                    
                    if ecus:
                        database[type_name]["brands"][brand_name]["models"][model_name]["engines"][engine_name] = {
                            "id": engine_id,
                            "ecus": ecus
                        }
                        total_vehicles += 1
                        
                        # Print progress for diesel engines (most relevant)
                        if any(x in engine_name.lower() for x in ['d-4d', 'tdi', 'td', 'dci', 'cdi', 'diesel', 'hdi']):
                            ecu_names = [e['name'] for e in ecus]
                            print(f"         ✅ {model_name} {engine_name}: {ecu_names}")
            
            # Mark brand as completed
            progress["completed_brands"].append(brand_key)
            save_progress(progress)
            save_database(database)
            
            # Progress indicator
            if (brand_idx + 1) % 10 == 0:
                print(f"\n   📊 Progress: {brand_idx+1}/{len(brands)} brands, {total_vehicles} vehicles total")
        
        # Mark type as completed
        progress["completed_types"].append(type_id)
        save_progress(progress)
        save_database(database)
        print(f"\n✅ Completed {type_name}!")
    
    return total_vehicles

async def main():
    """Main entry point"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║     DPFOffService.com Vehicle Database Extractor v1.0        ║
║                                                              ║
║  This will extract the complete vehicle database including:  ║
║  - All vehicle types (Car, Truck, Bus, etc.)                ║
║  - All brands and models                                     ║
║  - All engines and ECU types                                 ║
║                                                              ║
║  Estimated time: 2-4 hours                                   ║
║  Progress is saved automatically - you can resume if needed  ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Load progress and database
    progress = load_progress()
    
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r') as f:
            database = json.load(f)
        print(f"📂 Resuming from existing progress...")
        print(f"   Completed types: {len(progress['completed_types'])}")
        print(f"   Completed brands: {len(progress['completed_brands'])}")
    else:
        database = {
            "source": "dpfoffservice.com",
            "extraction_started": datetime.now().isoformat(),
            "vehicle_types": []
        }
        print("📂 Starting fresh extraction...")
    
    print(f"\n🔑 Using credentials: {EMAIL}")
    print("\n🚀 Starting extraction automatically...")
    
    async with async_playwright() as p:
        # Launch browser (non-headless so you can see progress)
        print("\n🌐 Launching browser...")
        browser = await p.chromium.launch(
            headless=True,  # Run in background
            slow_mo=50      # Slightly faster
        )
        
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1400, "height": 900})
        
        try:
            # Login
            if not await login(page):
                print("❌ Aborting due to login failure")
                return
            
            # Go to Process File
            if not await go_to_process_file(page):
                print("❌ Aborting - could not open Process File")
                return
            
            # Extract database
            start_time = datetime.now()
            total_vehicles = await extract_database(page, progress, database)
            end_time = datetime.now()
            
            # Final save
            database["extraction_completed"] = datetime.now().isoformat()
            database["total_vehicles"] = total_vehicles
            save_database(database)
            
            # Summary
            print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    EXTRACTION COMPLETE!                       ║
╠══════════════════════════════════════════════════════════════╣
║  Total vehicles extracted: {total_vehicles:>6}                          ║
║  Time taken: {str(end_time - start_time).split('.')[0]:>15}                          ║
║                                                              ║
║  Output file: {OUTPUT_FILE:<40} ║
╚══════════════════════════════════════════════════════════════╝
            """)
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Extraction interrupted by user")
            print("   Progress has been saved - run again to resume")
            save_database(database)
            
        except Exception as e:
            print(f"\n\n❌ Error during extraction: {e}")
            print("   Progress has been saved - run again to resume")
            save_database(database)
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
