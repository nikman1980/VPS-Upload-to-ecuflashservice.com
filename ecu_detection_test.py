#!/usr/bin/env python3
"""
ECU Detection Testing - Focused on AdBlue/SCR Detection Requirements
Tests specific ECU files for correct service detection based on binary analysis
"""

import requests
import json
import sys
import os
from datetime import datetime
from pathlib import Path

class ECUDetectionTester:
    def __init__(self, base_url="https://vehicle-tuner-16.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected=None, actual=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
            if expected and actual:
                print(f"   Expected: {expected}")
                print(f"   Actual: {actual}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "expected": expected,
            "actual": actual
        })

    def test_api_connectivity(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                details = f"API responding: {data.get('message', 'OK')}"
            else:
                details = f"HTTP {response.status_code}"
            
            self.log_test("API Connectivity", success, details)
            return success
        except Exception as e:
            self.log_test("API Connectivity", False, f"Connection error: {str(e)}")
            return False

    def analyze_ecu_file(self, file_path, expected_ecu_type=None, expected_adblue=None):
        """Analyze ECU file and return results"""
        if not os.path.exists(file_path):
            return None, f"File not found: {file_path}"
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                response = requests.post(f"{self.api_url}/analyze-and-process-file", 
                                       files=files, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return result, None
                else:
                    return None, f"Analysis failed: {result.get('error', 'Unknown error')}"
            else:
                try:
                    error_data = response.json()
                    return None, f"HTTP {response.status_code}: {error_data.get('detail', 'Unknown error')}"
                except:
                    return None, f"HTTP {response.status_code}"
                    
        except Exception as e:
            return None, f"Request error: {str(e)}"

    def test_cummins_cm2150e_detection(self):
        """Test Cummins CM2150E - MUST detect AdBlue/SCR"""
        file_path = "/tmp/cummins_scr.bin"
        
        result, error = self.analyze_ecu_file(file_path)
        
        if error:
            self.log_test("Cummins CM2150E Detection", False, error)
            return False
        
        # Check ECU type detection
        detected_ecu = result.get('detected_ecu', '')
        detected_manufacturer = result.get('detected_manufacturer', '')
        available_options = result.get('available_options', [])
        
        # Check for Cummins identification
        is_cummins = 'cummins' in detected_ecu.lower() or 'cummins' in detected_manufacturer.lower()
        is_cm2150e = 'cm2150e' in detected_ecu.lower()
        
        # Check for AdBlue/SCR service
        adblue_services = [opt for opt in available_options 
                          if 'adblue' in opt.get('service_name', '').lower() or 
                             'scr' in opt.get('service_name', '').lower()]
        
        has_adblue = len(adblue_services) > 0
        
        success = is_cummins and has_adblue
        
        details = []
        details.append(f"ECU: {detected_ecu}")
        details.append(f"Manufacturer: {detected_manufacturer}")
        details.append(f"Cummins detected: {is_cummins}")
        details.append(f"CM2150E detected: {is_cm2150e}")
        details.append(f"AdBlue/SCR services: {len(adblue_services)}")
        
        if adblue_services:
            for svc in adblue_services:
                details.append(f"  - {svc.get('service_name')} (confidence: {svc.get('confidence', 'unknown')})")
                details.append(f"    Indicators: {svc.get('indicators', [])}")
        
        self.log_test("Cummins CM2150E AdBlue Detection", success, 
                     "\n   ".join(details),
                     "Cummins CM2150E with AdBlue/SCR service",
                     f"ECU: {detected_ecu}, AdBlue services: {len(adblue_services)}")
        
        return success

    def test_transtron_no_adblue(self):
        """Test Transtron ECU - must NOT detect AdBlue (light vehicle)"""
        file_path = "/app/backend/uploads/00157b8e-1b85-42da-9d65-f69fe8cdaf42_original.bin"
        
        result, error = self.analyze_ecu_file(file_path)
        
        if error:
            self.log_test("Transtron No AdBlue Detection", False, error)
            return False
        
        # Check ECU type detection
        detected_ecu = result.get('detected_ecu', '')
        detected_manufacturer = result.get('detected_manufacturer', '')
        available_options = result.get('available_options', [])
        
        # Check for Transtron identification
        is_transtron = 'transtron' in detected_ecu.lower() or 'transtron' in detected_manufacturer.lower()
        
        # Check for AdBlue/SCR service (should NOT be present)
        adblue_services = [opt for opt in available_options 
                          if 'adblue' in opt.get('service_name', '').lower() or 
                             'scr' in opt.get('service_name', '').lower()]
        
        has_adblue = len(adblue_services) > 0
        
        # Success = Transtron detected AND no AdBlue services
        success = is_transtron and not has_adblue
        
        details = []
        details.append(f"ECU: {detected_ecu}")
        details.append(f"Manufacturer: {detected_manufacturer}")
        details.append(f"Transtron detected: {is_transtron}")
        details.append(f"AdBlue/SCR services: {len(adblue_services)} (should be 0)")
        
        if adblue_services:
            details.append("❌ UNEXPECTED AdBlue services found:")
            for svc in adblue_services:
                details.append(f"  - {svc.get('service_name')} (confidence: {svc.get('confidence', 'unknown')})")
        
        # Show other detected services
        other_services = [opt for opt in available_options if opt not in adblue_services]
        if other_services:
            details.append(f"Other services detected: {len(other_services)}")
            for svc in other_services[:3]:  # Show first 3
                details.append(f"  - {svc.get('service_name')}")
        
        self.log_test("Transtron No AdBlue Detection", success, 
                     "\n   ".join(details),
                     "Transtron ECU with NO AdBlue/SCR service",
                     f"ECU: {detected_ecu}, AdBlue services: {len(adblue_services)}")
        
        return success

    def test_bosch_edc17cp52_adblue(self):
        """Test Bosch EDC17CP52 - MUST detect AdBlue/SCR (truck ECU)"""
        file_path = "/app/backend/uploads/fcdc6910-1c26-4df4-b267-f0486a498b54_original.bin"
        
        result, error = self.analyze_ecu_file(file_path)
        
        if error:
            self.log_test("Bosch EDC17CP52 AdBlue Detection", False, error)
            return False
        
        # Check ECU type detection
        detected_ecu = result.get('detected_ecu', '')
        detected_manufacturer = result.get('detected_manufacturer', '')
        available_options = result.get('available_options', [])
        
        # Check for Bosch identification
        is_bosch = 'bosch' in detected_ecu.lower() or 'bosch' in detected_manufacturer.lower()
        is_edc17cp52 = 'edc17cp52' in detected_ecu.lower()
        
        # Check for AdBlue/SCR service
        adblue_services = [opt for opt in available_options 
                          if 'adblue' in opt.get('service_name', '').lower() or 
                             'scr' in opt.get('service_name', '').lower()]
        
        has_adblue = len(adblue_services) > 0
        
        success = is_bosch and has_adblue
        
        details = []
        details.append(f"ECU: {detected_ecu}")
        details.append(f"Manufacturer: {detected_manufacturer}")
        details.append(f"Bosch detected: {is_bosch}")
        details.append(f"EDC17CP52 detected: {is_edc17cp52}")
        details.append(f"AdBlue/SCR services: {len(adblue_services)}")
        
        if adblue_services:
            for svc in adblue_services:
                details.append(f"  - {svc.get('service_name')} (confidence: {svc.get('confidence', 'unknown')})")
                details.append(f"    Indicators: {svc.get('indicators', [])}")
        
        self.log_test("Bosch EDC17CP52 AdBlue Detection", success, 
                     "\n   ".join(details),
                     "Bosch EDC17CP52 with AdBlue/SCR service",
                     f"ECU: {detected_ecu}, AdBlue services: {len(adblue_services)}")
        
        return success

    def test_dpf_detection_across_files(self):
        """Test DPF detection across multiple diesel ECU files"""
        test_files = [
            ("/tmp/cummins_scr.bin", "Cummins CM2150E"),
            ("/app/backend/uploads/00157b8e-1b85-42da-9d65-f69fe8cdaf42_original.bin", "Transtron"),
            ("/app/backend/uploads/fcdc6910-1c26-4df4-b267-f0486a498b54_original.bin", "Bosch EDC17CP52")
        ]
        
        dpf_results = []
        
        for file_path, description in test_files:
            if not os.path.exists(file_path):
                dpf_results.append((description, False, "File not found"))
                continue
                
            result, error = self.analyze_ecu_file(file_path)
            
            if error:
                dpf_results.append((description, False, error))
                continue
            
            available_options = result.get('available_options', [])
            dpf_services = [opt for opt in available_options 
                           if 'dpf' in opt.get('service_name', '').lower()]
            
            has_dpf = len(dpf_services) > 0
            dpf_results.append((description, has_dpf, f"{len(dpf_services)} DPF services"))
        
        # Count successful DPF detections
        successful_dpf = sum(1 for _, has_dpf, _ in dpf_results if has_dpf)
        total_files = len([r for r in dpf_results if "File not found" not in r[2]])
        
        # Success if at least 2 out of 3 files have DPF (diesel ECUs should have DPF)
        success = successful_dpf >= 2
        
        details = []
        details.append(f"DPF detection results ({successful_dpf}/{total_files} files):")
        for description, has_dpf, info in dpf_results:
            status = "✓" if has_dpf else "✗"
            details.append(f"  {status} {description}: {info}")
        
        self.log_test("DPF Detection Across Files", success, 
                     "\n   ".join(details),
                     f"At least 2/{total_files} files with DPF",
                     f"{successful_dpf}/{total_files} files with DPF")
        
        return success

    def test_egr_detection_across_files(self):
        """Test EGR detection across multiple diesel ECU files"""
        test_files = [
            ("/tmp/cummins_scr.bin", "Cummins CM2150E"),
            ("/app/backend/uploads/00157b8e-1b85-42da-9d65-f69fe8cdaf42_original.bin", "Transtron"),
            ("/app/backend/uploads/fcdc6910-1c26-4df4-b267-f0486a498b54_original.bin", "Bosch EDC17CP52")
        ]
        
        egr_results = []
        
        for file_path, description in test_files:
            if not os.path.exists(file_path):
                egr_results.append((description, False, "File not found"))
                continue
                
            result, error = self.analyze_ecu_file(file_path)
            
            if error:
                egr_results.append((description, False, error))
                continue
            
            available_options = result.get('available_options', [])
            egr_services = [opt for opt in available_options 
                           if 'egr' in opt.get('service_name', '').lower()]
            
            has_egr = len(egr_services) > 0
            egr_results.append((description, has_egr, f"{len(egr_services)} EGR services"))
        
        # Count successful EGR detections
        successful_egr = sum(1 for _, has_egr, _ in egr_results if has_egr)
        total_files = len([r for r in egr_results if "File not found" not in r[2]])
        
        # Success if at least 2 out of 3 files have EGR (diesel ECUs should have EGR)
        success = successful_egr >= 2
        
        details = []
        details.append(f"EGR detection results ({successful_egr}/{total_files} files):")
        for description, has_egr, info in egr_results:
            status = "✓" if has_egr else "✗"
            details.append(f"  {status} {description}: {info}")
        
        self.log_test("EGR Detection Across Files", success, 
                     "\n   ".join(details),
                     f"At least 2/{total_files} files with EGR",
                     f"{successful_egr}/{total_files} files with EGR")
        
        return success

    def test_service_pricing_in_response(self):
        """Test that service pricing is included in analysis response"""
        file_path = "/tmp/cummins_scr.bin"
        
        result, error = self.analyze_ecu_file(file_path)
        
        if error:
            self.log_test("Service Pricing in Response", False, error)
            return False
        
        available_options = result.get('available_options', [])
        
        if not available_options:
            self.log_test("Service Pricing in Response", False, "No services detected")
            return False
        
        # Check that each service has pricing information
        pricing_issues = []
        valid_services = 0
        
        for option in available_options:
            service_name = option.get('service_name', 'Unknown')
            price = option.get('price')
            
            if price is None:
                pricing_issues.append(f"{service_name}: No price")
            elif not isinstance(price, (int, float)) or price < 0:
                pricing_issues.append(f"{service_name}: Invalid price ({price})")
            else:
                valid_services += 1
        
        success = len(pricing_issues) == 0 and valid_services > 0
        
        details = []
        details.append(f"Services with valid pricing: {valid_services}/{len(available_options)}")
        
        if pricing_issues:
            details.append("Pricing issues:")
            for issue in pricing_issues:
                details.append(f"  - {issue}")
        else:
            details.append("Sample pricing:")
            for option in available_options[:3]:  # Show first 3
                details.append(f"  - {option.get('service_name')}: ${option.get('price', 0):.2f}")
        
        self.log_test("Service Pricing in Response", success, 
                     "\n   ".join(details),
                     "All services have valid pricing",
                     f"{valid_services}/{len(available_options)} services with valid pricing")
        
        return success

    def run_all_tests(self):
        """Run all ECU detection tests"""
        print("🔬 ECU Detection Testing - AdBlue/SCR Analysis")
        print("=" * 60)
        print(f"Testing API at: {self.api_url}")
        print()
        
        # Test basic connectivity first
        if not self.test_api_connectivity():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        print("\n🧪 Testing Specific ECU Detection Requirements")
        print("-" * 50)
        
        # Test specific ECU files for AdBlue detection
        self.test_cummins_cm2150e_detection()
        self.test_transtron_no_adblue()
        self.test_bosch_edc17cp52_adblue()
        
        print("\n🔍 Testing General Service Detection")
        print("-" * 40)
        
        # Test DPF and EGR detection across files
        self.test_dpf_detection_across_files()
        self.test_egr_detection_across_files()
        
        # Test service pricing
        self.test_service_pricing_in_response()
        
        # Print summary
        print()
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("✅ All ECU detection tests passed!")
            return True
        else:
            print("❌ Some ECU detection tests failed!")
            failed_tests = [r for r in self.test_results if not r['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}")
                if test['details']:
                    print(f"    {test['details']}")
            return False

def main():
    """Main test execution"""
    tester = ECUDetectionTester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())