#!/usr/bin/env python3
"""
Debug registration password hashing
"""

import requests
import json
import time
import hashlib

def debug_registration():
    """Debug what happens during registration"""
    base_url = "https://ecufix-central.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Debugging Registration Password Hashing")
    print("=" * 50)
    
    # Test password
    test_password = "password123"
    expected_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    print(f"Test password: '{test_password}'")
    print(f"Expected hash: {expected_hash}")
    
    # Create test account
    timestamp = int(time.time())
    test_email = f"debug_reg_{timestamp}@example.com"
    
    registration_data = {
        "name": "Debug Registration User",
        "email": test_email,
        "password": test_password
    }
    
    print(f"\nRegistration data: {json.dumps(registration_data, indent=2)}")
    
    try:
        response = requests.post(f"{api_url}/portal/register", json=registration_data, timeout=10)
        print(f"\nRegistration response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Registration result: {json.dumps(result, indent=2)}")
            account_id = result.get('account_id')
            
            # Now check what was actually stored in the database
            print(f"\nChecking database for account: {test_email}")
            
            # Use MongoDB to check the stored hash
            import asyncio
            from motor.motor_asyncio import AsyncIOMotorClient
            
            async def check_stored_hash():
                client = AsyncIOMotorClient('mongodb://localhost:27017')
                db = client['test_database']
                
                account = await db.portal_accounts.find_one({"email": test_email})
                if account:
                    stored_hash = account.get('password_hash')
                    print(f"Stored hash:   {stored_hash}")
                    print(f"Expected hash: {expected_hash}")
                    print(f"Hashes match:  {stored_hash == expected_hash}")
                    
                    if stored_hash != expected_hash:
                        print("\n❌ HASH MISMATCH DETECTED!")
                        print("This explains why login fails.")
                        
                        # Let's see what password would generate the stored hash
                        print("\nTrying to reverse-engineer what password was hashed...")
                        test_passwords = [
                            test_password,
                            test_password.strip(),
                            test_password.lower(),
                            test_password.upper(),
                            f'"{test_password}"',
                            f"'{test_password}'",
                            test_password + '\n',
                            test_password + '\r',
                            test_password + ' ',
                            ' ' + test_password,
                        ]
                        
                        for pwd in test_passwords:
                            test_hash = hashlib.sha256(pwd.encode()).hexdigest()
                            if test_hash == stored_hash:
                                print(f"FOUND MATCH: Password was processed as: '{repr(pwd)}'")
                                break
                        else:
                            print("No obvious password transformation found.")
                    else:
                        print("\n✅ HASHES MATCH - Registration working correctly")
                else:
                    print("❌ Account not found in database")
            
            asyncio.run(check_stored_hash())
            
        else:
            print(f"Registration failed: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_registration()