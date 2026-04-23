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
- **Batch**: `/api/batch/submit`, `/api/batch/status/{job_id}` — multi-video import (up to 5 URLs)
- **Config**: `/api/config/supabase`

## Environment
```bash
# Backend — MUST use venv's uvicorn (Homebrew Python 3.14 breaks google-generativeai)
cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000

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

## Batch Import Feature
- **Components**: `web-app/src/components/BatchCard.tsx`, `BatchImport.tsx` — multi-video grouped display
- **Backend**: `backend/app/routes/batch.py` registered at `/api/batch`
- **item_type**: Batch group rows saved with `item_type='batch'`, `source='batch'`, `video_id` = comma-joined IDs (e.g. `"abc,def,ghi"`)
- **Dashboard reduce()**: Must handle `item_type='batch'` explicitly — sets `acc[videoId].item_type = 'batch'` and merges content. Without this branch, defaults to `item_type='transcript'` and the filter hides the card.
- **Modal**: `SavedItemModal.tsx` uses `isBatch = item?.source === 'batch'` to hide the Transcript tab for batch items.
- **Supabase migration required**: `backend/scripts/add_batch_source.sql` must be run in Supabase SQL Editor to add `'batch'` to the `saved_items_source_check` constraint. Without this, batch rows fail to save and `source` is never `'batch'` — causing the modal to show the Transcript tab.
- **Supabase migration required**: `backend/scripts/add_batch_item_type.sql` similarly adds `'batch'` to the `item_type` check constraint.

## Extension State Gotchas
- **`transcriptLoading` init**: State initializes to `true`. Always call `setTranscriptLoading(false)` in EVERY path that sets transcript — including `chrome.storage.local` restore on mount. If only cleared in the fetch `finally` block, return visits to cached videos will show a stuck spinner.

## Git Workflow
- Before ending any session, run `git status` and commit/push any uncommitted changes
- **Pre-push CI hook**: `.git/hooks/pre-push` runs TypeScript/ESLint/Jest/pytest for changed areas before every push (mirrors CI path-filtering). Bypass with `git push --no-verify` only in emergencies.

## File Storage (non-negotiable)
- Manual tests/AB results → `backend/manual_tests/`
- Test scripts → `backend/scripts/`
- Implementation docs → `backend/docs/`
- Bug fixes → `backend/bug-fixes/`
- Code reviews → `backend/code-review/`


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
