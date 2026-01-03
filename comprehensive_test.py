#!/usr/bin/env python3
"""
Final comprehensive test with debugging
"""

import requests
import json
import time
import hashlib
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def verify_account_in_db(email, expected_hash):
    """Verify account exists in database with correct hash"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['test_database']
    
    account = await db.portal_accounts.find_one({"email": email})
    if account:
        stored_hash = account.get('password_hash')
        print(f"   DB Check - Stored hash: {stored_hash}")
        print(f"   DB Check - Expected:    {expected_hash}")
        print(f"   DB Check - Match:       {stored_hash == expected_hash}")
        return stored_hash == expected_hash
    else:
        print(f"   DB Check - Account not found!")
        return False

def test_comprehensive_portal_apis():
    """Comprehensive test of all portal APIs"""
    base_url = "https://ecupayfix.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🎯 COMPREHENSIVE PORTAL API TEST")
    print("=" * 60)
    
    # Use a fresh unique email
    timestamp = int(time.time())
    test_email = f"comprehensive_test_{timestamp}@example.com"
    test_password = "password123"
    expected_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    print(f"Test email: {test_email}")
    print(f"Test password: {test_password}")
    print(f"Expected hash: {expected_hash}")
    
    # Test 1: Registration
    print("\n1. CUSTOMER REGISTRATION API")
    print("   POST /api/portal/register")
    
    registration_data = {
        "name": "Test User",
        "email": test_email,
        "password": test_password
    }
    
    try:
        response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('account_id'):
                account_id = result.get('account_id')
                print(f"   ✅ PASS: Registration successful, account_id: {account_id}")
                
                # Verify in database
                print("   Verifying account in database...")
                db_check = asyncio.run(verify_account_in_db(test_email, expected_hash))
                if db_check:
                    print("   ✅ PASS: Account correctly stored in database")
                else:
                    print("   ❌ FAIL: Account not correctly stored in database")
                    return
            else:
                print(f"   ❌ FAIL: Registration response invalid: {result}")
                return
        else:
            print(f"   ❌ FAIL: Registration failed: {response.text}")
            return
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return
    
    # Test 2: Forgot Password
    print("\n2. FORGOT PASSWORD API")
    print("   POST /api/portal/forgot-password")
    
    forgot_data = {"email": test_email}
    
    try:
        response = requests.post(f"{api_url}/portal/forgot-password", json=forgot_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"   ✅ PASS: Forgot password successful")
                print(f"   Message: {result.get('message')}")
            else:
                print(f"   ❌ FAIL: Forgot password response invalid: {result}")
        else:
            print(f"   ❌ FAIL: Forgot password failed: {response.text}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 3: Login Flow (with retries)
    print("\n3. LOGIN FLOW API")
    print("   POST /api/portal/login-password")
    
    login_data = {
        "email": test_email,
        "password": test_password
    }
    
    # Try login with retries to handle any timing issues
    max_retries = 3
    for attempt in range(max_retries):
        print(f"   Attempt {attempt + 1}/{max_retries}")
        
        # Wait a bit for database consistency
        if attempt > 0:
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"   Waiting {wait_time} seconds for database consistency...")
            time.sleep(wait_time)
        
        try:
            response = requests.post(f"{api_url}/portal/login-password", json=login_data, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('account'):
                    account_info = result.get('account', {})
                    print(f"   ✅ PASS: Login successful on attempt {attempt + 1}")
                    print(f"   Account ID: {account_info.get('id')}")
                    print(f"   Account Name: {account_info.get('name')}")
                    print(f"   Account Email: {account_info.get('email')}")
                    break
                else:
                    print(f"   ❌ FAIL: Login response invalid: {result}")
            elif response.status_code == 401:
                print(f"   ❌ FAIL: Invalid credentials (401)")
                print(f"   Response: {response.text}")
                
                # Debug: Check what's in the database again
                print("   Re-checking database...")
                db_check = asyncio.run(verify_account_in_db(test_email, expected_hash))
                if not db_check:
                    print("   Database issue detected!")
                    
            else:
                print(f"   ❌ FAIL: Unexpected status: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
    else:
        print(f"   ❌ FAIL: Login failed after {max_retries} attempts")
    
    print("\n" + "=" * 60)
    print("✅ COMPREHENSIVE TEST COMPLETE")

if __name__ == "__main__":
    test_comprehensive_portal_apis()