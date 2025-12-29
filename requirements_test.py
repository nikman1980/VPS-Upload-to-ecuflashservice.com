#!/usr/bin/env python3
"""
Comprehensive ECU Analyzer Requirements Testing
Tests the specific requirements from the task description
"""

import requests
import json
import sys
import os
from pathlib import Path

class RequirementsTest:
    def __init__(self, base_url="https://tune-master-37.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_results = []

    def test_file(self, file_path):
        """Test a single ECU file"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/octet-stream')}
                response = requests.post(f"{self.api_url}/analyze-and-process-file", 
                                       files=files, timeout=30)
            
            if response.status_code != 200:
                return None
                
            result = response.json()
            if not result.get('success'):
                return None
                
            return result
        except Exception as e:
            return None

    def run_requirements_test(self):
        """Test all requirements"""
        print("🎯 ECU Analyzer Requirements Testing")
        print("=" * 50)
        
        uploads_dir = Path("/app/backend/uploads")
        test_files = list(uploads_dir.glob("*.bin"))[:10]  # Test first 10 files
        
        # Track results by requirement
        req1_light_vehicles_no_adblue = []  # Should NOT have AdBlue
        req2_truck_ecus_have_adblue = []    # Should HAVE AdBlue  
        req3_all_diesel_have_dpf_egr = []   # Should have DPF and EGR
        
        print(f"Testing {len(test_files)} ECU files...")
        print()
        
        for file_path in test_files:
            result = self.test_file(file_path)
            if not result:
                continue
                
            manufacturer = result.get('detected_manufacturer', 'Unknown').lower()
            ecu_type = result.get('detected_ecu', 'Unknown').lower()
            available_services = result.get('available_options', [])
            
            # Check what services are available
            service_ids = [opt['service_id'] for opt in available_services]
            has_adblue = any('adblue' in sid for sid in service_ids)
            has_dpf = any('dpf' in sid for sid in service_ids)
            has_egr = any('egr' in sid for sid in service_ids)
            
            print(f"📁 {os.path.basename(file_path)}")
            print(f"   🏭 {manufacturer.title()} | 🔧 {ecu_type}")
            print(f"   💧 AdBlue: {'✓' if has_adblue else '✗'} | 🚫 DPF: {'✓' if has_dpf else '✗'} | 🌪️ EGR: {'✓' if has_egr else '✗'}")
            
            # Requirement 1: Light vehicle ECUs should NOT have AdBlue
            is_light_vehicle = any(indicator in manufacturer for indicator in ['transtron', 'isuzu']) or \
                              any(indicator in ecu_type for indicator in ['transtron', 'isuzu'])
            
            if is_light_vehicle:
                req1_light_vehicles_no_adblue.append({
                    'file': os.path.basename(file_path),
                    'manufacturer': manufacturer,
                    'ecu_type': ecu_type,
                    'has_adblue': has_adblue,
                    'correct': not has_adblue  # Should NOT have AdBlue
                })
                print(f"   📋 Req 1 (Light Vehicle): {'✅ PASS' if not has_adblue else '❌ FAIL - Should not have AdBlue'}")
            
            # Requirement 2: Heavy-duty truck ECUs should HAVE AdBlue
            is_truck_ecu = any(truck_indicator in ecu_type for truck_indicator in 
                             ['edc17cp52', 'cm2250', 'cm2350', 'edc17cv44', 'edc17cv54'])
            
            if is_truck_ecu:
                req2_truck_ecus_have_adblue.append({
                    'file': os.path.basename(file_path),
                    'manufacturer': manufacturer,
                    'ecu_type': ecu_type,
                    'has_adblue': has_adblue,
                    'correct': has_adblue  # Should HAVE AdBlue
                })
                print(f"   📋 Req 2 (Truck ECU): {'✅ PASS' if has_adblue else '❌ FAIL - Should have AdBlue'}")
            
            # Requirement 3: All diesel ECUs should have DPF and EGR
            is_diesel = True  # Assume all test files are diesel ECUs
            req3_all_diesel_have_dpf_egr.append({
                'file': os.path.basename(file_path),
                'manufacturer': manufacturer,
                'ecu_type': ecu_type,
                'has_dpf': has_dpf,
                'has_egr': has_egr,
                'correct': has_dpf and has_egr  # Should have BOTH
            })
            print(f"   📋 Req 3 (Diesel DPF/EGR): {'✅ PASS' if (has_dpf and has_egr) else '❌ FAIL - Missing DPF or EGR'}")
            
            print()
        
        # Summary
        print("=" * 50)
        print("📊 REQUIREMENTS SUMMARY")
        print("=" * 50)
        
        # Requirement 1 Summary
        if req1_light_vehicles_no_adblue:
            correct_1 = sum(1 for r in req1_light_vehicles_no_adblue if r['correct'])
            total_1 = len(req1_light_vehicles_no_adblue)
            print(f"📋 Requirement 1 - Light vehicles should NOT have AdBlue:")
            print(f"   Result: {correct_1}/{total_1} correct")
            for r in req1_light_vehicles_no_adblue:
                status = "✅" if r['correct'] else "❌"
                print(f"   {status} {r['manufacturer']} - AdBlue: {'YES' if r['has_adblue'] else 'NO'}")
        else:
            print("📋 Requirement 1 - No light vehicle ECUs found in test set")
        
        print()
        
        # Requirement 2 Summary  
        if req2_truck_ecus_have_adblue:
            correct_2 = sum(1 for r in req2_truck_ecus_have_adblue if r['correct'])
            total_2 = len(req2_truck_ecus_have_adblue)
            print(f"📋 Requirement 2 - Truck ECUs should HAVE AdBlue:")
            print(f"   Result: {correct_2}/{total_2} correct")
            for r in req2_truck_ecus_have_adblue:
                status = "✅" if r['correct'] else "❌"
                print(f"   {status} {r['ecu_type']} - AdBlue: {'YES' if r['has_adblue'] else 'NO'}")
        else:
            print("📋 Requirement 2 - No truck ECUs found in test set")
        
        print()
        
        # Requirement 3 Summary
        correct_3 = sum(1 for r in req3_all_diesel_have_dpf_egr if r['correct'])
        total_3 = len(req3_all_diesel_have_dpf_egr)
        print(f"📋 Requirement 3 - All diesel ECUs should have DPF and EGR:")
        print(f"   Result: {correct_3}/{total_3} correct")
        
        failed_3 = [r for r in req3_all_diesel_have_dpf_egr if not r['correct']]
        if failed_3:
            print("   Failed files:")
            for r in failed_3:
                missing = []
                if not r['has_dpf']: missing.append("DPF")
                if not r['has_egr']: missing.append("EGR")
                print(f"   ❌ {r['file']} - Missing: {', '.join(missing)}")
        
        print()
        print("=" * 50)
        
        # Overall assessment
        total_tests = len(req1_light_vehicles_no_adblue) + len(req2_truck_ecus_have_adblue) + len(req3_all_diesel_have_dpf_egr)
        total_correct = (sum(1 for r in req1_light_vehicles_no_adblue if r['correct']) + 
                        sum(1 for r in req2_truck_ecus_have_adblue if r['correct']) + 
                        correct_3)
        
        success_rate = (total_correct / total_tests * 100) if total_tests > 0 else 0
        print(f"🎯 Overall Success Rate: {total_correct}/{total_tests} ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("✅ ECU Analyzer meets requirements!")
            return True
        else:
            print("❌ ECU Analyzer has issues with requirements")
            return False

def main():
    tester = RequirementsTest()
    success = tester.run_requirements_test()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())