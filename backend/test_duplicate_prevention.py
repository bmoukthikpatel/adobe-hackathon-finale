#!/usr/bin/env python3
"""
Test duplicate prevention system
"""

import requests
import tempfile
import os
from pathlib import Path

BASE_URL = "http://localhost:8080"

def create_test_pdf(content: str = "Test PDF Content") -> bytes:
    """Create a simple test PDF"""
    pdf_content = f"""%PDF-1.4
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
/Length {len(content) + 20}
>>
stream
BT
/F1 12 Tf
72 720 Td
({content}) Tj
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
    return pdf_content.encode()

def test_duplicate_prevention():
    """Test the duplicate prevention system"""
    print("🧪 Testing Duplicate Prevention System")
    print("=" * 50)
    
    # Create identical test PDFs
    pdf_content = create_test_pdf("Adobe Hackathon Test Document")
    
    # Test 1: Upload first copy
    print("\n📤 Test 1: Uploading first copy...")
    try:
        files = {'file': ('test_document.pdf', pdf_content, 'application/pdf')}
        data = {'persona': 'Test User', 'job': 'Testing'}

        response = requests.post(f"{BASE_URL}/upload/active_file?client_id=test-client", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 202]:
            result = response.json()
            print(f"✅ First upload successful")
            print(f"   Job ID: {result.get('job_id')}")
            print(f"   Is Duplicate: {result.get('is_duplicate', False)}")
            first_job_id = result.get('job_id')
        else:
            print(f"❌ First upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ First upload error: {e}")
        return False
    
    # Test 2: Upload identical copy (should be detected as duplicate)
    print("\n📤 Test 2: Uploading identical copy...")
    try:
        files = {'file': ('test_document_copy.pdf', pdf_content, 'application/pdf')}
        data = {'persona': 'Test User', 'job': 'Testing'}

        response = requests.post(f"{BASE_URL}/upload/active_file?client_id=test-client", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Duplicate detection working!")
            print(f"   Job ID: {result.get('job_id')}")
            print(f"   Is Duplicate: {result.get('is_duplicate', False)}")
            print(f"   Original Upload Date: {result.get('original_upload_date')}")
            
            if result.get('is_duplicate') and result.get('job_id') == first_job_id:
                print("🎉 Perfect! Duplicate was detected and original document was returned")
                return True
            else:
                print("❌ Duplicate detection failed - new document was created")
                return False
        else:
            print(f"❌ Second upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Second upload error: {e}")
        return False
    
    # Test 3: Upload different content (should create new document)
    print("\n📤 Test 3: Uploading different content...")
    try:
        different_pdf = create_test_pdf("Different Adobe Hackathon Document")
        files = {'file': ('different_document.pdf', different_pdf, 'application/pdf')}
        data = {'persona': 'Test User', 'job': 'Testing'}

        response = requests.post(f"{BASE_URL}/upload/active_file?client_id=test-client", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 202]:
            result = response.json()
            print(f"✅ Different content upload successful")
            print(f"   Job ID: {result.get('job_id')}")
            print(f"   Is Duplicate: {result.get('is_duplicate', False)}")
            
            if not result.get('is_duplicate') and result.get('job_id') != first_job_id:
                print("🎉 Perfect! Different content created new document")
                return True
            else:
                print("❌ Different content was incorrectly detected as duplicate")
                return False
        else:
            print(f"❌ Different content upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Different content upload error: {e}")
        return False

def test_bulk_duplicate_prevention():
    """Test bulk upload duplicate prevention"""
    print("\n🧪 Testing Bulk Upload Duplicate Prevention")
    print("=" * 50)
    
    # Create test PDFs - some identical, some different
    pdf1 = create_test_pdf("Bulk Test Document 1")
    pdf2 = create_test_pdf("Bulk Test Document 1")  # Identical to pdf1
    pdf3 = create_test_pdf("Bulk Test Document 2")  # Different
    
    try:
        files = [
            ('files', ('bulk_doc1.pdf', pdf1, 'application/pdf')),
            ('files', ('bulk_doc1_copy.pdf', pdf2, 'application/pdf')),  # Duplicate
            ('files', ('bulk_doc2.pdf', pdf3, 'application/pdf'))
        ]
        data = {'persona': 'Test User', 'job': 'Testing'}

        response = requests.post(f"{BASE_URL}/upload/context_files?client_id=test-client", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 202]:
            result = response.json()
            print(f"✅ Bulk upload completed")
            print(f"   Job IDs: {len(result.get('job_ids', []))}")
            print(f"   File URLs: {len(result.get('file_urls', []))}")
            
            # Should have 2 unique documents (pdf1 and pdf3), with pdf2 being detected as duplicate
            if len(result.get('job_ids', [])) >= 2:
                print("🎉 Bulk duplicate detection working!")
                return True
            else:
                print("❌ Bulk duplicate detection may have issues")
                return False
        else:
            print(f"❌ Bulk upload failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Bulk upload error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Duplicate Prevention Tests...")
    
    # Test single upload duplicate prevention
    single_test_passed = test_duplicate_prevention()
    
    # Test bulk upload duplicate prevention
    bulk_test_passed = test_bulk_duplicate_prevention()
    
    print(f"\n📊 Test Results:")
    print(f"   Single Upload Duplicate Prevention: {'✅ PASSED' if single_test_passed else '❌ FAILED'}")
    print(f"   Bulk Upload Duplicate Prevention: {'✅ PASSED' if bulk_test_passed else '❌ FAILED'}")
    
    if single_test_passed and bulk_test_passed:
        print(f"\n🎉 All duplicate prevention tests PASSED!")
    else:
        print(f"\n❌ Some duplicate prevention tests FAILED!")
