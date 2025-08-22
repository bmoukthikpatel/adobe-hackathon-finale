#!/usr/bin/env python3
"""
Debug script to check document loading issues
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import db
import json

def debug_documents():
    """Debug document loading"""
    print("🔍 Debugging document loading...")
    print("=" * 50)
    
    try:
        # Test database connection
        stats = db.get_document_stats()
        print(f"📊 Database stats: {stats}")
        print()
        
        # Get all documents using the same method as API
        print("📚 Getting all documents...")
        documents = db.get_all_documents()
        print(f"📄 Found {len(documents)} documents")
        print()
        
        if documents:
            print("📋 First 5 documents:")
            for i, doc in enumerate(documents[:5]):
                print(f"  {i+1}. ID: {doc.id}")
                print(f"     Name: {doc.original_name}")
                print(f"     Upload Date: {doc.upload_date}")
                print(f"     Last Uploaded: {doc.last_uploaded}")
                print(f"     Last Opened: {doc.last_opened}")
                print(f"     File Size: {doc.file_size}")
                print()
                
                # Test to_dict conversion
                try:
                    doc_dict = doc.to_dict()
                    print(f"     ✅ to_dict() successful")
                    print(f"     Dict keys: {list(doc_dict.keys())}")
                except Exception as e:
                    print(f"     ❌ to_dict() failed: {e}")
                print()
        
        # Test with limit
        print("📚 Testing with limit=5...")
        limited_docs = db.get_all_documents(limit=5)
        print(f"📄 Found {len(limited_docs)} documents with limit=5")
        print()
        
        # Test sorted documents
        print("📚 Testing sorted documents...")
        sorted_docs = db.get_documents_sorted(sort_by='upload_date', sort_order='desc', limit=5)
        print(f"📄 Found {len(sorted_docs)} sorted documents")
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_documents()
