#!/usr/bin/env python3
"""
Quick database migration script to add missing columns
Run this if you get "no such column" errors
"""

import sqlite3
from pathlib import Path

def quick_migrate():
    """Quick migration to add missing columns"""
    print("🔄 Quick database migration...")
    
    # Find database
    db_paths = [
        Path("data/documents.db"),
        Path("backend/data/documents.db"),
        Path("app/data/documents.db")
    ]
    
    db_path = None
    for path in db_paths:
        if path.exists():
            db_path = path
            break
    
    if not db_path:
        print("❌ No database found")
        return
    
    print(f"📚 Migrating database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(documents)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    print(f"📋 Existing columns: {sorted(existing_columns)}")
    
    # Add missing columns
    new_columns = [
        ("last_uploaded", "TIMESTAMP"),
        ("last_opened", "TIMESTAMP"),
        ("file_hash", "TEXT")
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                print(f"❌ Failed to add {col_name}: {e}")
        else:
            print(f"✓ Column {col_name} already exists")
    
    # Update existing documents
    try:
        cursor.execute("UPDATE documents SET last_uploaded = upload_date WHERE last_uploaded IS NULL")
        updated = cursor.rowcount
        print(f"✅ Updated {updated} documents with last_uploaded")
    except Exception as e:
        print(f"⚠️ Failed to update documents: {e}")
    
    # Create indexes
    indexes = [
        ("idx_last_uploaded", "last_uploaded"),
        ("idx_last_opened", "last_opened"),
        ("idx_file_hash", "file_hash")
    ]
    
    for index_name, column_name in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {index_name} ON documents({column_name})")
            print(f"✅ Created index: {index_name}")
        except Exception as e:
            print(f"⚠️ Failed to create index {index_name}: {e}")
    
    conn.commit()
    conn.close()
    
    print("🎉 Migration complete!")

if __name__ == "__main__":
    quick_migrate()
