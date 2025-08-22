#!/usr/bin/env python3
"""
Comprehensive database diagnostic and repair system
"""

import sqlite3
import os
import shutil
from pathlib import Path
from datetime import datetime
import uuid

def find_all_databases():
    """Find all possible database files"""
    possible_paths = [
        "data/documents.db",
        "backend/data/documents.db", 
        "backend/app/data/documents.db",
        "app/data/documents.db",
        "documents.db"
    ]
    
    found_dbs = []
    for path in possible_paths:
        if os.path.exists(path):
            found_dbs.append(Path(path).absolute())
    
    return found_dbs

def find_all_pdf_files():
    """Find all PDF files in possible locations"""
    possible_dirs = [
        "data/docs",
        "backend/data/docs",
        "backend/app/data/docs", 
        "app/data/docs",
        "docs"
    ]
    
    all_pdfs = []
    for dir_path in possible_dirs:
        if os.path.exists(dir_path):
            pdf_dir = Path(dir_path)
            pdfs = list(pdf_dir.glob("*.pdf"))
            all_pdfs.extend([(pdf, pdf_dir) for pdf in pdfs])
    
    return all_pdfs

def consolidate_databases():
    """Consolidate all databases into one master database"""
    print("🔧 CONSOLIDATING DATABASES")
    print("=" * 50)
    
    # Find all databases
    databases = find_all_databases()
    print(f"Found {len(databases)} database files:")
    for db in databases:
        print(f"  - {db}")
    
    # Create master database location
    master_db_path = Path("backend/data/documents.db")
    master_db_path.parent.mkdir(parents=True, exist_ok=True)
    
    # If master exists, back it up
    if master_db_path.exists():
        backup_path = master_db_path.with_suffix(f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
        shutil.copy2(master_db_path, backup_path)
        print(f"📋 Backed up existing database to: {backup_path}")
    
    # Create/recreate master database
    conn = sqlite3.connect(master_db_path)
    cursor = conn.cursor()
    
    # Create table with comprehensive schema
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            upload_date TIMESTAMP NOT NULL,
            file_size INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            status TEXT DEFAULT 'uploaded',
            client_id TEXT,
            persona TEXT,
            job_role TEXT,
            processing_status TEXT DEFAULT 'pending',
            validation_result TEXT,
            metadata TEXT,
            last_accessed TIMESTAMP,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_upload_date ON documents(upload_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON documents(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_client_id ON documents(client_id)")
    
    all_documents = {}
    
    # Merge all databases
    for db_path in databases:
        if db_path == master_db_path:
            continue
            
        try:
            source_conn = sqlite3.connect(db_path)
            source_conn.row_factory = sqlite3.Row
            source_cursor = source_conn.cursor()
            
            # Check if documents table exists
            source_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
            if not source_cursor.fetchone():
                print(f"⚠️ No documents table in {db_path}")
                source_conn.close()
                continue
            
            # Get all documents
            source_cursor.execute("SELECT * FROM documents")
            rows = source_cursor.fetchall()
            
            print(f"📄 Found {len(rows)} documents in {db_path}")
            
            for row in rows:
                doc_id = row['id']
                if doc_id not in all_documents:
                    all_documents[doc_id] = dict(row)
                    print(f"  + {row.get('original_name', row.get('filename', 'Unknown'))}")
            
            source_conn.close()
            
        except Exception as e:
            print(f"❌ Error reading {db_path}: {e}")
    
    # Insert all unique documents into master database
    for doc_id, doc_data in all_documents.items():
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO documents (
                    id, filename, original_name, upload_date, file_size, file_path,
                    status, client_id, persona, job_role, processing_status,
                    validation_result, metadata, last_accessed, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_data.get('id'),
                doc_data.get('filename'),
                doc_data.get('original_name', doc_data.get('filename')),
                doc_data.get('upload_date', datetime.now().isoformat()),
                doc_data.get('file_size', 0),
                doc_data.get('file_path', ''),
                doc_data.get('status', 'uploaded'),
                doc_data.get('client_id'),
                doc_data.get('persona'),
                doc_data.get('job_role'),
                doc_data.get('processing_status', 'pending'),
                doc_data.get('validation_result'),
                doc_data.get('metadata'),
                doc_data.get('last_accessed'),
                doc_data.get('tags')
            ))
        except Exception as e:
            print(f"❌ Error inserting document {doc_id}: {e}")
    
    conn.commit()
    
    # Get final count
    cursor.execute("SELECT COUNT(*) FROM documents")
    final_count = cursor.fetchone()[0]
    
    conn.close()
    
    print(f"✅ Master database created with {final_count} documents at: {master_db_path}")
    return master_db_path

def scan_and_add_orphaned_pdfs():
    """Find PDF files not in database and add them"""
    print("\n🔍 SCANNING FOR ORPHANED PDF FILES")
    print("=" * 50)
    
    # Get master database
    master_db_path = Path("backend/data/documents.db")
    if not master_db_path.exists():
        print("❌ Master database not found")
        return
    
    # Get all PDFs
    all_pdfs = find_all_pdf_files()
    print(f"Found {len(all_pdfs)} PDF files total")
    
    # Get existing filenames from database
    conn = sqlite3.connect(master_db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT filename FROM documents")
    existing_filenames = {row[0] for row in cursor.fetchall()}
    
    # Find orphaned PDFs
    orphaned_pdfs = []
    for pdf_path, pdf_dir in all_pdfs:
        if pdf_path.name not in existing_filenames:
            orphaned_pdfs.append((pdf_path, pdf_dir))
    
    print(f"Found {len(orphaned_pdfs)} orphaned PDF files:")
    
    # Add orphaned PDFs to database
    for pdf_path, pdf_dir in orphaned_pdfs:
        try:
            # Extract original name (remove UUID prefix if present)
            filename = pdf_path.name
            if '_' in filename and len(filename.split('_')[0]) == 36:  # UUID length
                original_name = '_'.join(filename.split('_')[1:])
            else:
                original_name = filename
            
            # Remove .pdf extension for display
            if original_name.endswith('.pdf'):
                original_name = original_name[:-4]
            
            doc_id = str(uuid.uuid4())
            file_size = pdf_path.stat().st_size
            upload_date = datetime.fromtimestamp(pdf_path.stat().st_mtime)
            
            cursor.execute("""
                INSERT INTO documents (
                    id, filename, original_name, upload_date, file_size, file_path, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                filename,
                original_name,
                upload_date.isoformat(),
                file_size,
                str(pdf_path),
                'uploaded'
            ))
            
            print(f"  + Added: {original_name}")
            
        except Exception as e:
            print(f"  ❌ Failed to add {pdf_path.name}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"✅ Added {len(orphaned_pdfs)} orphaned PDFs to database")

def consolidate_pdf_files():
    """Move all PDF files to standard location"""
    print("\n📁 CONSOLIDATING PDF FILES")
    print("=" * 50)
    
    # Standard location
    standard_docs_dir = Path("backend/data/docs")
    standard_docs_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all PDFs
    all_pdfs = find_all_pdf_files()
    moved_count = 0
    
    for pdf_path, pdf_dir in all_pdfs:
        target_path = standard_docs_dir / pdf_path.name
        
        # Skip if already in standard location
        if pdf_path.parent == standard_docs_dir:
            continue
        
        try:
            # Move file to standard location
            if not target_path.exists():
                shutil.move(str(pdf_path), str(target_path))
                moved_count += 1
                print(f"  → Moved: {pdf_path.name}")
            else:
                print(f"  ⚠️ Already exists: {pdf_path.name}")
        except Exception as e:
            print(f"  ❌ Failed to move {pdf_path.name}: {e}")
    
    print(f"✅ Moved {moved_count} PDF files to standard location")

def update_file_paths_in_database():
    """Update file paths in database to point to standard location"""
    print("\n🔧 UPDATING DATABASE FILE PATHS")
    print("=" * 50)
    
    master_db_path = Path("backend/data/documents.db")
    standard_docs_dir = Path("backend/data/docs")
    
    conn = sqlite3.connect(master_db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, filename, file_path FROM documents")
    documents = cursor.fetchall()
    
    updated_count = 0
    for doc_id, filename, old_path in documents:
        new_path = standard_docs_dir / filename
        
        if str(new_path) != old_path:
            cursor.execute("UPDATE documents SET file_path = ? WHERE id = ?", (str(new_path), doc_id))
            updated_count += 1
    
    conn.commit()
    conn.close()
    
    print(f"✅ Updated {updated_count} file paths in database")

def main():
    """Run complete database repair"""
    print("🚀 COMPREHENSIVE DATABASE REPAIR")
    print("=" * 50)
    
    # Step 1: Consolidate databases
    master_db = consolidate_databases()
    
    # Step 2: Consolidate PDF files
    consolidate_pdf_files()
    
    # Step 3: Scan for orphaned PDFs
    scan_and_add_orphaned_pdfs()
    
    # Step 4: Update file paths
    update_file_paths_in_database()
    
    # Step 5: Final verification
    conn = sqlite3.connect(master_db)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM documents WHERE status != 'deleted'")
    total_docs = cursor.fetchone()[0]
    conn.close()
    
    print(f"\n🎉 REPAIR COMPLETE!")
    print(f"📊 Total documents in database: {total_docs}")
    print(f"📁 Database location: {master_db}")
    print(f"📁 PDF files location: backend/data/docs/")

if __name__ == "__main__":
    main()
