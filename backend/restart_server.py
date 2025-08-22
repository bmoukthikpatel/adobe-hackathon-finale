#!/usr/bin/env python3
"""
Restart server script to ensure fresh imports
"""

import sys
import os
import subprocess

def restart_server():
    """Restart the server with fresh imports"""
    print("🔄 Restarting server with fresh imports...")
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Clear Python cache
    print("🧹 Clearing Python cache...")
    for root, dirs, files in os.walk('.'):
        for d in dirs:
            if d == '__pycache__':
                cache_dir = os.path.join(root, d)
                try:
                    import shutil
                    shutil.rmtree(cache_dir)
                    print(f"  Removed: {cache_dir}")
                except Exception as e:
                    print(f"  Failed to remove {cache_dir}: {e}")
    
    # Start server
    print("🚀 Starting server...")
    cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
    subprocess.run(cmd)

if __name__ == "__main__":
    restart_server()
