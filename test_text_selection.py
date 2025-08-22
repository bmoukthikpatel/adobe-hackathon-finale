#!/usr/bin/env python3
"""
Test script to verify text selection API is working
"""
import requests
import json

# Test the text selection API
def test_ask_gpt():
    url = "http://localhost:8080/api/ask-gpt"
    
    test_data = {
        "selected_text": "Adobe Hackathon 2025 is a competitive programming event",
        "context": "Document about hackathon requirements",
        "persona": "Student", 
        "job": "Learning and Research"
    }
    
    print("🧪 Testing /api/ask-gpt endpoint...")
    print(f"📤 Sending: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(url, json=test_data, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Response:")
            print(json.dumps(result, indent=2))
            
            # Check if it's real AI or fallback
            if "Analysis completed" in result.get("response", ""):
                print("⚠️  WARNING: This looks like fallback response, not real AI")
            else:
                print("🎉 SUCCESS: Real AI response detected!")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_text_selection_analysis():
    url = "http://localhost:8080/api/text-selection-analysis"
    
    test_data = {
        "selected_text": "Adobe Hackathon 2025 requires Docker deployment on port 8080",
        "document_id": "f99938ea-0625-4a48-aed9-a595f4a49740",  # Adobe hackathon doc
        "page": 1,
        "persona": "Student",
        "job": "Learning and Research",
        "include_cross_document": True
    }
    
    print("\n🧪 Testing /api/text-selection-analysis endpoint...")
    print(f"📤 Sending: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(url, json=test_data, timeout=30)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Response keys: {list(result.keys())}")
            
            # Check insights
            if "text_insights" in result:
                insights = result["text_insights"]
                print(f"🧠 Text Insights: {json.dumps(insights, indent=2)}")
                
            # Check related sections
            if "related_sections" in result:
                sections = result["related_sections"]
                print(f"🔗 Related Sections: {len(sections)} found")
                
            # Check cross-document sections  
            if "cross_document_sections" in result:
                cross_sections = result["cross_document_sections"]
                print(f"📚 Cross-Document Sections: {len(cross_sections)} found")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("🚀 Testing Adobe Hackathon Text Selection APIs")
    print("=" * 60)
    
    test_ask_gpt()
    test_text_selection_analysis()
    
    print("\n" + "=" * 60)
    print("🏁 Test completed!")
