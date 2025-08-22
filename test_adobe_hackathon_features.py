#!/usr/bin/env python3
"""
Adobe Hackathon 2025 - Comprehensive Feature Testing Script
Tests all core and bonus features for the hackathon submission
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:8080"
TEST_TIMEOUT = 30

class AdobeHackathonTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.test_results = {}
        self.total_points = 0
        
    def log_test(self, test_name: str, success: bool, points: int = 0, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results[test_name] = {
            "success": success,
            "points": points if success else 0,
            "details": details
        }
        if success:
            self.total_points += points
        
        print(f"{status} {test_name} ({points} pts) - {details}")
    
    def test_server_health(self):
        """Test if server is running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            success = response.status_code == 200
            self.log_test("Server Health Check", success, 0, 
                         f"Status: {response.status_code}" if success else "Server not responding")
            return success
        except Exception as e:
            self.log_test("Server Health Check", False, 0, f"Error: {str(e)}")
            return False
    
    def test_core_features(self):
        """Test mandatory core features"""
        print("\n🎯 Testing Core Features (Mandatory)")
        print("=" * 50)
        
        # Test 1: PDF Upload
        self.test_pdf_upload()
        
        # Test 2: Cross-Document Search
        self.test_cross_document_search()
        
        # Test 3: Section Highlighting
        self.test_section_highlighting()
        
        # Test 4: Text Selection
        self.test_text_selection()
    
    def test_bonus_features(self):
        """Test bonus features (+10 points)"""
        print("\n🏆 Testing Bonus Features (+10 Points)")
        print("=" * 50)
        
        # Test 1: AI Insights Bulb (+5 points)
        self.test_insights_bulb()
        
        # Test 2: Podcast Mode (+5 points)
        self.test_podcast_mode()
    
    def test_pdf_upload(self):
        """Test PDF upload functionality"""
        try:
            # Check if we have any documents
            response = requests.get(f"{self.backend_url}/api/documents", timeout=TEST_TIMEOUT)
            if response.status_code == 200:
                documents = response.json().get("documents", [])
                success = len(documents) > 0
                self.log_test("PDF Upload & Processing", success, 0, 
                             f"Found {len(documents)} documents" if success else "No documents found")
            else:
                self.log_test("PDF Upload & Processing", False, 0, f"API error: {response.status_code}")
        except Exception as e:
            self.log_test("PDF Upload & Processing", False, 0, f"Error: {str(e)}")
    
    def test_cross_document_search(self):
        """Test cross-document search functionality"""
        try:
            # Get first document for testing
            response = requests.get(f"{self.backend_url}/api/documents", timeout=TEST_TIMEOUT)
            if response.status_code == 200:
                documents = response.json().get("documents", [])
                if documents:
                    doc_id = documents[0]["id"]
                    # Test recommendations endpoint
                    rec_response = requests.get(
                        f"{self.backend_url}/api/recommendations/{doc_id}?page=1", 
                        timeout=TEST_TIMEOUT
                    )
                    success = rec_response.status_code == 200
                    details = f"Document ID: {doc_id[:8]}..." if success else f"Error: {rec_response.status_code}"
                    self.log_test("Cross-Document Search", success, 0, details)
                else:
                    self.log_test("Cross-Document Search", False, 0, "No documents available for testing")
            else:
                self.log_test("Cross-Document Search", False, 0, "Cannot access documents API")
        except Exception as e:
            self.log_test("Cross-Document Search", False, 0, f"Error: {str(e)}")
    
    def test_section_highlighting(self):
        """Test section highlighting functionality"""
        try:
            # Get first document for testing
            response = requests.get(f"{self.backend_url}/api/documents", timeout=TEST_TIMEOUT)
            if response.status_code == 200:
                documents = response.json().get("documents", [])
                if documents:
                    doc_id = documents[0]["id"]
                    # Test highlights endpoint
                    highlight_response = requests.get(
                        f"{self.backend_url}/api/highlights/{doc_id}?page=1", 
                        timeout=TEST_TIMEOUT
                    )
                    success = highlight_response.status_code == 200
                    details = f"Highlights API responsive" if success else f"Error: {highlight_response.status_code}"
                    self.log_test("Section Highlighting", success, 0, details)
                else:
                    self.log_test("Section Highlighting", False, 0, "No documents available for testing")
            else:
                self.log_test("Section Highlighting", False, 0, "Cannot access documents API")
        except Exception as e:
            self.log_test("Section Highlighting", False, 0, f"Error: {str(e)}")
    
    def test_text_selection(self):
        """Test text selection and analysis"""
        try:
            # Test text selection endpoint
            test_data = {
                "selected_text": "This is a test selection for Adobe Hackathon",
                "document_id": "test-doc",
                "page": 1,
                "persona": "Student",
                "job": "Research"
            }
            
            response = requests.post(
                f"{self.backend_url}/api/analyze-selection",
                json=test_data,
                timeout=TEST_TIMEOUT
            )
            
            success = response.status_code == 200
            details = "Text analysis API responsive" if success else f"Error: {response.status_code}"
            self.log_test("Text Selection Analysis", success, 0, details)
        except Exception as e:
            self.log_test("Text Selection Analysis", False, 0, f"Error: {str(e)}")
    
    def test_insights_bulb(self):
        """Test AI Insights Bulb feature (+5 points)"""
        try:
            # Get first document for testing
            response = requests.get(f"{self.backend_url}/api/documents", timeout=TEST_TIMEOUT)
            if response.status_code == 200:
                documents = response.json().get("documents", [])
                if documents:
                    doc_id = documents[0]["id"]
                    # Test insights endpoint
                    insights_response = requests.get(
                        f"{self.backend_url}/api/insights/{doc_id}?page=1&persona=Student&job=Research", 
                        timeout=TEST_TIMEOUT
                    )
                    
                    if insights_response.status_code == 200:
                        insights_data = insights_response.json()
                        insights = insights_data.get("insights", [])
                        success = len(insights) > 0
                        details = f"Generated {len(insights)} insights" if success else "No insights generated"
                        points = 5 if success else 0
                        self.log_test("AI Insights Bulb", success, points, details)
                    else:
                        self.log_test("AI Insights Bulb", False, 0, f"API error: {insights_response.status_code}")
                else:
                    self.log_test("AI Insights Bulb", False, 0, "No documents available for testing")
            else:
                self.log_test("AI Insights Bulb", False, 0, "Cannot access documents API")
        except Exception as e:
            self.log_test("AI Insights Bulb", False, 0, f"Error: {str(e)}")
    
    def test_podcast_mode(self):
        """Test Podcast Mode feature (+5 points)"""
        try:
            # Test podcast generation endpoint
            test_data = {
                "document_id": "test-doc",
                "page": 1,
                "persona": "Student",
                "job": "Research"
            }
            
            response = requests.post(
                f"{self.backend_url}/api/generate-podcast",
                json=test_data,
                timeout=TEST_TIMEOUT
            )
            
            if response.status_code == 200:
                podcast_data = response.json()
                has_audio = "audioUrl" in podcast_data or "script" in podcast_data
                success = has_audio
                details = "Podcast generation successful" if success else "No audio/script generated"
                points = 5 if success else 0
                self.log_test("Podcast Mode", success, points, details)
            else:
                self.log_test("Podcast Mode", False, 0, f"API error: {response.status_code}")
        except Exception as e:
            self.log_test("Podcast Mode", False, 0, f"Error: {str(e)}")
    
    def test_environment_setup(self):
        """Test Adobe Hackathon environment requirements"""
        print("\n🔧 Testing Environment Setup")
        print("=" * 50)
        
        # Check required environment variables
        required_env = ["LLM_PROVIDER", "GEMINI_MODEL", "TTS_PROVIDER"]
        env_success = True
        
        for env_var in required_env:
            value = os.getenv(env_var)
            if value:
                print(f"✅ {env_var}={value}")
            else:
                print(f"❌ {env_var} not set")
                env_success = False
        
        # Check credentials.json
        credentials_path = Path("credentials.json")
        creds_success = credentials_path.exists()
        print(f"{'✅' if creds_success else '❌'} credentials.json {'found' if creds_success else 'missing'}")
        
        overall_success = env_success and creds_success
        self.log_test("Environment Setup", overall_success, 0, 
                     "All requirements met" if overall_success else "Missing requirements")
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🎯 Adobe India Hackathon 2025 - Feature Testing")
        print("📚 PDF Intelligence System with AI Features")
        print("=" * 60)
        
        # Test server health first
        if not self.test_server_health():
            print("\n❌ Server is not running. Please start the server first:")
            print("   python start_server.py")
            return
        
        # Test environment setup
        self.test_environment_setup()
        
        # Test core features
        self.test_core_features()
        
        # Test bonus features
        self.test_bonus_features()
        
        # Generate final report
        self.generate_report()
    
    def generate_report(self):
        """Generate final test report"""
        print("\n" + "=" * 60)
        print("🏆 ADOBE HACKATHON 2025 - TEST RESULTS")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result["success"])
        
        print(f"📊 Tests Passed: {passed_tests}/{total_tests}")
        print(f"🎯 Total Points: {self.total_points}/10 (Bonus Features)")
        
        # Detailed results
        print("\n📋 Detailed Results:")
        for test_name, result in self.test_results.items():
            status = "✅" if result["success"] else "❌"
            points = f"(+{result['points']} pts)" if result["points"] > 0 else ""
            print(f"  {status} {test_name} {points}")
            if result["details"]:
                print(f"      {result['details']}")
        
        # Final assessment
        print(f"\n🎯 HACKATHON READINESS:")
        if self.total_points >= 8:
            print("🏆 EXCELLENT - Ready for submission with high bonus points!")
        elif self.total_points >= 5:
            print("✅ GOOD - Most features working, ready for submission")
        elif passed_tests >= total_tests * 0.7:
            print("⚠️  FAIR - Core features working, bonus features need attention")
        else:
            print("❌ NEEDS WORK - Several features require fixes before submission")
        
        print(f"\n🚀 Access your application at: {self.backend_url}")
        print("📖 Upload PDFs and test the AI features!")

if __name__ == "__main__":
    tester = AdobeHackathonTester()
    tester.run_all_tests()
