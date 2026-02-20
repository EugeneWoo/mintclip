# CI & Self-Healing Pipeline — Mintclip

## Context
Currently there is no automated CI pipeline. Manual test scripts exist in `backend/scripts/` but they require a running server and real credentials. The goal is GitHub Actions CI that runs automatically on every push/PR, covering the 9 priority areas (auth, transcript, summary, chat, chat retrieval, cache, web-app modal, exporting, account deletion) using only free GitHub-hosted runners with **no external service calls**.

## Mocking Strategy (Key Insight)
- **Supabase**: Setting `SUPABASE_URL=""` in CI env causes `supabase_client.py:31` to skip initialization → `SUPABASE_AVAILABLE=False`. No patching needed for the "unavailable" path; per-test patches handle success paths.
- **Gemini**: `GEMINI_API_KEY=""` → `GeminiClient.model=None` → all methods return `None`. Patch `get_gemini_client` per-test for success paths.
- **Redis**: No `REDIS_URL` → `get_cache()` automatically returns `SimpleCache` (in-memory fallback).
- **YouTube Transcript API**: Patched per-test with `AsyncMock`.
- **JWT Auth**: Real JWT crypto — create tokens signed with `JWT_SECRET=test-jwt-secret-for-ci-only`. No mocking needed for auth validation.

---

## Files to Create

```
mintclip/
├── .github/workflows/ci.yml             NEW
├── backend/
│   ├── requirements-test.txt            NEW
│   ├── pytest.ini                       NEW
│   └── tests/
│       ├── __init__.py                  NEW
│       ├── conftest.py                  NEW (most critical)
│       ├── test_auth.py                 NEW
│       ├── test_transcript.py           NEW
│       ├── test_summary.py              NEW
│       ├── test_chat.py                 NEW
│       ├── test_cache.py                NEW
│       ├── test_saved_items.py          NEW
│       └── test_account_deletion.py    NEW
└── web-app/
    ├── jest.config.js                   NEW
    ├── jest.setup.ts                    NEW
    └── src/__tests__/
        ├── __mocks__/
        │   ├── config.ts                NEW
        │   ├── jszip.ts                 NEW
        │   └── styleMock.js             NEW
        ├── export.test.ts               NEW
        └── SavedItemModal.test.tsx      NEW
```

Extension already has Jest configured and working (`npm test`). No changes needed there.

---

## 1. `.github/workflows/ci.yml`

Three parallel jobs with **path filters** — each job only runs when relevant files change:

**`backend-tests`** (matrix: Python 3.11 + 3.12):
- Triggers when: `backend/**`, `.github/workflows/ci.yml` changed
- Install `requirements.txt` + `requirements-test.txt`
- Set env vars: `JWT_SECRET=test-jwt-secret-for-ci-only`, `SUPABASE_URL=""`, `GEMINI_API_KEY=""` (no `REDIS_URL`)
- Run: `pytest tests/ -v --tb=short --reruns 2 --reruns-delay 1 --cov=app --cov-report=xml`
- Upload coverage artifact (Python 3.11 only)

**`extension-tests`**:
- Triggers when: `extension/**`, `.github/workflows/ci.yml` changed
- `npm ci` in `extension/`
- `npm test -- --ci --coverage --forceExit`

**`web-app-checks`**:
- Triggers when: `web-app/**`, `.github/workflows/ci.yml` changed
- `npm ci` in `web-app/`
- Install test deps: jest, ts-jest, @testing-library/react, @testing-library/jest-dom, jest-environment-jsdom
- `npx tsc --noEmit` (type check)
- `npx eslint src --ext ts,tsx` (lint, continue-on-error initially)
- `npx jest --ci --coverage --forceExit`

