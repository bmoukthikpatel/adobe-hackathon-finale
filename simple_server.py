#!/usr/bin/env python3
"""
Simple server for Adobe PDF Intelligence - bypasses import issues
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

app = FastAPI(title="Adobe PDF Intelligence - Simple Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files if frontend is built
frontend_dist = Path("frontend/dist")
if frontend_dist.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist)), name="static")
    print("✅ Frontend static files mounted")
else:
    print("⚠️ Frontend not built - run 'npm run build' in frontend directory")

@app.get("/")
async def get_frontend():
    """Serve the frontend"""
    html_file = Path("frontend/dist/index.html")
    if html_file.exists():
        return HTMLResponse(html_file.read_text())
    
    # Fallback HTML
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Adobe PDF Intelligence</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: white; }
            .container { max-width: 800px; margin: 0 auto; text-align: center; }
            .gradient { background: linear-gradient(45deg, #06b6d4, #8b5cf6, #ec4899); 
                       -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .button { background: linear-gradient(45deg, #06b6d4, #8b5cf6); 
                     color: white; padding: 12px 24px; border: none; border-radius: 8px; 
                     text-decoration: none; display: inline-block; margin: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="gradient">Adobe PDF Intelligence</h1>
            <p>🚀 Server is running successfully!</p>
            <p>⚠️ Frontend needs to be built</p>
            <p>Run these commands to build the frontend:</p>
            <pre style="background: #1e293b; padding: 20px; border-radius: 8px; text-align: left;">
cd frontend
npm install
npm run build
            </pre>
            <a href="/config" class="button">Check Configuration</a>
            <a href="/api/recommendations/test-doc?page=1" class="button">Test API</a>
        </div>
    </body>
    </html>
    """)

@app.get("/config")
async def get_config():
    """Configuration endpoint"""
    return {
        "adobeClientId": os.getenv("ADOBE_CLIENT_ID", "a46749c05a8048448b7a9735e020a6f7"),
        "llmProvider": os.getenv("LLM_PROVIDER", "gemini"),
        "ttsProvider": os.getenv("TTS_PROVIDER", "azure"),
        "features": {
            "llmEnabled": False,  # Simplified for now
            "ttsEnabled": False
        },
        "status": "Simple server running - build frontend for full features"
    }

@app.get("/api/recommendations/{document_id}")
async def get_recommendations(document_id: str, page: int = 1):
    """Mock recommendations endpoint"""
    return {
        "recommendations": [
            {
                "id": "1",
                "title": "Introduction to Machine Learning",
                "snippet": "This section introduces fundamental concepts of machine learning algorithms.",
                "page": 5,
                "relevance": 0.95,
                "documentId": "doc-1",
                "documentName": "AI Fundamentals.pdf"
            },
            {
                "id": "2", 
                "title": "Neural Network Architecture",
                "snippet": "Detailed explanation of neural network structures and processing.",
                "page": 12,
                "relevance": 0.87,
                "documentId": "doc-2",
                "documentName": "Deep Learning Guide.pdf"
            }
        ]
    }

@app.get("/api/insights/{document_id}")
async def get_insights(document_id: str, page: int = 1):
    """Mock insights endpoint"""
    return {
        "insights": [
            {
                "id": "1",
                "type": "key-insight",
                "title": "Key Insight",
                "content": "Machine learning models require substantial amounts of quality data.",
                "relevance": 0.9
            },
            {
                "id": "2",
                "type": "did-you-know",
                "title": "Did You Know?",
                "content": "The term 'artificial intelligence' was coined by John McCarthy in 1956.",
                "relevance": 0.85
            }
        ]
    }

@app.get("/api/highlights/{document_id}")
async def get_highlights(document_id: str, page: int = 1):
    """Mock highlights endpoint"""
    return {
        "highlights": [],
        "annotations": []
    }

@app.post("/api/ask-gpt")
async def ask_gpt(data: dict):
    """Mock GPT endpoint"""
    selected_text = data.get("selected_text", "")
    return {
        "response": f"This text discusses '{selected_text[:50]}...' which is a fundamental concept in the field."
    }

@app.post("/api/generate-podcast")
async def generate_podcast(data: dict):
    """Mock podcast endpoint"""
    return {
        "audioUrl": "/api/audio/mock-podcast.wav",
        "message": "Podcast generation not available in simple server mode"
    }

@app.post("/upload/active_file")
async def upload_active_file(file: UploadFile = File(...), client_id: str = ""):
    """Mock upload endpoint"""
    return {
        "job_id": "mock-job-123",
        "message": f"File {file.filename} uploaded successfully (mock)",
        "client_id": client_id
    }

@app.post("/upload/context_files") 
async def upload_context_files(files: list[UploadFile] = File(...), client_id: str = ""):
    """Mock bulk upload endpoint"""
    return {
        "job_ids": [f"mock-job-{i}" for i in range(len(files))],
        "message": f"{len(files)} files uploaded successfully (mock)",
        "client_id": client_id
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Adobe PDF Intelligence - Simple Server")
    print("🌐 Open http://localhost:8080 in your browser")
    print("📝 This is a simplified server - build frontend for full features")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8080)
