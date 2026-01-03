#!/usr/bin/env python3
"""
Final test of the exact review request scenarios with fresh data
"""

import requests
import json
import time

def test_exact_review_scenarios():
    """Test the exact scenarios from the review request with fresh data"""
    base_url = "https://ecupayfix.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🎯 Final Test: Exact Review Request Scenarios")
    print("=" * 60)
    
    # Use a fresh unique email for this test
    timestamp = int(time.time())
    test_email = f"unique_test_user_{timestamp}@example.com"
    
    # Test 1: Customer Registration API
    print("\n1. Customer Registration API")
    print("   POST /api/portal/register")
    print(f"   Testing with: {test_email}")
    
    registration_data = {
        "name": "Test User",
        "email": test_email,
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('account_id'):
                print(f"   ✅ PASS: Returns {{'success': true}} with account_id: {result.get('account_id')}")
            else:
                print(f"   ❌ FAIL: Expected success=true with account_id, got: {result}")
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return
    
    # Test duplicate email rejection
    print("\n   Testing duplicate email rejection...")
    try:
        dup_response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        if dup_response.status_code == 400:
            print("   ✅ PASS: Duplicate email correctly rejected")
        else:
            print(f"   ❌ FAIL: Expected 400 for duplicate, got {dup_response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test password validation
    print("\n   Testing password validation (too short)...")
    short_pwd_data = {
        "name": "Test User 2",
        "email": f"test_short_{timestamp}@example.com",
        "password": "123"
    }
    try:
        pwd_response = requests.post(f"{api_url}/portal/register", json=short_pwd_data, timeout=10)
        if pwd_response.status_code in [400, 422]:
            print("   ✅ PASS: Short password correctly rejected")
        else:
            print(f"   ❌ FAIL: Expected 400/422 for short password, got {pwd_response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 2: Forgot Password API
    print("\n2. Forgot Password API")
    print("   POST /api/portal/forgot-password")
    
    forgot_data = {
        "email": test_email
    }
    
    try:
        response = requests.post(f"{api_url}/portal/forgot-password", json=forgot_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ PASS: Returns success message about password reset instructions")
                print(f"   Message: {result.get('message')}")
            else:
                print(f"   ❌ FAIL: Expected success=true, got: {result}")
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test with non-existent email
    print("\n   Testing with non-existent email...")
    nonexistent_data = {
        "email": f"nonexistent_{timestamp}@example.com"
    }
    try:
        response = requests.post(f"{api_url}/portal/forgot-password", json=nonexistent_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("   ✅ PASS: Non-existent email returns success (security best practice)")
            else:
                print(f"   ❌ FAIL: Should return success for security, got: {result}")
        else:
            print(f"   ❌ FAIL: Expected 200 for security, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 3: Login Flow
    print("\n3. Login Flow")
    print("   POST /api/portal/login-password")
    print("   Using the newly registered account to login")
    
    # Wait a moment for database consistency
    time.sleep(1)
    
    login_data = {
        "email": test_email,
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{api_url}/portal/login-password", json=login_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('account'):
                account_info = result.get('account', {})
                print(f"   ✅ PASS: Successful login returns account info")
                print(f"   Account ID: {account_info.get('id')}")
                print(f"   Account Name: {account_info.get('name')}")
                print(f"   Account Email: {account_info.get('email')}")
            else:
                print(f"   ❌ FAIL: Expected success=true with account info, got: {result}")
        elif response.status_code == 401:
            print(f"   ❌ FAIL: Login should succeed with valid credentials")
            print(f"   Response: {response.text}")
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n" + "=" * 60)
    print("✅ FINAL TEST COMPLETE")
    print("All three priority fixes tested with exact review request scenarios.")

if __name__ == "__main__":
    test_exact_review_scenarios()