**Path filter implementation** — use `dorny/paths-filter@v3` action to detect changed paths, then gate each job with `if: needs.changes.outputs.<area> == 'true'`:

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      extension: ${{ steps.filter.outputs.extension }}
      webapp: ${{ steps.filter.outputs.webapp }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
              - '.github/workflows/ci.yml'
            extension:
              - 'extension/**'
              - '.github/workflows/ci.yml'
            webapp:
              - 'web-app/**'
              - '.github/workflows/ci.yml'

  backend-tests:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    ...

  extension-tests:
    needs: changes
    if: needs.changes.outputs.extension == 'true'
    ...

  web-app-checks:
    needs: changes
    if: needs.changes.outputs.webapp == 'true'
    ...
```

**Effect on run times:**
- Change only `backend/` → only `backend-tests` runs (~2-3 min)
- Change only `web-app/` → only `web-app-checks` runs (~2-3 min)
- Change all three areas → all 3 jobs run in parallel (~3-4 min)
- Change only `.github/workflows/ci.yml` → all 3 jobs run (workflow file in every filter)
- Add `[skip ci]` to commit message to bypass entirely

---

## 2. `backend/requirements-test.txt`
```
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=5.0.0
pytest-rerunfailures>=14.0
pytest-mock>=3.14.0
```

## 3. `backend/pytest.ini`
```ini
[pytest]
testpaths = tests
asyncio_mode = auto
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    slow: marks tests as slow (deselected with -m "not slow")
    integration: requires real network access
```

---

## 4. `backend/tests/conftest.py` — Key Fixtures

```python
# Env setup BEFORE any app imports
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-ci-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
for key in ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
            "GEMINI_API_KEY", "REDIS_URL"]:
    os.environ.pop(key, None)
```

**Fixtures:**
- `client` (session-scoped) — `TestClient(app)` wrapping ASGI app
- `reset_cache` (autouse) — clears `SimpleCache` before/after each test
- `access_token` / `expired_access_token` / `refresh_token` — real JWTs signed locally
- `auth_headers` — `{"Authorization": "Bearer <token>"}`
- `make_supabase_mock(table_data, single_data, upsert_data, ...)` — factory that builds a `MagicMock` mimicking Supabase's chained query builder (`.table().select().eq().execute()`)
- `make_gemini_mock(summary, questions, chat_response, translation)` — factory for patching `get_gemini_client`
- `MOCK_TRANSCRIPT_SEGMENTS` / `MOCK_TRANSCRIPT_RESPONSE` — fixture data for transcript tests
- `make_saved_item(...)` — fixture data factory for saved item records

---

## 5. Backend Test Coverage by File

### `test_auth.py`
- Signup: service unavailable → 400; missing consent → 400; success → tokens+user; email confirmation path
- Login: invalid credentials → 401; success → tokens+profile
- Token refresh: valid refresh token → new tokens; expired → 401; wrong type → 401
- Logout: unauthenticated → 401; authenticated → success
- Google OAuth: invalid token → 401; valid → tokens

### `test_transcript.py`
- Extract: missing video_id → 400; success with video_id; success with URL; Shorts → 400; no captions → 404; cached response; non-English triggers background translation; uses cached translation
- Languages: returns list; caches response; languages-with-translation adds AI option when cache has translation
- Translate endpoint: returns cached if exists; calls Gemini and caches; rejects if translation == source text
- Cache clear: DELETE endpoint removes the key

### `test_summary.py`
- Invalid format → 400; empty transcript → 400
- All 3 formats (short/topic/qa) → 200 with mocked Gemini
- Second call returns `cached=True`; different formats have independent cache keys
- Structured JSON input with timestamps → converts to clickable YouTube links
- Gemini unavailable → error response
- Non-English transcript → auto-translation called first

### `test_chat.py`
- Suggested questions: generates 3; cached for 24h; fallback on Gemini failure
- Chat message: empty question/transcript → 400; success with history; cache hit on same question; language-keyed cache; Gemini unavailable → error

### `test_cache.py`
- `SimpleCache` directly: set/get, missing key → None, expired entry → None, delete, clear_all, size, clear_expired (only removes expired)
- Thread safety: concurrent writes don't corrupt data
- TTL constants: 24h (questions/chat), 7d (summary), 30d (transcript)
- `get_cache()` factory: returns SimpleCache without REDIS_URL; singleton behavior

### `test_saved_items.py`
- Patch pattern for all tests: `app.routes.saved_items.get_supabase_admin` + `app.services.supabase_client.is_supabase_available`
- Save: requires auth; transcript/summary_short/topic/qa succeed; quota exceeded → error; upsert on duplicate
- List: requires auth; returns all items; filters by type; returns empty list
- Get: returns item by video+type; None when not found
- Delete: specific item; all items for video; requires auth

### `test_account_deletion.py`
- GDPR export: requires auth; returns user data with correct fields; 503 when Supabase unavailable
- GDPR delete: requires auth; marks deletion (30-day grace); continues if auth.admin.delete fails
- Cancel delete: requires pending deletion; cancel removes grace period
- Full flow: delete → items cleared from Supabase table

---

## 6. Web App Tests

### `web-app/jest.config.js`
- `preset: ts-jest`, `testEnvironment: jsdom`
- `roots: src/__tests__`
- `moduleNameMapper` for CSS, config alias, JSZip mock

### `web-app/jest.setup.ts`
- `@testing-library/jest-dom`
- Mock `URL.createObjectURL` / `URL.revokeObjectURL`
- Mock `document.createElement('a').click` to capture downloads
- Mock `global.fetch`

### `export.test.ts` — Priority: Exporting
- `sanitizeFilename`: removes `<>:"/\|?*`, truncates to 200 chars
- `formatTimestamp`: 0s→"0:00", 65s→"1:05"
- `transcriptToMarkdown` / `summaryToMarkdown`: all 4 content format variants
- `exportVideoAsZip`: creates correct files in zip per item type/format; triggers download
- `fetchAllItemsForVideo`: calls correct API endpoint with Bearer token; filters by video_id

