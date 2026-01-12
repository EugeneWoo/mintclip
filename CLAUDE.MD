# YT Coach - Chrome Extension + FastAPI Backend

## Architecture
Chrome Extension (Manifest V3) + FastAPI backend + React/TypeScript UI
- Extension: Vite-based build, service worker, content script, Shadow DOM UI
- Backend: Async Python, uvicorn server, youtube-transcript-api, Gemini 2.5-flash-lite
- Communication: Service worker ↔ Content script via message passing

## Key Components
**Extension** (`extension/`):
- `background.ts` - Service worker, handles message routing
- `content.tsx` - Content script, Shadow DOM rendering
- `App.tsx` - Main React component

**Backend** (`backend/`):
- `main.py` - FastAPI app entry point
- `routers/transcript.py` - Transcript service
- `routers/summarize.py` - Summarization service
- `routers/translate.py` - Translation service
- `routers/metadata.py` - Video metadata service
- `services/` - Core business logic

## Data Flow
1. User activates extension (click or keyboard shortcut)
2. Content script sends message to service worker
3. Service worker calls backend API (port 8787)
4. Backend fetches YouTube transcript (cached 1hr)
5. Backend generates/returns summary or translation (english greedy translation if native english captions are not available) (cached 7 days)
6. Service worker renders result in Shadow DOM overlay

## API Endpoints
- `POST /api/transcript` - Fetch transcript (returns text, segments, languages)
- `POST /api/summarize` - Generate summary (returns bullet points, takes 10-30s)
- `POST /api/translate` - Translate text (returns translated text, cached)
- `GET /api/metadata?video_id={id}` - Get video metadata

## Latest Extension UI Fixes (Jan 5, 2026)
- **Header Rendering Bug**: Fixed markdown headers (###) displaying as literal text in Shadow DOM
- **Boolean Field Migration**: Added `summary_is_structured`, `translation_is_structured` fields to distinguish formatted vs text content

## Key Files
- `extension/src/background.ts:50-80` - Message handling
- `extension/src/content.tsx:120-150` - Shadow DOM rendering
- `backend/services/transcript_service.py` - Transcript extraction logic
- `backend/services/summarize_service.py` - AI summarization

## Environment
- Python 3.10+, Node.js 18+
- Backend: `cd backend && uvicorn main:app --reload --port 8787`
- Extension: `cd extension && npm run dev`
- Requires GEMINI_API_KEY in environment
