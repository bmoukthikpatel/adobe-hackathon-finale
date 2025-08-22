#!/usr/bin/env python3
"""
Emergency API endpoint to ensure documents are always accessible
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
from pathlib import Path
from datetime import datetime

app = FastAPI(title="Emergency Document API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def find_database():
    """Find the database file in any possible location"""
    possible_paths = [
        "backend/data/documents.db",
        "data/documents.db", 
        "backend/app/data/documents.db",
        "app/data/documents.db",
        "documents.db"
    ]
    
    for path in possible_paths:
        if Path(path).exists():
            return Path(path)
    
    return None

@app.get("/emergency/documents")
async def emergency_get_documents():
    """Emergency endpoint to get all documents"""
    try:
        db_path = find_database()
        if not db_path:
            return {
                "documents": [],
                "count": 0,
                "error": "No database found",
                "searched_paths": [
                    "backend/data/documents.db",
                    "data/documents.db", 
                    "backend/app/data/documents.db",
                    "app/data/documents.db",
                    "documents.db"
                ]
            }
        
        print(f"📚 Emergency API: Using database at {db_path}")
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
        if not cursor.fetchone():
            conn.close()
            return {
                "documents": [],
                "count": 0,
                "error": "Documents table not found",
                "database_path": str(db_path)
            }
        
        # Get all documents
        cursor.execute("""
            SELECT * FROM documents 
            WHERE status != 'deleted' OR status IS NULL
            ORDER BY upload_date DESC
        """)
        
        rows = cursor.fetchall()
        documents = []
        
        for row in rows:
            doc = dict(row)
            
            # Ensure required fields exist
            doc_data = {
                "id": doc.get('id', 'unknown'),
                "filename": doc.get('filename', 'unknown.pdf'),
                "original_name": doc.get('original_name', doc.get('filename', 'Unknown Document')),
                "upload_date": doc.get('upload_date', datetime.now().isoformat()),
                "file_size": doc.get('file_size', 0),
                "file_path": doc.get('file_path', ''),
                "status": doc.get('status', 'uploaded'),
                "client_id": doc.get('client_id'),
                "persona": doc.get('persona'),
                "job_role": doc.get('job_role'),
                "url": f"/api/files/{doc.get('filename', 'unknown.pdf')}"
            }
            
            documents.append(doc_data)
        
        conn.close()
        
        return {
            "documents": documents,
            "count": len(documents),
            "database_path": str(db_path),
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Emergency API error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "documents": [],
            "count": 0,
            "error": str(e),
            "success": False
        }

@app.get("/emergency/status")
async def emergency_status():
    """Check system status"""
    db_path = find_database()
    
    # Check for PDF files
    pdf_dirs = [
        "backend/data/docs",
        "data/docs",
        "backend/app/data/docs"
    ]
    
    pdf_files = []
    for pdf_dir in pdf_dirs:
        if Path(pdf_dir).exists():
            pdfs = list(Path(pdf_dir).glob("*.pdf"))
            pdf_files.extend(pdfs)
    
    return {
        "database_found": db_path is not None,
        "database_path": str(db_path) if db_path else None,
        "pdf_files_found": len(pdf_files),
        "pdf_directories_checked": pdf_dirs,
        "system_status": "operational" if db_path else "database_missing"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚨 Starting Emergency Document API on port 8081")
    print("🔗 Access at: http://localhost:8081/emergency/documents")
    uvicorn.run(app, host="0.0.0.0", port=8081)