### `SavedItemModal.test.tsx` — Priority: Modal viewing (shallow)
- Renders null when `isOpen=false`; renders when `isOpen=true`
- Transcript tab: shows segments with timestamps
- Summary tab (extension source): short/topic/qa content; tab switching; copy button
- Account deletion flow (in modal settings): delete button renders; calls GDPR endpoint
- All API calls mocked with `jest.fn()`

---

## 7. Self-Healing Mechanisms

| Mechanism | Implementation |
|---|---|
| Flaky test retry | `--reruns 2 --reruns-delay 1` (pytest-rerunfailures) |
| Cache isolation | `autouse reset_cache` fixture clears SimpleCache before each test |
| Test state isolation | Function-scoped fixtures (default) — fresh mocks per test |
| Continued matrix on failure | `fail-fast: false` — both Python versions run even if one fails |
| Dependency caching | `actions/cache@v4` keyed on requirements file hash |
| Clean output | `--tb=short --strict-markers -p no:warnings` |
| No network calls | Env vars disable all external services; transcript extractor always patched |

---

---

## Phase 2: Staging Environment

### Concept
Code push → unit tests → **deploy to staging** → smoke tests against real services → **deploy to production**

```
git push main
    ↓
Phase 1: Unit tests (mocked, ~3 min) — already implemented
    ↓ if pass
Phase 2a: Deploy to Railway staging
    ↓
Phase 2b: Smoke tests against staging URL (real Supabase, Gemini, YouTube)
    ↓ if pass
Phase 2c: Deploy to Railway production
```

### Infrastructure Required
- **Second Railway service** — staging backend (free tier supports this)
- **Second Supabase project** — staging database (free tier allows 2 projects)
- Same Gemini API key can be reused (or create a separate one for rate limiting)

### GitHub Secrets to Add
_(Settings → Secrets and variables → Actions → New repository secret)_

| Secret Name | Value |
|---|---|
| `RAILWAY_API_TOKEN` | Railway account API token (for deploy trigger) |
| `RAILWAY_STAGING_SERVICE_ID` | Railway staging service ID |
| `RAILWAY_PRODUCTION_SERVICE_ID` | Railway production service ID |
| `STAGING_URL` | e.g. `https://mintclip-staging.up.railway.app` |
| `STAGING_SUPABASE_URL` | Staging Supabase project URL |
| `STAGING_SUPABASE_ANON_KEY` | Staging Supabase anon key |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Staging Supabase service role key |
| `STAGING_GEMINI_API_KEY` | Gemini API key (can reuse prod key) |
| `STAGING_JWT_SECRET` | A fixed secret for staging JWT signing |
| `STAGING_ADMIN_API_KEY` | Admin key for staging |

### CI Workflow Addition (`.github/workflows/ci.yml`)

Add three new jobs after the existing unit test jobs:

**`deploy-staging`** — triggers Railway staging redeploy via API:
```yaml
deploy-staging:
  needs: [backend-tests, extension-tests, web-app-checks]
  if: github.ref == 'refs/heads/main' && !failure()
  runs-on: ubuntu-latest
  steps:
    - name: Trigger Railway staging deploy
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RAILWAY_API_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{"serviceId": "${{ secrets.RAILWAY_STAGING_SERVICE_ID }}"}' \
          https://backboard.railway.app/graphql/v2
    - name: Wait for staging to be ready
      run: sleep 60
```

