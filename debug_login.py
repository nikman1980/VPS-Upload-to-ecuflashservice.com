#!/usr/bin/env python3
"""
Debug login issue
"""

import requests
import json
import time
import hashlib

def debug_login_issue():
    """Debug the login issue"""
    base_url = "https://ecupayfix.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Debugging Login Issue")
    print("=" * 40)
    
    # Create a unique test account
    timestamp = int(time.time())
    test_email = f"debug_test_{timestamp}@example.com"
    test_password = "password123"
    
    print(f"Test email: {test_email}")
    print(f"Test password: {test_password}")
    
    # Calculate expected password hash
    expected_hash = hashlib.sha256(test_password.encode()).hexdigest()
    print(f"Expected password hash: {expected_hash}")
    
    # Step 1: Register account
    print("\n1. Registering account...")
    registration_data = {
        "name": "Debug Test User",
        "email": test_email,
        "password": test_password
    }
    
    try:
        reg_response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        print(f"   Registration status: {reg_response.status_code}")
        
        if reg_response.status_code == 200:
            reg_result = reg_response.json()
            print(f"   Registration result: {json.dumps(reg_result, indent=2)}")
            account_id = reg_result.get('account_id')
            print(f"   Account ID: {account_id}")
        else:
            print(f"   Registration failed: {reg_response.text}")
            return
            
    except Exception as e:
        print(f"   Registration error: {e}")
        return
    
    # Step 2: Wait a moment for database consistency
    print("\n2. Waiting for database consistency...")
    time.sleep(2)
    
    # Step 3: Attempt login
    print("\n3. Attempting login...")
    login_data = {
        "email": test_email,
        "password": test_password
    }
    
    try:
        login_response = requests.post(f"{api_url}/portal/login-password", json=login_data, timeout=10)
        print(f"   Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            print(f"   Login result: {json.dumps(login_result, indent=2)}")
            print("   ✅ LOGIN SUCCESSFUL")
        elif login_response.status_code == 401:
            print(f"   Login failed (401): {login_response.text}")
            print("   ❌ LOGIN FAILED - Invalid credentials")
        else:
            print(f"   Unexpected login status: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            
    except Exception as e:
        print(f"   Login error: {e}")
    
    # Step 4: Test with wrong password
    print("\n4. Testing with wrong password...")
    wrong_login_data = {
        "email": test_email,
        "password": "wrongpassword"
    }
    
    try:
        wrong_response = requests.post(f"{api_url}/portal/login-password", json=wrong_login_data, timeout=10)
        print(f"   Wrong password status: {wrong_response.status_code}")
        
        if wrong_response.status_code == 401:
            print("   ✅ Wrong password correctly rejected")
        else:
            print(f"   ❌ Wrong password should return 401, got {wrong_response.status_code}")
            
    except Exception as e:
        print(f"   Wrong password test error: {e}")

if __name__ == "__main__":
    debug_login_issue()