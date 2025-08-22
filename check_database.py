#!/usr/bin/env python3
"""
Script to check the contents of the documents database
"""

import sqlite3
from pathlib import Path
import json
from datetime import datetime

def check_database():
    """Check what's in the database"""
    print("🔍 Checking Database Contents")
    print("=" * 50)
    
    # Check if database file exists
    db_path = Path("backend/data/documents.db")
    if not db_path.exists():
        print("❌ Database file does not exist at:", db_path)
        
        # Check alternative locations
        alt_paths = [
            Path("data/documents.db"),
            Path("backend/app/data/documents.db"),
            Path("documents.db")
        ]
        
        for alt_path in alt_paths:
            if alt_path.exists():
                print(f"✅ Found database at: {alt_path}")
                db_path = alt_path
                break
        else:
            print("❌ No database file found in any location")
            return
    else:
        print(f"✅ Database file exists at: {db_path}")
    
    # Connect to database
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if documents table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("❌ Documents table does not exist")
            
            # Show all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"📋 Available tables: {[table[0] for table in tables]}")
            return
        
        print("✅ Documents table exists")
        
        # Get table schema
        cursor.execute("PRAGMA table_info(documents)")
        columns = cursor.fetchall()
        print("\n📋 Table Schema:")
        for col in columns:
            print(f"  - {col['name']}: {col['type']} {'(PRIMARY KEY)' if col['pk'] else ''}")
        
        # Count total documents
        cursor.execute("SELECT COUNT(*) FROM documents")
        total_count = cursor.fetchone()[0]
        print(f"\n📊 Total documents in database: {total_count}")
        
        if total_count == 0:
            print("❌ No documents found in database")
            return
        
        # Count by status
        cursor.execute("SELECT status, COUNT(*) FROM documents GROUP BY status")
        status_counts = cursor.fetchall()
        print("\n📊 Documents by status:")
        for status, count in status_counts:
            print(f"  - {status or 'NULL'}: {count}")
        
        # Show recent documents
        cursor.execute("""
            SELECT id, filename, original_name, upload_date, file_size, status, client_id, persona, job_role
            FROM documents 
            ORDER BY upload_date DESC 
            LIMIT 10
        """)
        
        documents = cursor.fetchall()
        print(f"\n📄 Recent Documents (showing {len(documents)}):")
        print("-" * 100)
        
        for doc in documents:
            print(f"ID: {doc['id']}")
            print(f"  Filename: {doc['filename']}")
            print(f"  Original: {doc['original_name']}")
            print(f"  Upload Date: {doc['upload_date']}")
            print(f"  Size: {doc['file_size']} bytes")
            print(f"  Status: {doc['status']}")
            print(f"  Client: {doc['client_id']}")
            print(f"  Persona: {doc['persona']}")
            print(f"  Job Role: {doc['job_role']}")
            
            # Check if file exists
            file_path = Path("backend/data/docs") / doc['filename']
            if not file_path.exists():
                # Try alternative paths
                alt_file_paths = [
                    Path("data/docs") / doc['filename'],
                    Path("backend/app/data/docs") / doc['filename']
                ]
                file_exists = any(p.exists() for p in alt_file_paths)
                if file_exists:
                    existing_path = next(p for p in alt_file_paths if p.exists())
                    print(f"  File: ✅ EXISTS at {existing_path}")
                else:
                    print(f"  File: ❌ MISSING (expected at {file_path})")
            else:
                print(f"  File: ✅ EXISTS")
            print()
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error accessing database: {e}")

def test_api_endpoint():
    """Test the API endpoint directly"""
    print("\n🌐 Testing API Endpoint")
    print("=" * 50)
    
    try:
        import requests
        response = requests.get("http://localhost:8080/api/documents")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response Status: {response.status_code}")
            print(f"📊 Documents returned: {len(data.get('documents', []))}")
            print(f"📊 Total count: {data.get('count', 0)}")
            
            if 'stats' in data:
                print(f"📊 Database stats: {data['stats']}")
            
            # Show first few documents
            documents = data.get('documents', [])
            if documents:
                print(f"\n📄 First few documents from API:")
                for i, doc in enumerate(documents[:3]):
                    print(f"  {i+1}. {doc.get('original_name', doc.get('name', 'Unknown'))}")
                    print(f"     ID: {doc.get('id')}")
                    print(f"     URL: {doc.get('url')}")
                    print(f"     Size: {doc.get('file_size', doc.get('size', 0))} bytes")
            else:
                print("❌ No documents returned from API")
                
        else:
            print(f"❌ API Response Status: {response.status_code}")
            print(f"❌ Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API - is the backend running?")
    except Exception as e:
        print(f"❌ Error testing API: {e}")

if __name__ == "__main__":
    check_database()
    test_api_endpoint()
