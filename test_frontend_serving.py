#!/usr/bin/env python3
"""
Test script to verify frontend serving
"""

import requests

BASE_URL = "http://localhost:8080"

def test_frontend_serving():
    """Test if the frontend is being served correctly"""
    print("🧪 Testing Frontend Serving")
    print("=" * 50)
    
    try:
        # Test root path
        response = requests.get(BASE_URL)
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        print(f"Content Length: {len(response.text)}")
        
        if response.status_code == 200:
            content = response.text
            
            # Check if it's HTML
            if content.startswith('<!doctype html>') or content.startswith('<!DOCTYPE html>'):
                print("✅ Serving HTML content")
                
                # Check if it contains the expected script tag
                if '/assets/index-' in content and '.js' in content:
                    print("✅ Contains JavaScript assets")
                else:
                    print("❌ Missing JavaScript assets")
                    
                # Check if it contains CSS
                if '/assets/index-' in content and '.css' in content:
                    print("✅ Contains CSS assets")
                else:
                    print("❌ Missing CSS assets")
                    
            else:
                print("❌ Not serving HTML content")
                print(f"Content preview: {content[:200]}...")
                
        else:
            print(f"❌ Failed to load frontend: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")

def test_assets():
    """Test if assets are accessible"""
    print("\n🎨 Testing Asset Serving")
    print("=" * 50)
    
    # Test common asset paths
    assets = [
        "/assets/index-D5lG9IPk.js",
        "/assets/index-BrBOgP2K.css"
    ]
    
    for asset in assets:
        try:
            response = requests.head(f"{BASE_URL}{asset}")
            if response.status_code == 200:
                print(f"✅ {asset}")
            else:
                print(f"❌ {asset} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {asset} - Error: {e}")

def test_config():
    """Test config endpoint"""
    print("\n⚙️ Testing Config Endpoint")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/config")
        if response.status_code == 200:
            config = response.json()
            print("✅ Config endpoint working")
            print(f"   Adobe Client ID: {config.get('adobeClientId', 'Not set')}")
            print(f"   LLM Provider: {config.get('llmProvider', 'Not set')}")
        else:
            print(f"❌ Config endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Config endpoint error: {e}")

if __name__ == "__main__":
    print("🚀 Adobe PDF Intelligence - Frontend Serving Test")
    print("Make sure the server is running on http://localhost:8080")
    print()
    
    test_frontend_serving()
    test_assets()
    test_config()
    
    print("\n" + "=" * 50)
    print("🎯 Next Steps:")
    print("   1. If HTML is serving correctly, open http://localhost:8080 in browser")
    print("   2. If assets are missing, check the backend static file mounting")
    print("   3. If config fails, check the backend API endpoints")
