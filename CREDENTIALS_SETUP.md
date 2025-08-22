# Adobe Hackathon 2025 - Credentials Setup

## 🔐 Gemini Authentication with credentials.json

The application now uses the `credentials.json` file for Google Gemini authentication instead of API keys.

### ✅ Current Setup

The system automatically detects and uses `credentials.json` from the project root directory.

**Authentication Priority Order:**
1. `GOOGLE_API_KEY` environment variable (highest priority)
2. `GOOGLE_APPLICATION_CREDENTIALS` environment variable  
3. `credentials.json` in project root (automatic detection) ✅ **CURRENT**

### 📁 File Location

```
chatgpt hackathon/
├── credentials.json          ✅ Found here
├── backend/
├── frontend/
└── start_server.py
```

### 🚀 Quick Start

1. **Install Dependencies** (if not already done):
   ```bash
   pip install fastapi uvicorn langchain langchain-google-genai sentence-transformers
   ```

2. **Start the Server**:
   ```bash
   python start_server.py
   ```

3. **Access the Application**:
   - Open browser: http://localhost:8080
   - Docker deployable on port 8080

### 🧪 Test Authentication

Test if credentials are working:
```bash
cd backend
python test_gemini_credentials.py
```

### 📋 Environment Variables (Auto-set)

The following are automatically configured per Adobe Hackathon requirements:
- `LLM_PROVIDER=gemini`
- `GEMINI_MODEL=gemini-2.5-flash`
- `TTS_PROVIDER=azure`

### 🏆 Adobe Hackathon Compliance

✅ Uses provided `chat_with_llm.py` script  
✅ Docker deployable on port 8080  
✅ Core features: PDF bulk/fresh upload, cross-document section highlighting  
✅ Bonus features: Insights bulb (+5 points), Podcast mode (+5 points)  
✅ Credentials-based authentication (secure)

### 🔧 Manual Environment Setup

If needed, you can manually set environment variables:
```bash
# Windows
set LLM_PROVIDER=gemini
set GEMINI_MODEL=gemini-2.5-flash
set TTS_PROVIDER=azure

# Linux/Mac
export LLM_PROVIDER=gemini
export GEMINI_MODEL=gemini-2.5-flash
export TTS_PROVIDER=azure
```

### 🐛 Troubleshooting

**If authentication fails:**
1. Verify `credentials.json` exists in project root
2. Check file permissions
3. Ensure credentials have Gemini API access
4. Run test script: `python backend/test_gemini_credentials.py`

**If server won't start:**
1. Install missing dependencies
2. Check port 8080 is available
3. Verify all files are in correct locations
