#!/usr/bin/env python3
"""
Database migration script to add new columns and update existing data
"""

import sqlite3
from pathlib import Path
import hashlib
from datetime import datetime

def migrate_database():
    """Migrate database to new schema with time tracking and file hashes"""
    print("🔄 Starting database migration...")
    
    # Find database
    db_path = Path("backend/data/documents.db")
    if not db_path.exists():
        db_path = Path("data/documents.db")
    
    if not db_path.exists():
        print("❌ Database not found")
        return
    
    print(f"📚 Migrating database at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current schema
    cursor.execute("PRAGMA table_info(documents)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"📋 Current columns: {columns}")
    
    # Add new columns if they don't exist
    new_columns = [
        ("last_uploaded", "TIMESTAMP"),
        ("last_opened", "TIMESTAMP"),
        ("file_hash", "TEXT")
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                print(f"⚠️ Failed to add column {col_name}: {e}")
    
    # Create new indexes
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_last_uploaded ON documents(last_uploaded)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_last_opened ON documents(last_opened)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_file_hash ON documents(file_hash)")
        print("✅ Created new indexes")
    except Exception as e:
        print(f"⚠️ Failed to create indexes: {e}")
    
    # Update existing documents
    cursor.execute("SELECT id, upload_date, file_path FROM documents WHERE last_uploaded IS NULL")
    documents_to_update = cursor.fetchall()
    
    print(f"📄 Updating {len(documents_to_update)} existing documents...")
    
    for doc_id, upload_date, file_path in documents_to_update:
        try:
            # Set last_uploaded to upload_date for existing documents
            cursor.execute(
                "UPDATE documents SET last_uploaded = ? WHERE id = ?",
                (upload_date, doc_id)
            )
            
            # Calculate file hash if file exists
            if file_path and Path(file_path).exists():
                file_hash = calculate_file_hash(Path(file_path))
                cursor.execute(
                    "UPDATE documents SET file_hash = ? WHERE id = ?",
                    (file_hash, doc_id)
                )
                print(f"  ✅ Updated {doc_id}: hash calculated")
            else:
                print(f"  ⚠️ File not found for {doc_id}: {file_path}")
                
        except Exception as e:
            print(f"  ❌ Failed to update {doc_id}: {e}")
    
    conn.commit()
    
    # Final verification
    cursor.execute("SELECT COUNT(*) FROM documents")
    total_docs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE last_uploaded IS NOT NULL")
    updated_docs = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE file_hash IS NOT NULL")
    hashed_docs = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"\n🎉 Migration complete!")
    print(f"📊 Total documents: {total_docs}")
    print(f"📊 Documents with last_uploaded: {updated_docs}")
    print(f"📊 Documents with file_hash: {hashed_docs}")

def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA256 hash of file"""
    hash_sha256 = hashlib.sha256()
    
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    except Exception as e:
        print(f"❌ Error calculating hash for {file_path}: {e}")
        return ""

if __name__ == "__main__":
    migrate_database()
