#!/usr/bin/env python3
"""
Comprehensive Duplicate PDF Cleaner and Time Tracker
Removes duplicate PDFs and properly sets upload/open times
"""

import sqlite3
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
import shutil

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

def find_database():
    """Find the database file"""
    possible_paths = [
        Path("backend/data/documents.db"),
        Path("data/documents.db"),
        Path("backend/app/data/documents.db")
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    return None

def analyze_duplicates():
    """Analyze and identify duplicate documents"""
    print("🔍 ANALYZING DUPLICATES")
    print("=" * 50)
    
    db_path = find_database()
    if not db_path:
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all documents
    cursor.execute("""
        SELECT id, filename, original_name, file_path, file_hash, upload_date, last_uploaded, last_opened
        FROM documents 
        WHERE status != 'deleted'
        ORDER BY original_name, upload_date
    """)
    
    documents = cursor.fetchall()
    print(f"📊 Total documents: {len(documents)}")
    
    # Group by original name and calculate hashes
    groups = {}
    hash_groups = {}
    
    for doc in documents:
        doc_dict = dict(doc)
        original_name = doc_dict['original_name']
        file_path = Path(doc_dict['file_path'])
        
        # Calculate hash if missing
        if not doc_dict['file_hash'] and file_path.exists():
            file_hash = calculate_file_hash(file_path)
            cursor.execute("UPDATE documents SET file_hash = ? WHERE id = ?", (file_hash, doc_dict['id']))
            doc_dict['file_hash'] = file_hash
        
        # Group by original name
        if original_name not in groups:
            groups[original_name] = []
        groups[original_name].append(doc_dict)
        
        # Group by hash
        if doc_dict['file_hash']:
            if doc_dict['file_hash'] not in hash_groups:
                hash_groups[doc_dict['file_hash']] = []
            hash_groups[doc_dict['file_hash']].append(doc_dict)
    
    conn.commit()
    
    # Find duplicates
    name_duplicates = {name: docs for name, docs in groups.items() if len(docs) > 1}
    hash_duplicates = {hash_val: docs for hash_val, docs in hash_groups.items() if len(docs) > 1 and hash_val}
    
    print(f"📄 Documents with duplicate names: {len(name_duplicates)}")
    print(f"🔗 Documents with duplicate hashes: {len(hash_duplicates)}")
    
    # Show duplicates
    for name, docs in name_duplicates.items():
        print(f"\n📄 '{name}' has {len(docs)} copies:")
        for doc in docs:
            file_exists = Path(doc['file_path']).exists()
            print(f"  - ID: {doc['id'][:8]}... | Hash: {doc['file_hash'][:8] if doc['file_hash'] else 'None'}... | File: {'✅' if file_exists else '❌'}")
    
    conn.close()
    return name_duplicates, hash_duplicates

def clean_duplicates():
    """Remove duplicate documents and consolidate data"""
    print("\n🧹 CLEANING DUPLICATES")
    print("=" * 50)
    
    db_path = find_database()
    if not db_path:
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all documents with hashes
    cursor.execute("""
        SELECT id, filename, original_name, file_path, file_hash, upload_date, last_uploaded, last_opened, file_size
        FROM documents 
        WHERE status != 'deleted'
        ORDER BY file_hash, upload_date
    """)
    
    documents = cursor.fetchall()
    
    # Group by hash
    hash_groups = {}
    for doc in documents:
        doc_dict = dict(doc)
        file_hash = doc_dict['file_hash']
        
        if file_hash:
            if file_hash not in hash_groups:
                hash_groups[file_hash] = []
            hash_groups[file_hash].append(doc_dict)
    
    removed_count = 0
    consolidated_count = 0
    
    for file_hash, docs in hash_groups.items():
        if len(docs) > 1:
            print(f"\n🔗 Processing {len(docs)} duplicates with hash {file_hash[:8]}...")
            
            # Sort by upload date (keep oldest as primary)
            docs.sort(key=lambda x: x['upload_date'])
            primary_doc = docs[0]
            duplicates = docs[1:]
            
            print(f"  📌 Keeping primary: {primary_doc['original_name']} (ID: {primary_doc['id'][:8]}...)")
            
            # Consolidate data from duplicates
            earliest_upload = min(doc['upload_date'] for doc in docs)
            latest_upload = max(doc['last_uploaded'] or doc['upload_date'] for doc in docs)
            latest_opened = None
            
            # Find latest opened time
            for doc in docs:
                if doc['last_opened']:
                    if not latest_opened or doc['last_opened'] > latest_opened:
                        latest_opened = doc['last_opened']
            
            # Update primary document with consolidated times
            cursor.execute("""
                UPDATE documents 
                SET last_uploaded = ?, last_opened = ?
                WHERE id = ?
            """, (latest_upload, latest_opened, primary_doc['id']))
            
            print(f"  ✅ Updated times - Upload: {latest_upload}, Opened: {latest_opened}")
            
            # Remove duplicate documents and files
            for dup_doc in duplicates:
                # Delete file if it exists
                file_path = Path(dup_doc['file_path'])
                if file_path.exists():
                    try:
                        file_path.unlink()
                        print(f"  🗑️ Deleted file: {file_path.name}")
                    except Exception as e:
                        print(f"  ⚠️ Failed to delete file {file_path.name}: {e}")
                
                # Mark as deleted in database
                cursor.execute("""
                    UPDATE documents 
                    SET status = 'deleted'
                    WHERE id = ?
                """, (dup_doc['id'],))
                
                print(f"  🗑️ Marked as deleted: {dup_doc['original_name']} (ID: {dup_doc['id'][:8]}...)")
                removed_count += 1
            
            consolidated_count += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n🎉 CLEANUP COMPLETE!")
    print(f"📊 Consolidated {consolidated_count} duplicate groups")
    print(f"🗑️ Removed {removed_count} duplicate documents")

def update_missing_hashes():
    """Calculate and update missing file hashes"""
    print("\n🔢 UPDATING MISSING HASHES")
    print("=" * 50)
    
    db_path = find_database()
    if not db_path:
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Find documents without hashes
    cursor.execute("""
        SELECT id, file_path, filename
        FROM documents 
        WHERE (file_hash IS NULL OR file_hash = '') AND status != 'deleted'
    """)
    
    documents = cursor.fetchall()
    print(f"📄 Documents missing hashes: {len(documents)}")
    
    updated_count = 0
    for doc_id, file_path, filename in documents:
        path = Path(file_path)
        if path.exists():
            file_hash = calculate_file_hash(path)
            if file_hash:
                cursor.execute("UPDATE documents SET file_hash = ? WHERE id = ?", (file_hash, doc_id))
                print(f"  ✅ Updated hash for: {filename}")
                updated_count += 1
            else:
                print(f"  ❌ Failed to calculate hash for: {filename}")
        else:
            print(f"  ⚠️ File not found: {filename}")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Updated {updated_count} file hashes")

def update_time_tracking():
    """Update missing time tracking fields"""
    print("\n⏰ UPDATING TIME TRACKING")
    print("=" * 50)
    
    db_path = find_database()
    if not db_path:
        print("❌ Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update last_uploaded for documents where it's null
    cursor.execute("""
        UPDATE documents 
        SET last_uploaded = upload_date 
        WHERE last_uploaded IS NULL AND status != 'deleted'
    """)
    
    updated_uploaded = cursor.rowcount
    print(f"✅ Updated last_uploaded for {updated_uploaded} documents")
    
    conn.commit()
    conn.close()

def main():
    """Run complete duplicate cleaning and time tracking update"""
    print("🚀 COMPREHENSIVE DUPLICATE CLEANER")
    print("=" * 50)
    
    # Step 1: Update missing hashes
    update_missing_hashes()
    
    # Step 2: Analyze duplicates
    name_duplicates, hash_duplicates = analyze_duplicates()
    
    # Step 3: Clean duplicates
    if hash_duplicates:
        clean_duplicates()
    else:
        print("✅ No hash-based duplicates found")
    
    # Step 4: Update time tracking
    update_time_tracking()
    
    # Step 5: Final verification
    db_path = find_database()
    if db_path:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM documents WHERE status != 'deleted'")
        final_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM documents WHERE file_hash IS NOT NULL AND status != 'deleted'")
        hashed_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"\n📊 FINAL STATUS:")
        print(f"📄 Active documents: {final_count}")
        print(f"🔗 Documents with hashes: {hashed_count}")

if __name__ == "__main__":
    main()
