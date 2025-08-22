#!/usr/bin/env python3
"""
Adobe Hackathon 2025 - Server Startup Script
Automatically sets up environment and starts the server with credentials.json authentication
"""

import os
import sys
import subprocess

def setup_environment():
    """Set up Adobe Hackathon required environment variables"""
    print("🏆 Adobe Hackathon 2025 - Setting up environment...")
    
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
    credentials_path = os.path.join(os.path.dirname(__file__), "credentials.json")
    
    if os.path.exists(credentials_path):
        print(f"✅ Found credentials.json at: {credentials_path}")
        print("🔐 Gemini authentication will use credentials.json")
    else:
        print("⚠️  credentials.json not found in project root!")
        print("   Please ensure credentials.json is in the same directory as this script")
        return False
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting Adobe Hackathon 2025 server...")
    print("📡 Server will be available at: http://localhost:8080")
    print("🐳 Docker deployable on port 8080")
    print("\n" + "="*50)
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    
    try:
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8080",
            "--reload"
        ], cwd=backend_dir, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start server: {e}")
        return False
    except FileNotFoundError:
        print("❌ uvicorn not found. Please install dependencies first:")
        print("   pip install fastapi uvicorn")
        return False
    
    return True

def main():
    """Main function"""
    print("🎯 Adobe India Hackathon 2025")
    print("📚 PDF Chat System with AI Features")
    print("🔧 Using credentials.json for Gemini authentication")
    print()
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Start server
    if not start_server():
        sys.exit(1)

if __name__ == "__main__":
    main()
