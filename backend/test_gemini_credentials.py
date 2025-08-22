#!/usr/bin/env python3
"""
Test script to verify Gemini authentication with credentials.json
"""

import os
import sys

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_gemini_auth():
    """Test Gemini authentication with different methods"""
    
    # Set environment variables for testing
    os.environ["LLM_PROVIDER"] = "gemini"
    os.environ["GEMINI_MODEL"] = "gemini-2.5-flash"
    
    try:
        from app.chat_with_llm import get_llm_response
        
        # Test message
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'Hello, credentials.json authentication is working!' in exactly those words."}
        ]
        
        print("🧪 Testing Gemini authentication...")
        print("📁 Looking for credentials in the following order:")
        print("   1. GOOGLE_API_KEY environment variable")
        print("   2. GOOGLE_APPLICATION_CREDENTIALS environment variable")
        print("   3. credentials.json in project root")
        print()
        
        response = get_llm_response(messages)
        print("✅ SUCCESS! Gemini authentication working!")
        print(f"📝 Response: {response}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_gemini_auth()
    sys.exit(0 if success else 1)
