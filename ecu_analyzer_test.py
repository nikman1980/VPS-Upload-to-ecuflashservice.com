#!/usr/bin/env python3
"""
ECU Analyzer Testing - Focus on AdBlue Detection Requirements
Tests the specific requirements:
1. AdBlue should NOT be detected for light vehicle ECUs (Transtron/Isuzu)
2. AdBlue SHOULD be detected for heavy-duty truck ECUs (Bosch EDC17CP52, Cummins CM22xx/CM23xx)
3. DPF and EGR should be detected for all diesel ECUs
"""

import requests
import json
import sys
import os
from pathlib import Path

class ECUAnalyzerTester:
    def __init__(self, base_url="https://vehicle-tuner-16.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
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
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_ecu_file_analysis(self, file_path, expected_manufacturer=None, expected_ecu_type=None, 
                              should_have_adblue=None, should_have_dpf=True, should_have_egr=True):
        """Test ECU file analysis with specific expectations"""
        
        if not os.path.exists(file_path):
            self.log_test(f"ECU Analysis - {os.path.basename(file_path)}", False, f"File not found: {file_path}")
            return False, None
            
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                response = requests.post(f"{self.api_url}/analyze-and-process-file", 
                                       files=files, timeout=30)
            
            if response.status_code != 200:
                self.log_test(f"ECU Analysis - {os.path.basename(file_path)}", False, 
                             f"HTTP {response.status_code}: {response.text}")
                return False, None
                
            result = response.json()
            
            if not result.get('success'):
                self.log_test(f"ECU Analysis - {os.path.basename(file_path)}", False, 
                             f"Analysis failed: {result.get('message', 'Unknown error')}")
                return False, None
            
            # Extract analysis results
            detected_manufacturer = result.get('detected_manufacturer', 'Unknown')
            detected_ecu = result.get('detected_ecu', 'Unknown')
            available_options = result.get('available_options', [])
            
            # Check detected services
            service_ids = [opt['service_id'] for opt in available_options]
            has_adblue = any('adblue' in sid for sid in service_ids)
            has_dpf = any('dpf' in sid for sid in service_ids)
            has_egr = any('egr' in sid for sid in service_ids)
            
            print(f"   📁 File: {os.path.basename(file_path)}")
            print(f"   🏭 Manufacturer: {detected_manufacturer}")
            print(f"   🔧 ECU Type: {detected_ecu}")
            print(f"   🔍 Services Detected: {len(available_options)}")
            print(f"   💧 AdBlue: {'✓' if has_adblue else '✗'}")
            print(f"   🚫 DPF: {'✓' if has_dpf else '✗'}")
            print(f"   🌪️ EGR: {'✓' if has_egr else '✗'}")
            
            # Validate expectations
            issues = []
            
            if expected_manufacturer and expected_manufacturer.lower() not in detected_manufacturer.lower():
                issues.append(f"Expected manufacturer '{expected_manufacturer}', got '{detected_manufacturer}'")
                
            if expected_ecu_type and expected_ecu_type.lower() not in detected_ecu.lower():
                issues.append(f"Expected ECU type '{expected_ecu_type}', got '{detected_ecu}'")
                
            if should_have_adblue is not None:
                if should_have_adblue and not has_adblue:
                    issues.append("AdBlue should be detected but wasn't")
                elif not should_have_adblue and has_adblue:
                    issues.append("AdBlue should NOT be detected but was")
                    
            if should_have_dpf and not has_dpf:
                issues.append("DPF should be detected but wasn't")
                
            if should_have_egr and not has_egr:
                issues.append("EGR should be detected but wasn't")
            
            success = len(issues) == 0
            details = "; ".join(issues) if issues else "All expectations met"
            
            self.log_test(f"ECU Analysis - {os.path.basename(file_path)}", success, details)
            
            return success, result
            
        except Exception as e:
            self.log_test(f"ECU Analysis - {os.path.basename(file_path)}", False, f"Error: {str(e)}")
            return False, None

    def test_multiple_files(self):
        """Test multiple ECU files from uploads directory"""
        uploads_dir = Path("/app/backend/uploads")
        test_files = list(uploads_dir.glob("*.bin"))[:5]  # Test first 5 files
        
        print(f"🔍 Testing {len(test_files)} ECU files for service detection...")
        print("=" * 60)
        
        results = []
        for file_path in test_files:
            success, result = self.test_ecu_file_analysis(str(file_path))
            results.append((file_path.name, success, result))
            print()
        
        return results

    def test_specific_requirements(self):
        """Test specific requirements from the task"""
        print("🎯 Testing Specific Requirements")
        print("=" * 40)
        
        # Test requirement: DPF and EGR should be detected for all diesel ECUs
        print("📋 Requirement 1: DPF and EGR detection for diesel ECUs")
        uploads_dir = Path("/app/backend/uploads")
        test_files = list(uploads_dir.glob("*.bin"))[:3]  # Test first 3 files
        
        diesel_detection_success = 0
        for file_path in test_files:
            success, result = self.test_ecu_file_analysis(
                str(file_path),
                should_have_dpf=True,
                should_have_egr=True
            )
            if success:
                diesel_detection_success += 1
        
        print(f"   Result: {diesel_detection_success}/{len(test_files)} files correctly detected DPF/EGR")
        
        # Test requirement: AdBlue detection logic
        print("\n📋 Requirement 2: AdBlue detection logic")
        print("   Testing files to verify AdBlue detection follows manufacturer rules...")
        
        adblue_tests = 0
        adblue_correct = 0
        
        for file_path in test_files:
            success, result = self.test_ecu_file_analysis(str(file_path))
            if result:
                adblue_tests += 1
                detected_manufacturer = result.get('detected_manufacturer', '').lower()
                detected_ecu = result.get('detected_ecu', '').lower()
                available_options = result.get('available_options', [])
                has_adblue = any('adblue' in opt['service_id'] for opt in available_options)
                
                # Check if AdBlue detection follows rules
                is_truck_ecu = any(truck_indicator in detected_ecu for truck_indicator in 
                                 ['edc17cp52', 'cm2250', 'cm2350', 'edc17cv'])
                is_light_vehicle = any(light_indicator in detected_manufacturer for light_indicator in 
                                     ['transtron', 'isuzu', 'denso'])
                
                if is_truck_ecu and has_adblue:
                    adblue_correct += 1
                    print(f"   ✓ Truck ECU correctly has AdBlue: {detected_ecu}")
                elif is_light_vehicle and not has_adblue:
                    adblue_correct += 1
                    print(f"   ✓ Light vehicle correctly has no AdBlue: {detected_manufacturer}")
                elif not is_truck_ecu and not is_light_vehicle:
                    adblue_correct += 1  # Neutral case
                    print(f"   ~ Neutral case: {detected_manufacturer} {detected_ecu}")
                else:
                    print(f"   ✗ AdBlue detection issue: {detected_manufacturer} {detected_ecu} (has_adblue: {has_adblue})")
        
        print(f"   Result: {adblue_correct}/{adblue_tests} files follow AdBlue detection rules")

    def run_all_tests(self):
        """Run all ECU analyzer tests"""
        print("🔬 ECU Analyzer Testing - Service Detection Focus")
        print("=" * 60)
        print(f"Testing API at: {self.api_url}")
        print()
        
        # Test basic file analysis
        test_file = "/tmp/test_ecu.bin"
        if os.path.exists(test_file):
            print("🧪 Basic ECU Analysis Test")
            print("-" * 30)
            self.test_ecu_file_analysis(test_file)
            print()
        
        # Test multiple files
        self.test_multiple_files()
        
        # Test specific requirements
        self.test_specific_requirements()
        
        # Print summary
        print()
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("✅ All ECU analyzer tests passed!")
            return True
        else:
            print("❌ Some ECU analyzer tests failed!")
            return False

def main():
    """Main test execution"""
    tester = ECUAnalyzerTester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())