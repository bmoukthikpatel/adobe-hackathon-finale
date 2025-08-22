#!/usr/bin/env python3
"""
Show only active documents in the database
"""

import sqlite3
from pathlib import Path

def show_active_documents():
    """Show active documents with their details"""
    db_path = Path("backend/data/documents.db")
    if not db_path.exists():
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get active documents
    cursor.execute("""
        SELECT id, original_name, upload_date, last_uploaded, last_opened, file_size, file_hash
        FROM documents 
        WHERE status != 'deleted'
        ORDER BY last_uploaded DESC
    """)
    
    documents = cursor.fetchall()
    
    print("📚 ACTIVE DOCUMENTS")
    print("=" * 80)
    print(f"Total: {len(documents)} documents")
    print()
    
    for i, doc in enumerate(documents, 1):
        print(f"{i}. {doc['original_name']}")
        print(f"   ID: {doc['id']}")
        print(f"   Upload Date: {doc['upload_date']}")
        print(f"   Last Uploaded: {doc['last_uploaded']}")
        print(f"   Last Opened: {doc['last_opened'] or 'Never'}")
        print(f"   Size: {doc['file_size']:,} bytes")
        print(f"   Hash: {doc['file_hash'][:16] if doc['file_hash'] else 'None'}...")
        print()
    
    conn.close()

if __name__ == "__main__":
    show_active_documents()
