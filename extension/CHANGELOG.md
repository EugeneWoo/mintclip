# Mintclip Extension Changelog

## v0.1.8 — Pending CWS Review
**Status**: Built, not yet submitted

### Bug Fixes
- Fixed missing `translateToEnglishInBackground` call in translation flow
- Fixed duplicate "AI-translated English" entries appearing in the language dropdown

---

## v0.1.6 — Pending CWS Review
**Status**: Built, not yet submitted

### Bug Fixes
- **Critical**: Fixed Google sign-in stuck at "Signing in..." for all Chrome Web Store users
  - Root cause: `host_permissions` in manifest was missing `https://mintclip-production.up.railway.app/*`
  - Chrome silently blocked the backend auth fetch after `getAuthToken` succeeded
  - This bug affected all users since v0.1.1 (first public listing)
- Fixed "How to Use" subtitle text invisible in dark mode
  - Was hardcoded to `#000000` (black on dark background)
  - Now uses `textSecondary` theme variable for proper dark/light mode support

---

## v0.1.4 — Live on Chrome Web Store
**Status**: Current live version (contains auth bug)

### Bug Fixes
- Fixed concurrent transcript auto-fetch requests firing simultaneously
- Fixed transcript unavailable handling with a single `transcriptDisabled` flag (cleaner state)
- Updated HowToUseScreen font sizes and added support email (getmintclip@gmail.com)

### Backend (deployed alongside)
- Fixed backend suppressing auto-generated English when native English transcript exists
- Fixed language detection to use `startswith('en')` instead of exact match
- Made auth optional on `/api/transcript/extract`, `/api/summary/generate`, `/api/chat/message`

---

## v0.1.3 — Submitted to CWS
**Status**: Superseded by v0.1.4

### Features
- Added "How to Use" tab with full feature walkthrough (User Guide)
- Added video-synced transcript auto-scroll and line highlighting

### Backend (deployed alongside)
- Replaced BM25 retrieval with embeddings + full transcript fallback for chat
- Improved Gemini response quality and length calibration
- Added bulk delete with per-card checkboxes on dashboard
- Fixed Summary filter on dashboard

---

## v0.1.2 — Submitted to CWS
**Status**: Superseded by v0.1.3

### Bug Fixes
- Added auth re-injection listener to recover auth state after service worker restarts

---

## v0.1.1 — First Public Listing on CWS
**Status**: First approved submission

### Changes from initial rejection
- Removed PDF export feature (jsPDF library flagged for remote hosted code violation by CWS reviewer)
- Removed `exportAsPDF` function and "Export as PDF" button from Summary tab
- Export as Text and Export as Markdown retained

### Known issues (present from this version onwards)
- Google sign-in broken for all CWS users due to missing `host_permissions` for production backend URL
