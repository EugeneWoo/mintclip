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
- Every `httpx.AsyncClient()` that calls an external API must pass `proxies=proxy_url`. Pattern: `proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80" if ws_user and ws_pass else None`. Use `proxies=` not `proxy=` (httpx version compatibility).
- Affected endpoints (both fixed): `auth_service.py` `verify_google_token()` and `auth.py` `exchange_google_code()`.
- If Google OAuth login hangs (~49s → HTTP 499), check that `WS_USER`/`WS_PASS` are set in Railway variables.
- **`GEMINI_API_KEY`** must be kept valid in Railway variables. If summaries/chat/translation silently fail with HTTP 200, check Railway logs for `Gemini API error: 400 API key not valid` — rotate the key in Google AI Studio.

## Web App Auth Gotchas
- **`exchange_google_code()` proxy**: `auth.py` `exchange_google_code()` must use the Webshare proxy just like `verify_google_token()`. Without it, web app OAuth hangs indefinitely on Railway (same root cause — Railway EU West can't reach `googleapis.com` directly).
- **React Strict Mode double-invocation**: In dev, React 18 Strict Mode calls `useEffect` twice, firing two concurrent `POST /api/auth/google/code` requests with the same code. The second request gets 400 (code already used) and redirects to `/?auth_error=true`. Fix: `useRef` guard in `AuthCallback.tsx` ensures `handleCallback()` runs only once.

## Extension State Gotchas
- **`transcriptLoading` init**: State initializes to `true`. Always call `setTranscriptLoading(false)` in EVERY path that sets transcript — including `chrome.storage.local` restore on mount. If only cleared in the fetch `finally` block, return visits to cached videos will show a stuck spinner.

## Git Workflow
- Before ending any session, run `git status` and commit/push any uncommitted changes

## File Storage (non-negotiable)
- Manual tests/AB results → `backend/manual_tests/`
- Test scripts → `backend/scripts/`
- Implementation docs → `backend/docs/`
- Bug fixes → `backend/bug-fixes/`
- Code reviews → `backend/code-review/`
