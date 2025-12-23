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
    def __init__(self, base_url="https://tunertools.preview.emergentagent.com"):
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

    def test_get_vehicles(self):
        """Test vehicle database endpoint"""
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
                
            self.log_test("Get Vehicle Database", success, details, 200, response.status_code)
            return success
        except Exception as e:
            self.log_test("Get Vehicle Database", False, f"Error: {str(e)}")
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
                    ecu_type = analysis_result.get('ecu_type')
                    
                    # Check if required services are available
                    service_ids = [opt['service_id'] for opt in available_options]
                    
                    has_checksum = 'checksum' in service_ids
                    has_dtc_single = 'dtc-single' in service_ids  
                    has_dtc_multiple = 'dtc-multiple' in service_ids
                    
                    details = f"File ID: {file_id}, ECU: {ecu_type}, Services: {len(available_options)}"
                    
                    if has_checksum:
                        print(f"   ✓ Checksum service available")
                    else:
                        print(f"   ❌ Checksum service missing")
                        success = False
                        
                    if has_dtc_single and has_dtc_multiple:
                        print(f"   ✓ DTC services available (Single & Multiple)")
                    else:
                        print(f"   ❌ DTC services missing")
                        success = False
                        
                    # Check that ECU Type is NOT displayed in response (as per requirement)
                    if 'ecu_type' in analysis_result and analysis_result['ecu_type']:
                        print(f"   ⚠️ ECU Type is being returned: {analysis_result['ecu_type']}")
                        print(f"   Note: Frontend should NOT display ECU Type to user")
                    
                    print(f"   Available services: {[opt['service_name'] for opt in available_options]}")
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
            
        # Test all endpoints
        self.test_get_services()
        self.test_get_vehicles()
        self.test_price_calculation()
        self.test_invalid_file_upload()
        
        # Test main workflow
        success, analysis_result = self.test_file_upload_and_analysis()
        
        # Print summary
        print()
        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
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