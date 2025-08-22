#!/usr/bin/env python3
"""
Environment setup script for Adobe Hackathon 2025
Sets up the required environment variables as per hackathon requirements
"""

import os

def setup_adobe_hackathon_env():
    """Set up environment variables as required by Adobe Hackathon 2025"""
    
    print("🏆 Setting up Adobe Hackathon 2025 environment...")
    
    # Adobe Hackathon required environment variables
    env_vars = {
        "LLM_PROVIDER": "gemini",
        "GEMINI_MODEL": "gemini-2.5-flash", 
        "TTS_PROVIDER": "azure"
    }
    
    for key, value in env_vars.items():
        os.environ[key] = value
        print(f"✅ Set {key}={value}")
    
    # Check for credentials
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    credentials_path = os.path.join(project_root, "credentials.json")
    
    if os.path.exists(credentials_path):
        print(f"✅ Found credentials.json at: {credentials_path}")
        print("🔐 Gemini authentication will use credentials.json")
    elif os.getenv("GOOGLE_API_KEY"):
        print("🔑 Found GOOGLE_API_KEY environment variable")
        print("🔐 Gemini authentication will use API key")
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        print(f"🔐 Found GOOGLE_APPLICATION_CREDENTIALS: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")
    else:
        print("⚠️  No Gemini credentials found!")
        print("   Please either:")
        print("   1. Place credentials.json in project root, or")
        print("   2. Set GOOGLE_API_KEY environment variable, or") 
        print("   3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
    
    print("\n🚀 Environment setup complete!")
    print("📋 Current configuration:")
    for key, value in env_vars.items():
        print(f"   {key}: {value}")
    
    return env_vars

if __name__ == "__main__":
    setup_adobe_hackathon_env()
