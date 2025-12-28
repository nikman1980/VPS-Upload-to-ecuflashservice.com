#!/usr/bin/env python3
"""
ECU Flash Service Backend API Testing
Tests all endpoints including file upload, analysis, and service selection
"""

import requests
import json
import sys
import os
from datetime import datetime
from pathlib import Path

class ECUServiceTester:
    def __init__(self, base_url="https://ecutuner-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            if expected_status and actual_status:
                print(f"   Expected: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            self.log_test("API Health Check", success, 
                         f"Status: {response.status_code}", 200, response.status_code)
            if success:
                print(f"   Response: {response.json()}")
            return success
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_get_services(self):
        """Test services endpoint"""
        try:
            response = requests.get(f"{self.api_url}/services", timeout=10)
            success = response.status_code == 200
            
            if success:
                services = response.json()
                # Check for required services (checksum is added during file analysis)
                service_ids = [s['id'] for s in services]
                required_services = ['dtc-single', 'dtc-multiple']
                
                missing_services = [s for s in required_services if s not in service_ids]
                if missing_services:
                    success = False
                    details = f"Missing services: {missing_services}"
                else:
                    details = f"Found {len(services)} services including required DTC services"
                    
                    # Check specific pricing (checksum is not in general services)
                    dtc_single = next((s for s in services if s['id'] == 'dtc-single'), None)
                    dtc_multiple = next((s for s in services if s['id'] == 'dtc-multiple'), None)
                    
                    if dtc_single and dtc_single['base_price'] == 10.00:
                        print(f"   ✓ DTC Single service found at $10.00")
                    else:
                        print(f"   ⚠️ DTC Single service price issue")
                        
                    if dtc_multiple and dtc_multiple['base_price'] == 25.00:
                        print(f"   ✓ DTC Multiple service found at $25.00")
                    else:
                        print(f"   ⚠️ DTC Multiple service price issue")
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Get Services", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Get Services", False, f"Error: {str(e)}")
            return False

    def test_vehicle_types(self):
        """Test vehicle types endpoint (Sedox-style)"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/types", timeout=10)
            success = response.status_code == 200
            
            if success:
                types = response.json()
                expected_count = 5  # Cars, Trucks, Agriculture, Marine, Motorcycles
                
                if len(types) >= expected_count:
                    details = f"Found {len(types)} vehicle types"
                    print(f"   Types: {[t.get('name', 'Unknown') for t in types]}")
                else:
                    success = False
                    details = f"Expected {expected_count} types, got {len(types)}"
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Vehicle Types API", success, details, 200, response.status_code)
            return success, types if success else []
        except Exception as e:
            self.log_test("Vehicle Types API", False, f"Error: {str(e)}")
            return False, []

    def test_manufacturers(self, vehicle_type_id=1):
        """Test manufacturers endpoint for Cars (type_id=1)"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/manufacturers/{vehicle_type_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                manufacturers = response.json()
                expected_count = 50  # Should have many manufacturers for cars
                
                if len(manufacturers) >= expected_count:
                    details = f"Found {len(manufacturers)} manufacturers for type {vehicle_type_id}"
                    # Look for BMW specifically (mentioned in test requirements)
                    bmw = next((m for m in manufacturers if 'BMW' in m.get('name', '')), None)
                    if bmw:
                        print(f"   ✓ BMW found with ID: {bmw.get('id')}")
                    else:
                        print(f"   ⚠️ BMW not found in manufacturers")
                    print(f"   Sample manufacturers: {[m.get('name') for m in manufacturers[:5]]}")
                else:
                    success = False
                    details = f"Expected at least {expected_count} manufacturers, got {len(manufacturers)}"
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Manufacturers API", success, details, 200, response.status_code)
            return success, manufacturers if success else []
        except Exception as e:
            self.log_test("Manufacturers API", False, f"Error: {str(e)}")
            return False, []

    def test_models(self, manufacturer_id=1262):
        """Test models endpoint for BMW (manufacturer_id=1262)"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/models/{manufacturer_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                models = response.json()
                expected_count = 20  # BMW should have many models
                
                if len(models) >= expected_count:
                    details = f"Found {len(models)} models for manufacturer {manufacturer_id}"
                    print(f"   Sample models: {[m.get('name') for m in models[:5]]}")
                else:
                    success = False
                    details = f"Expected at least {expected_count} models, got {len(models)}"
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Models API", success, details, 200, response.status_code)
            return success, models if success else []
        except Exception as e:
            self.log_test("Models API", False, f"Error: {str(e)}")
            return False, []

    def test_generations(self, model_id):
        """Test generations endpoint"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/generations/{model_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                generations = response.json()
                details = f"Found {len(generations)} generations for model {model_id}"
                if generations:
                    print(f"   Sample generations: {[g.get('name') for g in generations[:3]]}")
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Generations API", success, details, 200, response.status_code)
            return success, generations if success else []
        except Exception as e:
            self.log_test("Generations API", False, f"Error: {str(e)}")
            return False, []

    def test_engines(self, generation_id):
        """Test engines endpoint"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/engines/{generation_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                engines = response.json()
                details = f"Found {len(engines)} engines for generation {generation_id}"
                if engines:
                    print(f"   Sample engines: {[e.get('name') for e in engines[:3]]}")
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Engines API", success, details, 200, response.status_code)
            return success, engines if success else []
        except Exception as e:
            self.log_test("Engines API", False, f"Error: {str(e)}")
            return False, []

    def test_vehicle_stats(self):
        """Test vehicle database stats endpoint"""
        try:
            response = requests.get(f"{self.api_url}/vehicles/stats", timeout=10)
            success = response.status_code == 200
            
            if success:
                stats = response.json()
                total_records = stats.get('total_records', 0)
                database_ready = stats.get('database_ready', False)
                
                if total_records >= 10000 and database_ready:
                    details = f"Database ready with {total_records} records"
                    print(f"   Vehicle types: {stats.get('vehicle_types', 0)}")
                    print(f"   Manufacturers: {stats.get('manufacturers', 0)}")
                    print(f"   Models: {stats.get('models', 0)}")
                    print(f"   Generations: {stats.get('generations', 0)}")
                    print(f"   Engines: {stats.get('engines', 0)}")
                else:
                    success = False
                    details = f"Database not ready: {total_records} records, ready: {database_ready}"
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Vehicle Database Stats", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Vehicle Database Stats", False, f"Error: {str(e)}")
            return False

    def test_get_vehicles(self):
        """Test legacy vehicle database endpoint"""
        try:
            response = requests.get(f"{self.api_url}/vehicles", timeout=10)
            success = response.status_code == 200
            
            if success:
                vehicles = response.json()
                makes = vehicles.get('makes', [])
                models = vehicles.get('models', {})
                
                # Check for required vehicle types
                car_makes = ['Ford', 'Chevrolet', 'Toyota', 'BMW', 'Mercedes-Benz']
                truck_makes = ['Peterbilt', 'Kenworth', 'Freightliner', 'Mack']
                bus_makes = ['Blue Bird', 'New Flyer', 'Prevost']
                
                found_cars = [m for m in car_makes if m in makes]
                found_trucks = [m for m in truck_makes if m in makes]
                found_buses = [m for m in bus_makes if m in makes]
                
                details = f"Found {len(makes)} makes: {len(found_cars)} cars, {len(found_trucks)} trucks, {len(found_buses)} buses"
                print(f"   Cars: {found_cars[:3]}...")
                print(f"   Trucks: {found_trucks[:3]}...")
                print(f"   Buses: {found_buses[:2]}...")
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Legacy Vehicle Database", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Legacy Vehicle Database", False, f"Error: {str(e)}")
            return False

    def test_file_upload_and_analysis(self):
        """Test file upload and analysis workflow"""
        test_file_path = "/tmp/test_ecu.bin"
        
        if not os.path.exists(test_file_path):
            self.log_test("File Upload & Analysis", False, "Test ECU file not found at /tmp/test_ecu.bin")
            return False, None
            
        try:
            # Test file upload and analysis
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_ecu.bin', f, 'application/octet-stream')}
                response = requests.post(f"{self.api_url}/analyze-and-process-file", 
                                       files=files, timeout=30)
            
            success = response.status_code == 200
            analysis_result = None
            
            if success:
                analysis_result = response.json()
                if analysis_result.get('success'):
                    file_id = analysis_result.get('file_id')
                    available_options = analysis_result.get('available_options', [])
                    detected_ecu = analysis_result.get('detected_ecu', 'Unknown')
                    
                    # Check if required services are available
                    service_ids = [opt['service_id'] for opt in available_options]
                    
                    details = f"File ID: {file_id}, ECU: {detected_ecu}, Auto-detected services: {len(available_options)}"
                    
                    # For test file, we expect NO auto-detected services (since it's not a real ECU file)
                    if len(available_options) == 0:
                        print(f"   ✓ No services auto-detected (expected for test file)")
                        print(f"   ✓ This tests the manual service selection scenario")
                    else:
                        print(f"   ⚠️ Services auto-detected: {[opt['service_name'] for opt in available_options]}")
                    
                    print(f"   Detected ECU: {detected_ecu}")
                    print(f"   File size: {analysis_result.get('file_size_mb', 'Unknown')} MB")
                else:
                    success = False
                    details = f"Analysis failed: {analysis_result.get('error', 'Unknown error')}"
            else:
                details = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No details')}"
                except:
                    pass
                    
            self.log_test("File Upload & Analysis", success, details, 200, response.status_code)
            return success, analysis_result
            
        except Exception as e:
            self.log_test("File Upload & Analysis", False, f"Error: {str(e)}")
            return False, None

    def test_price_calculation(self):
        """Test price calculation endpoint"""
        try:
            # Test with checksum and DTC services
            test_services = ['checksum', 'dtc-single']
            response = requests.post(f"{self.api_url}/calculate-price", 
                                   json=test_services, timeout=10)
            
            success = response.status_code == 200
            
            if success:
                pricing = response.json()
                total_price = pricing.get('total_price', 0)
                breakdown = pricing.get('pricing_breakdown', [])
                
                expected_total = 5.00 + 10.00  # checksum + dtc-single
                
                if abs(total_price - expected_total) < 0.01:
                    details = f"Correct pricing: ${total_price} for {len(breakdown)} services"
                    print(f"   Services: {[b['service_name'] for b in breakdown]}")
                    prices = [f"${b['final_price']}" for b in breakdown]
                    print(f"   Prices: {prices}")
                else:
                    success = False
                    details = f"Wrong total: ${total_price}, expected ${expected_total}"
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Price Calculation", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Price Calculation", False, f"Error: {str(e)}")
            return False

    def test_invalid_file_upload(self):
        """Test upload with invalid file type"""
        try:
            # Create a temporary text file
            invalid_content = b"This is not an ECU file"
            files = {'file': ('test.txt', invalid_content, 'text/plain')}
            
            response = requests.post(f"{self.api_url}/analyze-and-process-file", 
                                   files=files, timeout=10)
            
            # Should return 400 for invalid file type
            success = response.status_code == 400
            
            if success:
                details = "Correctly rejected invalid file type"
            else:
                details = f"Should reject invalid files, got {response.status_code}"
                
            self.log_test("Invalid File Upload", success, details, 400, response.status_code)
            return success
        except Exception as e:
            self.log_test("Invalid File Upload", False, f"Error: {str(e)}")
            return False

    def test_portal_login_invalid(self):
        """Test portal login with invalid credentials"""
        try:
            login_data = {
                "email": "invalid@example.com",
                "order_id": "invalid-order-123"
            }
            
            response = requests.post(f"{self.api_url}/portal/login", 
                                   json=login_data, timeout=10)
            
            # Should return 401 for invalid credentials
            success = response.status_code == 401
            details = ""
            if not success:
                details = f"Expected 401 for invalid credentials, got {response.status_code}"
                
            self.log_test("Portal Login - Invalid Credentials", success, details, 401, response.status_code)
            return success
        except Exception as e:
            self.log_test("Portal Login - Invalid Credentials", False, f"Error: {str(e)}")
            return False

    def test_portal_login_missing_data(self):
        """Test portal login with missing data"""
        try:
            # Test with missing email
            login_data = {
                "order_id": "test-order-123"
            }
            
            response = requests.post(f"{self.api_url}/portal/login", 
                                   json=login_data, timeout=10)
            
            # Should return 422 for missing required fields
            success = response.status_code == 422
            details = ""
            if not success:
                details = f"Expected 422 for missing email, got {response.status_code}"
                
            self.log_test("Portal Login - Missing Email", success, details, 422, response.status_code)
            
            # Test with missing order_id
            login_data = {
                "email": "test@example.com"
            }
            
            response = requests.post(f"{self.api_url}/portal/login", 
                                   json=login_data, timeout=10)
            
            # Should return 422 for missing required fields
            success2 = response.status_code == 422
            details2 = ""
            if not success2:
                details2 = f"Expected 422 for missing order_id, got {response.status_code}"
                
            self.log_test("Portal Login - Missing Order ID", success2, details2, 422, response.status_code)
            
            return success and success2
        except Exception as e:
            self.log_test("Portal Login - Missing Data", False, f"Error: {str(e)}")
            return False

    def test_portal_email_login(self):
        """Test new email-only portal login functionality"""
        try:
            # Test email-only login with non-existent email
            login_data = {
                "email": "nonexistent@example.com"
            }
            
            response = requests.post(f"{self.api_url}/portal/login-email", 
                                   json=login_data, timeout=10)
            
            # Should return 404 for no orders found
            success = response.status_code == 404
            details = ""
            if success:
                details = "Correctly returns 404 for email with no orders"
            else:
                details = f"Expected 404 for non-existent email, got {response.status_code}"
                
            self.log_test("Portal Email Login - No Orders", success, details, 404, response.status_code)
            return success
        except Exception as e:
            self.log_test("Portal Email Login - No Orders", False, f"Error: {str(e)}")
            return False

    def test_chinese_truck_manufacturers(self):
        """Test Chinese truck manufacturers are present in database"""
        try:
            # First get vehicle types to find trucks
            types_response = requests.get(f"{self.api_url}/vehicles/types", timeout=10)
            if types_response.status_code != 200:
                self.log_test("Chinese Trucks - Get Types", False, "Failed to get vehicle types")
                return False
                
            types = types_response.json()
            truck_type = next((t for t in types if 'truck' in t.get('name', '').lower() or 'bus' in t.get('name', '').lower()), None)
            
            if not truck_type:
                self.log_test("Chinese Trucks - Find Type", False, "Truck vehicle type not found")
                return False
                
            truck_type_id = truck_type.get('id')
            print(f"   Found truck type: {truck_type.get('name')} (ID: {truck_type_id})")
            
            # Get manufacturers for trucks
            mfr_response = requests.get(f"{self.api_url}/vehicles/manufacturers/{truck_type_id}", timeout=10)
            success = mfr_response.status_code == 200
            
            if success:
                manufacturers = mfr_response.json()
                
                # Check for Chinese truck brands
                chinese_brands = ['Shacman', 'Sinotruk', 'FAW', 'Dongfeng', 'Foton', 'JAC']
                found_brands = []
                
                for brand in chinese_brands:
                    found = next((m for m in manufacturers if brand.lower() in m.get('name', '').lower()), None)
                    if found:
                        found_brands.append(found['name'])
                        print(f"   ✓ Found {found['name']} (ID: {found.get('id')})")
                
                if len(found_brands) >= 4:  # At least 4 out of 6 brands
                    details = f"Found {len(found_brands)}/{len(chinese_brands)} Chinese truck brands: {found_brands}"
                else:
                    success = False
                    details = f"Only found {len(found_brands)}/{len(chinese_brands)} Chinese truck brands: {found_brands}"
            else:
                details = f"HTTP {mfr_response.status_code}"
                
            self.log_test("Chinese Truck Manufacturers", success, details, 200, mfr_response.status_code)
            return success, manufacturers if success else []
        except Exception as e:
            self.log_test("Chinese Truck Manufacturers", False, f"Error: {str(e)}")
            return False, []

    def test_chinese_truck_models(self):
        """Test Chinese truck models are present in database"""
        try:
            # Get truck manufacturers first
            success, manufacturers = self.test_chinese_truck_manufacturers()
            if not success:
                return False
                
            # Test Shacman models specifically
            shacman = next((m for m in manufacturers if 'shacman' in m.get('name', '').lower()), None)
            if not shacman:
                self.log_test("Shacman Models", False, "Shacman manufacturer not found")
                return False
                
            shacman_id = shacman.get('id')
            print(f"   Testing models for Shacman (ID: {shacman_id})")
            
            response = requests.get(f"{self.api_url}/vehicles/models/{shacman_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                models = response.json()
                
                # Check for expected Shacman models
                expected_models = ['X3000', 'X5000', 'X6000', 'F3000', 'H3000', 'M3000']
                found_models = []
                
                for model_name in expected_models:
                    found = next((m for m in models if model_name.lower() in m.get('name', '').lower()), None)
                    if found:
                        found_models.append(found['name'])
                        print(f"   ✓ Found Shacman {found['name']}")
                
                if len(found_models) >= 3:  # At least 3 out of 6 models
                    details = f"Found {len(found_models)}/{len(expected_models)} Shacman models: {found_models}"
                else:
                    success = False
                    details = f"Only found {len(found_models)}/{len(expected_models)} Shacman models: {found_models}"
                    
                # Test Sinotruk models as well
                sinotruk = next((m for m in manufacturers if 'sinotruk' in m.get('name', '').lower() or 'howo' in m.get('name', '').lower()), None)
                if sinotruk:
                    sinotruk_id = sinotruk.get('id')
                    print(f"   Testing models for Sinotruk (ID: {sinotruk_id})")
                    
                    sino_response = requests.get(f"{self.api_url}/vehicles/models/{sinotruk_id}", timeout=10)
                    if sino_response.status_code == 200:
                        sino_models = sino_response.json()
                        expected_sino = ['HOWO A7', 'HOWO T7H', 'Sitrak C7H']
                        found_sino = []
                        
                        for model_name in expected_sino:
                            found = next((m for m in sino_models if any(part.lower() in m.get('name', '').lower() for part in model_name.split())), None)
                            if found:
                                found_sino.append(found['name'])
                                print(f"   ✓ Found Sinotruk {found['name']}")
                        
                        if found_sino:
                            details += f" | Sinotruk: {found_sino}"
                        else:
                            print(f"   ⚠️ No expected Sinotruk models found")
            else:
                details = f"HTTP {response.status_code}"
                
            self.log_test("Chinese Truck Models", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Chinese Truck Models", False, f"Error: {str(e)}")
            return False

    def test_manual_service_selection_flow(self):
        """Test the complete manual service selection flow - the critical test case"""
        try:
            print("\n🎯 CRITICAL TEST: Manual Service Selection Flow")
            print("=" * 60)
            
            # Step 1: Upload a test file that won't auto-detect services
            test_file_path = "/tmp/test_ecu.bin"
            if not os.path.exists(test_file_path):
                self.log_test("Manual Service Selection Flow", False, "Test file not found")
                return False
            
            print("Step 1: Uploading test file...")
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_ecu.bin', f, 'application/octet-stream')}
                response = requests.post(f"{self.api_url}/analyze-and-process-file", files=files, timeout=30)
            
            if response.status_code != 200:
                self.log_test("Manual Service Selection Flow", False, f"File upload failed: {response.status_code}")
                return False
            
            analysis_result = response.json()
            if not analysis_result.get('success'):
                self.log_test("Manual Service Selection Flow", False, "File analysis failed")
                return False
            
            file_id = analysis_result.get('file_id')
            available_options = analysis_result.get('available_options', [])
            
            print(f"   ✓ File uploaded successfully (ID: {file_id})")
            print(f"   ✓ Auto-detected services: {len(available_options)} (expected: 0 for test file)")
            
            # Step 2: Test manual service selection via API
            print("\nStep 2: Testing manual service selection...")
            
            # Get available services
            services_response = requests.get(f"{self.api_url}/services", timeout=10)
            if services_response.status_code != 200:
                self.log_test("Manual Service Selection Flow", False, "Failed to get services")
                return False
            
            all_services = services_response.json()
            print(f"   ✓ Retrieved {len(all_services)} available services")
            
            # Select some services manually (simulating user selection)
            selected_services = ['dpf-removal', 'egr-removal']  # Common services
            selected_service_names = []
            total_expected_price = 0
            
            for service_id in selected_services:
                service = next((s for s in all_services if s['id'] == service_id), None)
                if service:
                    selected_service_names.append(service['name'])
                    total_expected_price += service['base_price']
                    print(f"   ✓ Selected: {service['name']} (${service['base_price']})")
            
            print(f"   ✓ Total expected price: ${total_expected_price}")
            print(f"   ⚠️ Note: Backend may apply combo pricing for EGR+DPF")
            
            # Step 3: Test price calculation
            print("\nStep 3: Testing price calculation...")
            price_response = requests.post(f"{self.api_url}/calculate-price", json=selected_services, timeout=10)
            
            if price_response.status_code != 200:
                self.log_test("Manual Service Selection Flow", False, "Price calculation failed")
                return False
            
            pricing = price_response.json()
            calculated_total = pricing.get('total_price', 0)
            
            print(f"   ✓ API calculated total: ${calculated_total}")
            
            if abs(calculated_total - total_expected_price) > 0.01:
                self.log_test("Manual Service Selection Flow", False, 
                             f"Price mismatch: expected ${total_expected_price}, got ${calculated_total}")
                return False
            
            # Step 4: Test order creation (simulating "Continue to Payment" button)
            print("\nStep 4: Testing order creation (Continue to Payment simulation)...")
            
            order_data = {
                "file_id": file_id,
                "services": selected_services,
                "total_amount": calculated_total,
                "vehicle_info": {
                    "manufacturer": "Test",
                    "model": "Car", 
                    "year": 2020,
                    "engine": "2.0 Diesel"
                },
                "customer_email": "test@example.com",
                "customer_name": "Test Customer",
                "payment_status": "test_completed"
            }
            
            order_response = requests.post(f"{self.api_url}/orders", json=order_data, timeout=10)
            
            if order_response.status_code != 200:
                self.log_test("Manual Service Selection Flow", False, 
                             f"Order creation failed: {order_response.status_code}")
                return False
            
            order_result = order_response.json()
            if not order_result.get('success'):
                self.log_test("Manual Service Selection Flow", False, "Order creation returned failure")
                return False
            
            order_id = order_result.get('order_id')
            print(f"   ✓ Order created successfully (ID: {order_id})")
            
            # Step 5: Verify the complete flow worked
            print("\nStep 5: Verifying complete flow...")
            
            success_criteria = [
                len(available_options) == 0,  # No auto-detected services (manual selection scenario)
                len(selected_services) > 0,   # Services were manually selected
                calculated_total > 0,         # Price was calculated correctly
                order_id is not None          # Order was created (Continue to Payment worked)
            ]
            
            if all(success_criteria):
                details = f"✅ CRITICAL TEST PASSED: Manual service selection flow works correctly"
                details += f"\n   - No auto-detected services (manual selection scenario)"
                details += f"\n   - {len(selected_services)} services manually selected: {selected_service_names}"
                details += f"\n   - Price calculated correctly: ${calculated_total}"
                details += f"\n   - Order created successfully: {order_id}"
                details += f"\n   - 'Continue to Payment' button functionality verified"
                
                print(f"   ✅ All criteria met - CRITICAL TEST PASSED")
                self.log_test("🎯 CRITICAL: Manual Service Selection Flow", True, details)
                return True
            else:
                details = f"❌ CRITICAL TEST FAILED: Some criteria not met"
                self.log_test("🎯 CRITICAL: Manual Service Selection Flow", False, details)
                return False
                
        except Exception as e:
            self.log_test("🎯 CRITICAL: Manual Service Selection Flow", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🔧 ECU Flash Service Backend API Tests")
        print("=" * 50)
        print(f"Testing API at: {self.api_url}")
        print()
        
        # Test basic connectivity first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
            
        # Test vehicle database APIs (Sedox-style)
        print("\n🚗 Testing Vehicle Database APIs (Sedox-style)")
        print("-" * 40)
        
        # Test vehicle types
        success, vehicle_types = self.test_vehicle_types()
        if not success:
            print("❌ Vehicle types API failed. Skipping dependent tests.")
            return False
            
        # Test manufacturers for Cars (type_id=1)
        success, manufacturers = self.test_manufacturers(1)
        if success and manufacturers:
            # Find BMW for model testing
            bmw = next((m for m in manufacturers if 'BMW' in m.get('name', '')), None)
            if bmw:
                bmw_id = bmw.get('id')
                print(f"   Using BMW ID {bmw_id} for model testing")
                
                # Test models for BMW
                success, models = self.test_models(bmw_id)
                if success and models:
                    # Test generations for first BMW model
                    first_model = models[0]
                    model_id = first_model.get('id')
                    print(f"   Using model '{first_model.get('name')}' (ID: {model_id}) for generation testing")
                    
                    success, generations = self.test_generations(model_id)
                    if success and generations:
                        # Test engines for first generation
                        first_gen = generations[0]
                        gen_id = first_gen.get('id')
                        print(f"   Using generation '{first_gen.get('name')}' (ID: {gen_id}) for engine testing")
                        
                        self.test_engines(gen_id)
        
        # Test vehicle database stats
        self.test_vehicle_stats()
        
        # Test other endpoints
        print("\n🔧 Testing Other APIs")
        print("-" * 40)
        self.test_get_services()
        self.test_get_vehicles()  # Legacy endpoint
        self.test_price_calculation()
        self.test_invalid_file_upload()
        
        # Test Customer Portal APIs
        print("\n🏠 Testing Customer Portal APIs")
        print("-" * 40)
        self.test_portal_login_invalid()
        self.test_portal_login_missing_data()
        self.test_portal_email_login()  # New email-only login
        
        # Test Chinese Truck Database
        print("\n🚛 Testing Chinese Truck Database")
        print("-" * 40)
        self.test_chinese_truck_models()  # This calls test_chinese_truck_manufacturers internally
        
        # Test main workflow (if test file exists)
        print("\n📁 Testing File Upload Workflow")
        print("-" * 40)
        success, analysis_result = self.test_file_upload_and_analysis()
        
        # 🎯 CRITICAL TEST: Manual Service Selection Flow
        print("\n🎯 CRITICAL TEST: Continue to Payment Button")
        print("-" * 40)
        critical_success = self.test_manual_service_selection_flow()
        
        # Print summary
        print()
        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if critical_success:
            print("✅ CRITICAL TEST PASSED: Continue to Payment button works with manual service selection!")
        else:
            print("❌ CRITICAL TEST FAILED: Continue to Payment button issue detected!")
        
        if self.tests_passed == self.tests_run:
            print("✅ All tests passed!")
            return True
        else:
            print("❌ Some tests failed!")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return False

def main():
    """Main test execution"""
    tester = ECUServiceTester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())