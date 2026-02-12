# Mintclip Backend API

Python FastAPI backend for YouTube transcript extraction, AI summarization, and chat features.

## Tech Stack

- **FastAPI**: Modern Python web framework
- **youtube-transcript-api v1.2.3+**: Free YouTube caption extraction (latest version with improved API)
- **Google Gemini 1.5 Flash**: AI summarization and chat
- **Deepgram Nova-2**: Fallback transcription (for videos without captions)

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `DEEPGRAM_API_KEY`: Get from [Deepgram Console](https://console.deepgram.com/) (optional, for fallback transcription)
- `PINECONE_API_KEY`: Get from [Pinecone](https://www.pinecone.io/) (optional, for fast semantic search in chat)

### 4. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Transcript Extraction

#### Extract Transcript
```bash
POST /api/transcript/extract
Content-Type: application/json

{
  "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "languages": ["en"]  # Optional
}
```

Response:
```json
{
  "success": true,
  "video_id": "VIDEO_ID",
  "language": "en",
  "is_generated": false,
  "transcript": [
    {
      "timestamp": "00:00",
      "start_seconds": 0.0,
      "duration": 3.5,
      "text": "Hello world"
    }
  ],
  "full_text": "Complete transcript as a single string..."
}
```

#### Get Available Languages
```bash
GET /api/transcript/languages/{video_id}
```

### Summary Generation (Coming Soon)
```bash
POST /api/summary/generate
```

### Chat
```bash
POST /api/chat/message
Content-Type: application/json

{
  "video_id": "VIDEO_ID",
  "transcript": "Full transcript text...",
  "question": "What is this video about?",
  "chat_history": [],
  "language": "en"
}
```

Response:
```json
{
  "success": true,
  "response": "This video is about...",
  "cached": false
}
```

**Cache**: Responses are cached for 24 hours based on video_id + question + language

## Testing

### Test Transcript Extraction

```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## Architecture

### Transcript Extraction Flow

1. **Primary**: `youtube-transcript-api` (FREE)
   - Scrapes public YouTube captions
   - No API key needed
   - Works for most videos with captions

2. **Fallback**: Deepgram Nova-2 ($0.13 per 30min)
   - Used when video has no captions
   - High-quality audio transcription

### Free Tier Limits

- **Gemini 1.5 Flash**: 15 req/min, 1500 req/day (FREE)
- **Transcript Extraction**: Unlimited (youtube-transcript-api is free)
- **User Limits**: 10 summaries/month, 5 chat messages per video

## Development

### Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── routes/              # API route handlers
│   │   ├── transcript.py    # Transcript endpoints
│   │   ├── summary.py       # Summary endpoints
│   │   └── chat.py          # Chat endpoints
│   └── services/            # Business logic
│       ├── transcript_extractor.py
│       ├── summarizer.py    # TODO
│       └── chat_handler.py  # TODO
├── requirements.txt
├── .env.example
└── README.md
```

### Adding New Features

1. Create service in `app/services/`
2. Create route in `app/routes/`
3. Register router in `app/main.py`

## License

Private - Mintclip Project
