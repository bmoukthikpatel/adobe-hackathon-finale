
# 🎯 Adobe India Hackathon 2025 - Demo Script

## 🏆 PDF Intelligence System with AI Features

### Demo Flow (5-7 minutes)

#### 1. Introduction (30 seconds)
- "Welcome to our Adobe Hackathon submission"
- "PDF Intelligence System with AI-powered features"
- "Built using provided chat_with_llm.py and generate_audio.py"

#### 2. Core Features Demo (2 minutes)
- **PDF Upload**: Upload a sample PDF
- **Cross-Document Search**: Show related sections across documents
- **Section Highlighting**: Demonstrate visual highlighting
- **Text Selection**: Select text and show AI analysis

#### 3. Bonus Feature 1: AI Insights Bulb (+5 points) (1.5 minutes)
- Click the lightbulb icon in the reader
- Show different insight types:
  - Key takeaways
  - Did-you-know facts
  - Contradictions/counterpoints
  - Cross-document connections
- Highlight persona-aware insights

#### 4. Bonus Feature 2: Podcast Mode (+5 points) (1.5 minutes)
- Click the volume icon to generate podcast
- Show 2-speaker conversational format
- Demonstrate audio playback controls
- Show download functionality
- Highlight persona-tailored content

#### 5. Technical Highlights (30 seconds)
- Docker deployable on port 8080
- Uses provided scripts (chat_with_llm.py, generate_audio.py)
- Gemini AI integration with credentials.json
- Azure TTS for high-quality audio

#### 6. Scoring Summary (30 seconds)
- Core features: ✅ Complete
- Bonus Feature 1 (Insights): ✅ +5 points
- Bonus Feature 2 (Podcast): ✅ +5 points
- **Total Bonus: +10 points**

### Key Demo Tips:
1. Have sample PDFs ready (technical documents work best)
2. Ensure internet connection for AI features
3. Test audio playback beforehand
4. Show mobile-responsive design
5. Highlight the floating action buttons
6. Demonstrate the document card quick actions

### Backup Plans:
- If AI fails: Show mock data responses
- If audio fails: Show script generation
- If upload fails: Use pre-loaded documents

### Questions to Anticipate:
- "How does cross-document search work?" → Vector embeddings + semantic similarity
- "What makes the insights persona-aware?" → LLM prompting with user context
- "How is the podcast generated?" → AI script generation + TTS synthesis
- "Is it production ready?" → Yes, Docker deployable with environment variables
