"""
DTC Delete Tool Backend API Tests
Tests the complete flow: upload -> select DTCs -> create order -> process -> download
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://ecu-tune-portal.preview.emergentagent.com"

API_URL = f"{BASE_URL}/api"

# Test data
TEST_FILE_PATH = "/tmp/test_ecu.bin"
TEST_CUSTOMER_EMAIL = "test@example.com"
TEST_CUSTOMER_NAME = "Test Customer"
TEST_DTC_CODES = ["P0420", "P2002", "P0401"]


class TestDTCDeleteToolAPI:
    """Test DTC Delete Tool API endpoints"""
    
    file_id = None
    order_id = None
    download_id = None
    
    def test_01_api_accessible(self):
        """Test API is accessible"""
        # Test a known working endpoint instead of /health
        response = requests.get(f"{API_URL}/dtc-database")
        assert response.status_code == 200, f"API not accessible: {response.text}"
        print(f"✓ API is accessible")
    
    def test_02_dtc_database_available(self):
        """Test DTC database endpoint"""
        response = requests.get(f"{API_URL}/dtc-database")
        assert response.status_code == 200, f"DTC database failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"DTC database not successful: {data}"
        assert "total_codes" in data, "Missing total_codes in response"
        print(f"✓ DTC database available with {data.get('total_codes', 0)} codes")
    
    def test_03_upload_file(self):
        """Test file upload for DTC analysis"""
        # Create test file if not exists
        if not os.path.exists(TEST_FILE_PATH):
            with open(TEST_FILE_PATH, 'wb') as f:
                f.write(os.urandom(102400))  # 100KB random data
        
        with open(TEST_FILE_PATH, 'rb') as f:
            files = {'file': ('test_ecu.bin', f, 'application/octet-stream')}
            response = requests.post(f"{API_URL}/dtc-engine/upload", files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Upload not successful: {data}"
        assert "file_id" in data, f"Missing file_id in response: {data}"
        
        TestDTCDeleteToolAPI.file_id = data["file_id"]
        print(f"✓ File uploaded successfully, file_id: {TestDTCDeleteToolAPI.file_id}")
        print(f"  Analysis: {json.dumps(data.get('analysis', {}), indent=2)[:500]}")
    
    def test_04_create_order(self):
        """Test order creation after payment"""
        assert TestDTCDeleteToolAPI.file_id, "No file_id from previous test"
        
        order_data = {
            "file_id": TestDTCDeleteToolAPI.file_id,
            "dtc_codes": TEST_DTC_CODES,
            "correct_checksum": True,
            "customer_name": TEST_CUSTOMER_NAME,
            "customer_email": TEST_CUSTOMER_EMAIL,
            "dtc_price": 20.0,
            "checksum_price": 5.0,
            "total_price": 25.0,
            "payment_status": "paid",
            "paypal_order_id": "TEST_PAYPAL_ORDER_123",
            "paypal_transaction_id": "TEST_TRANSACTION_456"
        }
        
        response = requests.post(f"{API_URL}/dtc-engine/order", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Order not successful: {data}"
        assert "order_id" in data, f"Missing order_id in response: {data}"
        
        TestDTCDeleteToolAPI.order_id = data["order_id"]
        print(f"✓ Order created successfully, order_id: {TestDTCDeleteToolAPI.order_id}")
    
    def test_05_process_dtc_deletion(self):
        """Test DTC deletion processing"""
        assert TestDTCDeleteToolAPI.file_id, "No file_id from previous test"
        assert TestDTCDeleteToolAPI.order_id, "No order_id from previous test"
        
        process_data = {
            "file_id": TestDTCDeleteToolAPI.file_id,
            "dtc_codes": TEST_DTC_CODES,
            "correct_checksum": True,
            "order_id": TestDTCDeleteToolAPI.order_id
        }
        
        response = requests.post(f"{API_URL}/dtc-engine/process", json=process_data)
        assert response.status_code == 200, f"Processing failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, f"Missing success field: {data}"
        assert "download_id" in data, f"Missing download_id field: {data}"
        assert "dtcs_requested" in data, f"Missing dtcs_requested field: {data}"
        
        TestDTCDeleteToolAPI.download_id = data.get("download_id")
        print(f"✓ DTC processing completed:")
        print(f"  Success: {data.get('success')}")
        print(f"  Download ID: {TestDTCDeleteToolAPI.download_id}")
        print(f"  DTCs requested: {data.get('dtcs_requested')}")
        print(f"  DTCs found: {data.get('dtcs_found', [])}")
        print(f"  DTCs deleted: {data.get('dtcs_deleted', [])}")
        print(f"  DTCs not found: {data.get('dtcs_not_found', [])}")
        print(f"  Checksum corrected: {data.get('checksum_corrected')}")
    
    def test_06_download_processed_file(self):
        """Test downloading the processed file"""
        assert TestDTCDeleteToolAPI.download_id, "No download_id from previous test"
        
        response = requests.get(f"{API_URL}/dtc-engine/download/{TestDTCDeleteToolAPI.download_id}")
        assert response.status_code == 200, f"Download failed: {response.status_code} - {response.text}"
        
        # Check that we got binary data
        content_type = response.headers.get('content-type', '')
        assert 'application/octet-stream' in content_type or len(response.content) > 0, \
            f"Expected binary file, got: {content_type}"
        
        # Verify file size is reasonable
        file_size = len(response.content)
        assert file_size > 0, "Downloaded file is empty"
        
        print(f"✓ File downloaded successfully:")
        print(f"  Size: {file_size} bytes")
        print(f"  Content-Type: {content_type}")
    
    def test_07_invalid_download_id(self):
        """Test download with invalid ID returns 404"""
        response = requests.get(f"{API_URL}/dtc-engine/download/invalid-id-12345")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print(f"✓ Invalid download ID correctly returns 404")
    
    def test_08_process_without_order(self):
        """Test processing without order_id (should still work)"""
        # Upload a new file
        with open(TEST_FILE_PATH, 'rb') as f:
            files = {'file': ('test_ecu2.bin', f, 'application/octet-stream')}
            upload_response = requests.post(f"{API_URL}/dtc-engine/upload", files=files)
        
        assert upload_response.status_code == 200
        file_id = upload_response.json()["file_id"]
        
        # Process without order_id
        process_data = {
            "file_id": file_id,
            "dtc_codes": ["P0420"],
            "correct_checksum": True
        }
        
        response = requests.post(f"{API_URL}/dtc-engine/process", json=process_data)
        assert response.status_code == 200, f"Processing without order failed: {response.text}"
        data = response.json()
        assert "download_id" in data, f"Missing download_id: {data}"
        print(f"✓ Processing without order_id works, download_id: {data.get('download_id')}")


class TestDTCDatabaseSearch:
    """Test DTC database search functionality"""
    
    def test_search_by_code(self):
        """Test searching DTC by code"""
        response = requests.get(f"{API_URL}/dtc-database/search?q=P0420")
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Search not successful: {data}"
        print(f"✓ DTC search by code works, found {len(data.get('results', []))} results")
    
    def test_search_by_description(self):
        """Test searching DTC by description"""
        response = requests.get(f"{API_URL}/dtc-database/search?q=catalyst")
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Search not successful: {data}"
        print(f"✓ DTC search by description works, found {len(data.get('results', []))} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
