#!/usr/bin/env python3
"""
Specific tests for the review request scenarios
Tests the exact scenarios mentioned in the review request
"""

import requests
import json
import time

def test_review_request_scenarios():
    """Test the exact scenarios from the review request"""
    base_url = "https://ecu-tune-portal.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🎯 Testing Review Request Scenarios")
    print("=" * 50)
    
    # Test 1: Customer Registration API
    print("\n1. Testing Customer Registration API")
    print("   POST /api/portal/register")
    
    # Use the exact data from review request
    registration_data = {
        "name": "Test User",
        "email": "unique_test_user@example.com", 
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            if result.get('success') and result.get('account_id'):
                print("   ✅ PASS: Returns success=true with account_id")
            else:
                print("   ❌ FAIL: Should return success=true with account_id")
        elif response.status_code == 400:
            result = response.json()
            if "already exists" in result.get('detail', '').lower():
                print("   ✅ PASS: Account already exists (expected)")
            else:
                print(f"   ❌ FAIL: Unexpected 400 response: {result}")
        else:
            print(f"   ❌ FAIL: Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test duplicate email rejection
    print("\n   Testing duplicate email rejection...")
    try:
        dup_response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        if dup_response.status_code == 400:
            dup_result = dup_response.json()
            if "already exists" in dup_result.get('detail', '').lower():
                print("   ✅ PASS: Duplicate email correctly rejected")
            else:
                print(f"   ❌ FAIL: Wrong duplicate email message: {dup_result}")
        else:
            print(f"   ❌ FAIL: Duplicate email should return 400, got {dup_response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test password validation
    print("\n   Testing password validation (too short)...")
    short_pwd_data = {
        "name": "Test User 2",
        "email": f"test_short_pwd_{int(time.time())}@example.com",
        "password": "123"  # Too short
    }
    try:
        pwd_response = requests.post(f"{api_url}/portal/register", json=short_pwd_data, timeout=10)
        if pwd_response.status_code in [400, 422]:
            print("   ✅ PASS: Short password correctly rejected")
        else:
            print(f"   ❌ FAIL: Short password should be rejected, got {pwd_response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 2: Forgot Password API
    print("\n2. Testing Forgot Password API")
    print("   POST /api/portal/forgot-password")
    
    # Use the exact email from review request
    forgot_data = {
        "email": "unique_test_user@example.com"
    }
    
    try:
        response = requests.post(f"{api_url}/portal/forgot-password", json=forgot_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            if result.get('success'):
                print("   ✅ PASS: Returns success message about password reset instructions")
            else:
                print("   ❌ FAIL: Should return success message")
        else:
            print(f"   ❌ FAIL: Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test with non-existent email
    print("\n   Testing with non-existent email...")
    nonexistent_data = {
        "email": "nonexistent_user_12345@example.com"
    }
    try:
        response = requests.post(f"{api_url}/portal/forgot-password", json=nonexistent_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("   ✅ PASS: Non-existent email returns success (security best practice)")
            else:
                print(f"   ❌ FAIL: Should return success for security: {result}")
        else:
            print(f"   ❌ FAIL: Should return 200 for security, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 3: Login Flow
    print("\n3. Testing Login Flow")
    print("   POST /api/portal/login-password")
    
    # Use the newly registered account to login
    login_data = {
        "email": "unique_test_user@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{api_url}/portal/login-password", json=login_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            if result.get('success') and result.get('account'):
                account_info = result.get('account', {})
                print("   ✅ PASS: Successful login returns account info")
                print(f"   Account ID: {account_info.get('id')}")
                print(f"   Account Name: {account_info.get('name')}")
                print(f"   Account Email: {account_info.get('email')}")
            else:
                print("   ❌ FAIL: Should return success=true with account info")
        elif response.status_code == 401:
            print("   ❌ FAIL: Login should succeed with valid credentials")
        else:
            print(f"   ❌ FAIL: Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Review Request Testing Complete")
    print("All three priority fixes have been tested with the exact scenarios specified.")

if __name__ == "__main__":
    test_review_request_scenarios()