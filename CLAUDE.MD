# Mintclip - Chrome Extension + FastAPI Backend

## Architecture
Chrome Extension (Manifest V3) + FastAPI backend + React/TypeScript UI
- Extension: Vite-based build, service worker, content script, Shadow DOM UI
- Backend: Async Python, uvicorn server, youtube-transcript-api, Gemini 2.5-flash-lite
- Communication: Service worker ↔ Content script via message passing

## Core Features

### Authentication & Session Management
- Google OAuth via Chrome Identity API
- Automatic token refresh (1hr access tokens, 30-90 day refresh tokens)
- Files: `extension/src/background/auth.ts`, `extension/src/popup/auth.ts`, `backend/app/routes/auth.py`

### Saved Items
- Save buttons in Transcript, Summary, Chat tabs
- Supabase storage with quota limits (25 free, unlimited premium)
- 30-day expiration for free tier
- Files: `extension/src/content/components/YouTubeSidebar.tsx` (lines 972-1090), `backend/app/routes/saved_items.py`

### Transcript & AI Features
- Multi-language transcript extraction with AI translation (Gemini)
- Three summary formats: Short, Topic-based, Q&A
- Context-aware chat with video transcript
- Caching: In-memory (MVP), 30 days transcripts, 7 days summaries/translations, 24 hours chat messages
- Files: `backend/app/routes/transcript.py`, `backend/app/services/cache.py`

## Data Flow

### Transcript Extraction & Translation
1. Extension requests transcript → Backend calls YouTube Transcript API
2. Backend detects available languages, returns transcript with segments
3. **If non-English**: Backend eagerly translates to English in background
   - Translation cached in-memory (MVP): `transcript_translation:{video_id}:{lang}` (7 days TTL)
   - Cache clears on server restart (acceptable for MVP)
4. Frontend prioritizes English: checks native English first, falls back to AI-translated
5. English transcript sent to summary endpoint with `language='en'`
6. Summary endpoint skips translation, summarizes directly (cached 7 days)

### Save Item Flow (with Auto Token Refresh)
1. User clicks "Save" → Handler sends `SAVE_ITEM` message
2. Service worker calls `getValidAccessToken()` → Auto-refreshes if expired
3. Service worker posts to `/api/saved-items/save` with Bearer token
4. Backend validates token, checks quota, upserts to Supabase `saved_items` table
5. Component shows "✓ Saved" feedback or prompts re-login on auth error

## API Endpoints

**Core**: `/api/transcript/extract`, `/api/summary/generate`, `/api/chat/message`
**Auth**: `/api/auth/google/token`, `/api/auth/refresh`, `/api/auth/logout`
**Saved Items**: `/api/saved-items/save`, `/api/saved-items/list`, `/api/saved-items/{video_id}/{item_type}`

## Database Schema (Supabase)

### saved_items Table
- Columns: `id`, `user_id`, `video_id`, `item_type`, `content` (jsonb), `created_at`, `expires_at`
- Unique constraint: `(user_id, video_id, item_type)` - prevents duplicates
- Quota: 25 items (free), unlimited (premium)

## Key Files

**Extension**:
- `extension/src/background/messageHandler.ts` - Message routing, SAVE_ITEM handler
- `extension/src/background/auth.ts` - Token refresh logic (`getValidAccessToken()`)
- `extension/src/content/components/YouTubeSidebar.tsx` - Save handlers (lines 972-1090)
- `extension/src/popup/index.tsx` - Auth UI

**Backend**:
- `backend/app/routes/auth.py` - Auth endpoints with token refresh
- `backend/app/routes/saved_items.py` - CRUD with quota management
- `backend/app/services/gemini_client.py` - AI integration
- `backend/app/middleware/auth.py` - Token validation

## Environment
- Python 3.10+, Node.js 18+
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
- Extension: `cd extension && npm run dev`
- Requires GEMINI_API_KEY and Supabase credentials (see `backend/.env.example`)

## Troubleshooting
- **Token expired**: Auto-refresh implemented, should work seamlessly
- **Quota reached**: Free tier limited to 25 items (upgrade to premium)
- **Backend errors**: Verify backend running on port 8000, check Supabase credentials

## File Storage (non-negotiable)
- Manual tests/AB results → `backend/manual_tests/`
- Test scripts (.py/.sh) → `backend/scripts/`
- Implementation docs (.md) → `backend/docs/`
- Bug fixes → `backend/bug-fixes/`
- Code reviews → `backend/code-review/`
