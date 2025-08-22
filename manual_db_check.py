#!/usr/bin/env python3
"""
Manual database check - simpler version
"""

import sqlite3
import os
from pathlib import Path

# Check all possible database locations
possible_paths = [
    "backend/data/documents.db",
    "data/documents.db", 
    "backend/app/data/documents.db",
    "documents.db"
]

print("🔍 Looking for database files...")
for path in possible_paths:
    if os.path.exists(path):
        print(f"✅ Found database at: {path}")
        
        # Connect and check
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📋 Tables: {[t[0] for t in tables]}")
        
        if ('documents',) in tables:
            cursor.execute("SELECT COUNT(*) FROM documents")
            count = cursor.fetchone()[0]
            print(f"📊 Documents count: {count}")
            
            if count > 0:
                cursor.execute("SELECT id, filename, original_name FROM documents LIMIT 5")
                docs = cursor.fetchall()
                print("📄 Sample documents:")
                for doc in docs:
                    print(f"  - {doc[0]}: {doc[2]} ({doc[1]})")
        
        conn.close()
        print()
    else:
        print(f"❌ Not found: {path}")

# Also check docs directory
docs_paths = [
    "backend/data/docs",
    "data/docs",
    "backend/app/data/docs"
]

print("\n🔍 Looking for docs directories...")
for path in docs_paths:
    if os.path.exists(path):
        files = os.listdir(path)
        pdf_files = [f for f in files if f.endswith('.pdf')]
        print(f"✅ Found docs at: {path}")
        print(f"📄 PDF files: {len(pdf_files)}")
        if pdf_files:
            print(f"📄 Sample files: {pdf_files[:3]}")
    else:
        print(f"❌ Not found: {path}")
