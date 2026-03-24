# Mintclip - Chrome Extension + FastAPI Backend

## Reference Docs
- Backend: `backend/docs/BACKEND.md`
- Frontend: `web-app/docs/FRONTEND.MD`
- Caching: `backend/docs/caching_architecture.md`

## Architecture
Chrome Extension (MV3) + FastAPI backend + React/TypeScript web app
- Extension: Vite, service worker, content script, Shadow DOM UI
- Backend: Async Python, uvicorn, youtube-transcript-api, Gemini 2.5-flash-lite
- Web App: React 18 + Vite, Supabase Realtime for cross-device sync

## Key Files

**Extension**: `extension/src/background/messageHandler.ts`, `auth.ts`, `content/components/YouTubeSidebar.tsx`, `popup/index.tsx`

**Backend**: `backend/app/routes/auth.py`, `saved_items.py`, `transcript.py`, `middleware/auth.py`, `services/gemini_client.py`

**Web App**: `web-app/src/components/Dashboard.tsx`, `utils/supabase.ts`, `utils/auth.ts`

## API Endpoints
- **Core**: `/api/transcript/extract`, `/api/summary/generate`, `/api/chat/message`
- **Auth**: `/api/auth/google/token`, `/api/auth/refresh`, `/api/auth/logout`
- **Saved Items**: `/api/saved-items/save`, `/api/saved-items/list`, `/api/saved-items/{video_id}/{item_type}`
- **Config**: `/api/config/supabase`

## Environment
```bash
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Extension
cd extension && npm run dev       # dev build → localhost:8000
cd extension && npm run build     # prod build → Railway

# Web App
cd web-app && npm run dev         # port 5173
```
Requires: `GEMINI_API_KEY`, Supabase credentials (see `backend/.env.example`)

## CI / Testing
Auto-runs on push/PR to `main`, path-filtered per area.

| Job | Trigger | What it checks |
|-----|---------|----------------|
| Backend | `backend/**` | pytest (Python 3.11 + 3.12) |
| Extension | `extension/**` | Jest — 49 tests (~60s in CI) |
| Web App | `web-app/**` | TypeScript + ESLint + Jest |

Extension tests (`extension/__tests__/`):
- `manifest-validation.test.ts` — `host_permissions` covers all production URLs from `config.ts` (catches v0.1.4 auth outage class of bug)
- `api-client.test.ts` — transcript, summary, chat, token refresh
- `auth-token-management.test.ts` — `getValidAccessToken()` auto-refresh logic

```bash
cd extension && npm test -- --ci --forceExit --testPathIgnorePatterns="authentication.test" "ui-components.test"
```

## Extension Submission Checklist (CWS)
1. `host_permissions` must include all URLs in `extension/src/config.ts` production config — CI catches this automatically
2. Bump version in `extension/manifest.json`
3. `npm run build` then zip `dist/`
4. Verify: `unzip -p mintclip-extension.zip dist/manifest.json | python3 -m json.tool | grep -A8 "host_permissions\|version"`
5. Load unpacked `dist/` in Chrome and test sign-in end-to-end

## Railway / Backend Networking
- **Webshare proxy** (`WS_USER`, `WS_PASS`) is required for ALL outbound HTTP calls from Railway, not just YouTube transcript fetching. Railway EU West cannot reach Google APIs (`googleapis.com`) directly — requests hang indefinitely.
- `auth_service.py` `verify_google_token()` uses `httpx.AsyncClient(proxies=proxy_url)` with the Webshare proxy. Use `proxies=` not `proxy=` (httpx version compatibility).
- If Google OAuth login hangs (~49s → HTTP 499), check that `WS_USER`/`WS_PASS` are set in Railway variables.

## Git Workflow
- Before ending any session, run `git status` and commit/push any uncommitted changes

## File Storage (non-negotiable)
- Manual tests/AB results → `backend/manual_tests/`
- Test scripts → `backend/scripts/`
- Implementation docs → `backend/docs/`
- Bug fixes → `backend/bug-fixes/`
- Code reviews → `backend/code-review/`
