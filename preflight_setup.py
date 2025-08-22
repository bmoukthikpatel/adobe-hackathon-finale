#!/usr/bin/env python3
"""
Adobe Hackathon 2025 - Pre-flight Setup
Ensures all dependencies and configurations are correct before testing
"""

import os
import sys
import subprocess
from pathlib import Path

class PreflightSetup:
    def __init__(self):
        self.project_root = Path.cwd()
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        
    def setup_environment_variables(self):
        """Set up Adobe Hackathon required environment variables"""
        print("🔧 Setting up Adobe Hackathon environment variables...")
        
        required_env = {
            "LLM_PROVIDER": "gemini",
            "GEMINI_MODEL": "gemini-2.5-flash",
            "TTS_PROVIDER": "azure"
        }
        
        for key, value in required_env.items():
            os.environ[key] = value
            print(f"✅ Set {key}={value}")
        
        # Check credentials
        creds_path = self.project_root / "credentials.json"
        if creds_path.exists():
            print(f"✅ Found credentials.json at: {creds_path}")
        else:
            print(f"⚠️  credentials.json not found at: {creds_path}")
            print("   Please ensure your Google credentials are in the project root")
    
    def check_dependencies(self):
        """Check if all required dependencies are installed"""
        print("\n📦 Checking dependencies...")
        
        # Check Python version
        python_version = sys.version_info
        if python_version >= (3, 8):
            print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        else:
            print(f"❌ Python {python_version.major}.{python_version.minor} - Need Python 3.8+")
            return False
        
        # Check critical packages
        critical_packages = [
            "fastapi",
            "uvicorn", 
            "langchain",
            "langchain_google_genai",
            "google.generativeai",
            "requests"
        ]
        
        missing_packages = []
        for package in critical_packages:
            try:
                __import__(package.replace("-", "_").replace(".", "_"))
                print(f"✅ {package}")
            except ImportError:
                print(f"❌ {package} - MISSING")
                missing_packages.append(package)
        
        if missing_packages:
            print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
            print("Install with: pip install " + " ".join(missing_packages))
            return False
        
        return True
    
    def check_file_structure(self):
        """Verify project file structure"""
        print("\n📁 Checking project structure...")
        
        required_files = [
            "backend/app/main.py",
            "backend/app/chat_with_llm.py",
            "backend/app/enhanced_llm_service.py",
            "frontend/src/App.tsx",
            "start_server.py",
            "credentials.json"
        ]
        
        all_present = True
        for file_path in required_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                print(f"✅ {file_path}")
            else:
                print(f"❌ {file_path} - MISSING")
                all_present = False
        
        return all_present
    
    def build_frontend(self):
        """Build frontend if needed"""
        print("\n🏗️  Checking frontend build...")
        
        dist_path = self.frontend_dir / "dist" / "index.html"
        if dist_path.exists():
            print("✅ Frontend already built")
            return True
        
        print("🔨 Building frontend...")
        try:
            # Check if node_modules exists
            node_modules = self.frontend_dir / "node_modules"
            if not node_modules.exists():
                print("📦 Installing frontend dependencies...")
                subprocess.run(["npm", "install"], cwd=self.frontend_dir, check=True)
            
            # Build frontend
            subprocess.run(["npm", "run", "build"], cwd=self.frontend_dir, check=True)
            
            if dist_path.exists():
                print("✅ Frontend built successfully")
                return True
            else:
                print("❌ Frontend build failed - no dist folder created")
                return False
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Frontend build failed: {e}")
            return False
        except FileNotFoundError:
            print("❌ npm not found - please install Node.js")
            return False
    
    def test_import_main_app(self):
        """Test if the main app can be imported"""
        print("\n🧪 Testing app import...")
        
        try:
            # Add backend to path
            sys.path.insert(0, str(self.backend_dir))
            
            # Try importing the main app
            from app.main import app
            print("✅ Main app imports successfully")
            
            # Test basic functionality
            if hasattr(app, 'routes'):
                route_count = len(app.routes)
                print(f"✅ App has {route_count} routes configured")
            
            return True
            
        except Exception as e:
            print(f"❌ App import failed: {e}")
            return False
    
    def run_preflight_checks(self):
        """Run all preflight checks"""
        print("🚀 ADOBE HACKATHON 2025 - PRE-FLIGHT SETUP")
        print("=" * 60)
        
        checks = [
            ("Environment Variables", self.setup_environment_variables),
            ("Dependencies", self.check_dependencies),
            ("File Structure", self.check_file_structure),
            ("Frontend Build", self.build_frontend),
            ("App Import", self.test_import_main_app)
        ]
        
        all_passed = True
        results = {}
        
        for check_name, check_func in checks:
            print(f"\n🔍 {check_name.upper()}")
            print("-" * 30)
            try:
                result = check_func()
                results[check_name] = result
                if not result:
                    all_passed = False
            except Exception as e:
                print(f"❌ {check_name} failed with error: {e}")
                results[check_name] = False
                all_passed = False
        
        # Summary
        print("\n" + "=" * 60)
        print("🏆 PRE-FLIGHT SUMMARY")
        print("=" * 60)
        
        for check_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {check_name}")
        
        if all_passed:
            print("\n🎉 ALL PRE-FLIGHT CHECKS PASSED!")
            print("🚀 Ready to run comprehensive verification")
            print("\nNext steps:")
            print("1. python comprehensive_verification_plan.py")
            print("2. python start_server.py (in separate terminal)")
            print("3. Access http://localhost:8080")
        else:
            print("\n⚠️  SOME PRE-FLIGHT CHECKS FAILED")
            print("Please fix the issues above before proceeding")
            print("\nCommon fixes:")
            print("- Install missing dependencies: pip install -r backend/requirements.txt")
            print("- Ensure credentials.json is in project root")
            print("- Install Node.js for frontend build")
        
        return all_passed

if __name__ == "__main__":
    setup = PreflightSetup()
    success = setup.run_preflight_checks()
    sys.exit(0 if success else 1)
