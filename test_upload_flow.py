#!/usr/bin/env python3
"""
Test script to verify the upload flow and PDF serving
"""

import requests
import time
from pathlib import Path

BASE_URL = "http://localhost:8080"

def test_upload_flow():
    """Test the complete upload and file serving flow"""
    print("🧪 Testing Upload Flow")
    print("=" * 50)
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/config")
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print("❌ Server not responding properly")
            return False
    except:
        print("❌ Cannot connect to server")
        return False
    
    # Test 2: Create a dummy PDF file for testing
    dummy_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF"""
    
    # Test 3: Test upload endpoint
    try:
        files = {'file': ('test.pdf', dummy_pdf_content, 'application/pdf')}
        data = {
            'client_id': 'test-client',
            'persona': 'Test User',
            'job': 'Testing'
        }
        
        print("📤 Testing upload endpoint...")
        response = requests.post(f"{BASE_URL}/upload/active_file", files=files, data=data)
        
        if response.status_code == 202:
            result = response.json()
            job_id = result.get('job_id')
            file_url = result.get('file_url')
            
            print(f"✅ Upload successful")
            print(f"   Job ID: {job_id}")
            print(f"   File URL: {file_url}")
            
            # Test 4: Check if file is accessible
            if file_url:
                print("📁 Testing file serving...")
                file_response = requests.head(f"{BASE_URL}{file_url}")
                if file_response.status_code == 200:
                    print("✅ File is accessible")
                    print(f"   Content-Type: {file_response.headers.get('content-type')}")
                    print(f"   Content-Length: {file_response.headers.get('content-length')}")
                else:
                    print(f"❌ File not accessible: {file_response.status_code}")
            
            return True
            
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Upload test failed: {e}")
        return False

def test_frontend_endpoints():
    """Test frontend-related endpoints"""
    print("\n🌐 Testing Frontend Endpoints")
    print("=" * 50)
    
    endpoints = [
        "/",
        "/config",
        "/api/recommendations/test-doc?page=1",
        "/api/insights/test-doc?page=1",
        "/api/highlights/test-doc?page=1"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 200:
                print(f"✅ {endpoint}")
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")

if __name__ == "__main__":
    print("🚀 Adobe PDF Intelligence - Upload Flow Test")
    print("Make sure the server is running on http://localhost:8080")
    print()
    
    success = test_upload_flow()
    test_frontend_endpoints()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Upload flow test completed successfully!")
        print("📝 Next steps:")
        print("   1. Open http://localhost:8080 in browser")
        print("   2. Try uploading a PDF file")
        print("   3. Check if it opens in the reader")
    else:
        print("❌ Upload flow test failed")
        print("🔧 Check server logs for errors")
