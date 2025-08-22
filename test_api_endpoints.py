#!/usr/bin/env python3
"""
Test script to verify API endpoints are working
"""

import requests

BASE_URL = "http://localhost:8080"

def test_api_endpoints():
    """Test the API endpoints that the frontend is calling"""
    print("🧪 Testing API Endpoints")
    print("=" * 50)
    
    # Test document ID (use a sample one)
    test_doc_id = "test-document-123"
    
    endpoints = [
        f"/api/recommendations/{test_doc_id}?page=1",
        f"/api/insights/{test_doc_id}?page=1", 
        f"/api/highlights/{test_doc_id}?page=1",
        "/config"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n📡 Testing: {endpoint}")
            response = requests.get(f"{BASE_URL}{endpoint}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                print(f"📄 Response keys: {list(data.keys())}")
                
                # Show sample data
                if 'recommendations' in data:
                    print(f"🎯 Recommendations: {len(data['recommendations'])} items")
                elif 'insights' in data:
                    print(f"💡 Insights: {len(data['insights'])} items")
                elif 'highlights' in data:
                    print(f"🎨 Highlights: {len(data['highlights'])} items")
                else:
                    print(f"📊 Data: {str(data)[:100]}...")
                    
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"📄 Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 API Test Complete")

if __name__ == "__main__":
    test_api_endpoints()