**`smoke-tests`** — runs `backend/tests/smoke_test.py` against real staging:
```yaml
smoke-tests:
  needs: deploy-staging
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: "3.11"
    - run: pip install httpx pytest pytest-asyncio
    - name: Run smoke tests
      env:
        STAGING_URL: ${{ secrets.STAGING_URL }}
        STAGING_JWT_SECRET: ${{ secrets.STAGING_JWT_SECRET }}
        STAGING_GEMINI_API_KEY: ${{ secrets.STAGING_GEMINI_API_KEY }}
      run: pytest backend/tests/smoke_test.py -v --tb=short
```

**`deploy-production`** — only runs if smoke tests pass:
```yaml
deploy-production:
  needs: smoke-tests
  if: success()
  runs-on: ubuntu-latest
  steps:
    - name: Trigger Railway production deploy
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RAILWAY_API_TOKEN }}" \
          -H "Content-Type: application/json" \
          -d '{"serviceId": "${{ secrets.RAILWAY_PRODUCTION_SERVICE_ID }}"}' \
          https://backboard.railway.app/graphql/v2
```

### `backend/tests/smoke_test.py` — What to Test

Real network calls against the staging backend:

```
TestStagingHealth:
  - GET /health → 200, all services up

TestStagingAuth:
  - POST /api/auth/signup → creates test user, returns tokens
  - POST /api/auth/login → logs in with test user
  - POST /api/auth/refresh → refreshes token
  - DELETE test user via /api/auth/gdpr/delete (cleanup)

TestStagingTranscript:
  - POST /api/transcript/extract with a known public video (e.g. dQw4w9WgXcQ)
  - Verify: success=True, language returned, segments non-empty

TestStagingTranslation:
  - POST /api/transcript/extract with a known non-English video
  - Verify: background translation triggered

TestStagingSummary:
  - POST /api/summary/generate with real transcript
  - Verify: summary non-empty, format correct

TestStagingChat:
  - POST /api/chat/suggested-questions with real transcript
  - Verify: 3 questions returned

TestStagingConfig:
  - GET /api/config/supabase → verify Supabase Realtime available
```

Test user management: use a dedicated staging test account (e.g. `ci-test@mintclip.com`) created once in the staging Supabase project. Smoke tests log in with it and clean up saved items after each run.

### What Staging Catches That Unit Tests Miss
- Supabase schema migrations breaking real queries
- Gemini API version changes (model deprecated, response format changed)
- YouTube Transcript API changes or rate limits
- Railway environment variable misconfiguration before it hits production
- RLS policy bugs (real Supabase enforces these, mocks don't)
- Redis connection issues in the Railway environment

---

## Verification Steps (Post-Implementation)

1. Push a branch → GitHub Actions tab shows 3 jobs running in parallel
2. `backend-tests` green for both Python 3.11 and 3.12
3. `extension-tests` green (existing Jest tests pass)
4. `web-app-checks` passes TypeScript + Jest
5. Introduce a deliberate bug (e.g., change a status code) → CI turns red
6. Fix the bug → CI turns green again
7. Check coverage XML artifact uploaded for backend

---

## Critical Files to Reference During Implementation

- [backend/app/services/supabase_client.py](backend/app/services/supabase_client.py) — confirms empty SUPABASE_URL → `SUPABASE_AVAILABLE=False`
- [backend/app/services/cache.py](backend/app/services/cache.py) — SimpleCache fallback, TTL constants
- [backend/app/routes/auth.py](backend/app/routes/auth.py) — async methods to mock with AsyncMock
- [backend/app/middleware/auth.py](backend/app/middleware/auth.py) — `require_auth` dependency uses `auth_service.validate_access_token`
- [extension/jest.config.js](extension/jest.config.js) — reference for web-app jest config pattern
- [web-app/src/utils/export.ts](web-app/src/utils/export.ts) — pure functions + JSZip + download trigger to test
- [web-app/src/components/modal/SavedItemModal.tsx](web-app/src/components/modal/SavedItemModal.tsx) — React component for modal tests
- [backend/scripts/test_auth_api.py](backend/scripts/test_auth_api.py) — reference for test case patterns to port to pytest
