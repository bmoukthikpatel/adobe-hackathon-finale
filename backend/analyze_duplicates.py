#!/usr/bin/env python3
"""
Analyze current duplicate issues in the database
"""

import sqlite3
import re
from collections import defaultdict
import hashlib
from pathlib import Path

def analyze_duplicates():
    """Analyze current duplicate situation"""
    print("🔍 Analyzing current duplicate issues...")
    print("=" * 50)
    
    conn = sqlite3.connect('data/documents.db')
    cursor = conn.cursor()

    # Get all documents with their names and file info
    cursor.execute('''
        SELECT id, original_name, filename, file_size, file_hash, upload_date, last_opened 
        FROM documents WHERE status != "deleted"
    ''')
    docs = cursor.fetchall()

    print(f'📊 Total active documents: {len(docs)}')
    print()

    # Group by original name (ignoring case and common variations)
    name_groups = defaultdict(list)
    for doc in docs:
        doc_id, original_name, filename, file_size, file_hash, upload_date, last_opened = doc
        
        # Clean the name for comparison
        if original_name:
            clean_name = original_name.lower().strip()
            # Remove common variations
            clean_name = re.sub(r'\s+', ' ', clean_name)  # Normalize whitespace
            clean_name = re.sub(r'\.pdf$', '', clean_name, flags=re.IGNORECASE)  # Remove .pdf extension
        else:
            clean_name = 'unknown'
            
        name_groups[clean_name].append({
            'id': doc_id,
            'original_name': original_name,
            'filename': filename,
            'file_size': file_size,
            'file_hash': file_hash,
            'upload_date': upload_date,
            'last_opened': last_opened
        })

    # Find potential duplicates
    duplicates = {name: docs for name, docs in name_groups.items() if len(docs) > 1}

    print(f'🔍 Found {len(duplicates)} groups with potential duplicates:')
    print()

    total_duplicates = 0
    for name, docs in duplicates.items():
        print(f'📄 "{name}" ({len(docs)} copies):')
        for doc in docs:
            hash_display = doc['file_hash'][:8] + '...' if doc['file_hash'] else 'None'
            print(f'   - ID: {doc["id"][:8]}... | Size: {doc["file_size"]} bytes | Hash: {hash_display}')
            print(f'     Upload: {doc["upload_date"]} | Last Opened: {doc["last_opened"]}')
        print()
        total_duplicates += len(docs) - 1  # Count extras (keep one)

    print(f'📊 Summary:')
    print(f'   - Total documents: {len(docs)}')
    print(f'   - Duplicate groups: {len(duplicates)}')
    print(f'   - Duplicate files to remove: {total_duplicates}')
    print()

    # Check file naming pattern
    print('📁 File naming patterns (first 5):')
    for i, doc in enumerate(docs[:5]):
        print(f'   Original: "{doc[1]}" -> Filename: "{doc[2]}"')
    print()

    # Check for files with same hash
    hash_groups = defaultdict(list)
    for doc in docs:
        if doc[4]:  # file_hash exists
            hash_groups[doc[4]].append(doc)
    
    hash_duplicates = {h: docs for h, docs in hash_groups.items() if len(docs) > 1}
    print(f'🔐 Found {len(hash_duplicates)} groups with identical file hashes:')
    for hash_val, docs in hash_duplicates.items():
        print(f'   Hash {hash_val[:8]}... ({len(docs)} files):')
        for doc in docs:
            print(f'     - {doc[1]} (ID: {doc[0][:8]}...)')
    print()

    conn.close()
    return duplicates, hash_duplicates

if __name__ == "__main__":
    analyze_duplicates()
