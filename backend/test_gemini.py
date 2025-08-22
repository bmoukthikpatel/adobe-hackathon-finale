#!/usr/bin/env python3
"""
Test script for Gemini integration using Vertex AI
Based on the user's example script
"""

import os
import sys

def test_vertex_gemini():
    """Test Gemini using Vertex AI approach"""
    print("Testing Vertex AI Gemini...")
    
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        
        # Set credentials path (adjust this to your actual credentials file)
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '/credentials/credentials.json')
        if not os.path.exists(credentials_path):
            print(f"⚠️ Credentials file not found at: {credentials_path}")
            print("Please set GOOGLE_APPLICATION_CREDENTIALS environment variable")
            return False
            
        # Setting the environment variable with the absolute path
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        
        # Initialize Vertex AI
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'your-project-id')
        location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
        
        print(f"Initializing Vertex AI with project: {project_id}, location: {location}")
        vertexai.init(project=project_id, location=location)
        
        # Create model
        model = GenerativeModel("gemini-1.5-pro-preview-0514")
        
        # Test simple query
        print("Generating content...")
        response = model.generate_content("What's the capital of France?")
        
        print("✅ Success! Response:")
        print(response.text)
        return True
        
    except Exception as e:
        print(f"❌ Vertex AI test failed: {e}")
        return False

def test_genai_fallback():
    """Test Gemini using google.generativeai fallback"""
    print("\nTesting google.generativeai fallback...")
    
    try:
        import google.generativeai as genai
        
        # Try to get API key from credentials
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if credentials_path and os.path.exists(credentials_path):
            import json
            with open(credentials_path, 'r') as f:
                credentials = json.load(f)
                api_key = credentials.get('api_key')
                if api_key:
                    genai.configure(api_key=api_key)
                else:
                    print("⚠️ No 'api_key' found in credentials file")
                    return False
        else:
            print("⚠️ No credentials file found for fallback test")
            return False
            
        # Create model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Test simple query
        print("Generating content with genai...")
        response = model.generate_content("What's the capital of France?")
        
        print("✅ Success! Response:")
        print(response.text)
        return True
        
    except Exception as e:
        print(f"❌ genai fallback test failed: {e}")
        return False

async def test_app_provider():
    """Test the app's LLM provider"""
    print("\nTesting app's LLM provider...")
    
    try:
        sys.path.append('.')
        from app.llm_providers import get_llm_provider
        
        provider = get_llm_provider()
        print(f"✅ LLM Provider created: {type(provider).__name__}")
        
        # Test insights generation
        test_content = "This is a test document about artificial intelligence and machine learning."
        insights = await provider.generate_insights(test_content, "Student", "Learning about AI")
        
        print(f"✅ Generated {len(insights)} insights:")
        for i, insight in enumerate(insights):
            print(f"  {i+1}. {insight.get('type')}: {insight.get('title')}")
            
        return True
        
    except Exception as e:
        print(f"❌ App provider test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("🧠 Testing Gemini Integration for Adobe PDF Intelligence")
    print("=" * 60)
    
    # Test Vertex AI approach
    vertex_works = test_vertex_gemini()
    
    # Test fallback approach
    genai_works = test_genai_fallback()
    
    # Test app integration
    app_works = await test_app_provider()
    
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print(f"Vertex AI Gemini: {'✅ Working' if vertex_works else '❌ Failed'}")
    print(f"genai Fallback: {'✅ Working' if genai_works else '❌ Failed'}")
    print(f"App Provider: {'✅ Working' if app_works else '❌ Failed'}")
    
    if vertex_works or genai_works:
        print("\n🎉 At least one Gemini method is working!")
        print("✅ Insights should work in the app")
    else:
        print("\n⚠️ No Gemini methods are working")
        print("❌ Insights will use mock data")
        
    print("\n💡 To fix issues:")
    print("1. Set GOOGLE_APPLICATION_CREDENTIALS to your credentials file")
    print("2. Set GOOGLE_CLOUD_PROJECT to your project ID")
    print("3. Set GOOGLE_CLOUD_LOCATION to your preferred region (e.g., us-central1)")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
