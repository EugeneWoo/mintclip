# Mintclip - AI-Powered YouTube Transcript Extension

A Chrome extension with FastAPI backend that provides AI-powered transcript extraction, summarization, and chat functionality for YouTube videos.

## 🚀 Quick Links

- **[Chrome Web Store](https://chromewebstore.google.com/detail/mintclip/kbalipdjcmliicfodacdbgngflaelnnm)** - Install the extension
- **[Web App](https://mintclip.up.railway.app/)** - Access your saved items
- **[Backend API](backend/)** - FastAPI server with transcript extraction & AI features
- **[Chrome Extension](extension/)** - Client-side extension for YouTube
- **[Agent OS Standards](agent-os/)** - Product specs and development standards
- **[Documentation](.claude/)** - Development guides and session notes

## 📁 Repository Structure

```
mintclip/
├── backend/          # FastAPI server (Python)
├── extension/        # Chrome extension (React + TypeScript)
├── agent-os/         # Product specifications
├── .claude/          # Development documentation
└── CLAUDE.md         # Project documentation & context
```

## ✨ Features

### Transcript Extraction
- Automatic transcript fetching from YouTube videos
- Multi-language support with smart fallback
- AI translation to English for non-English videos
- Eager translation for instant summary generation
- Graceful handling when transcripts are disabled or unavailable — Summary and Chat tabs are disabled, "No transcript available for this video." shown

### Interactive Features
- **Clickable Timestamps**: Jump directly to specific moments in videos
- **Smart Grouping**: Natural paragraph breaks based on speech patterns
- **Language Switching**: View transcripts in original or AI-translated English
- **Persistent Caching**: 1-hour TTL for instant language switching

### AI-Powered
- Automatic video summarization (short, topic-based, Q&A formats)
- Contextual Q&A chat about video content
- Suggested questions based on transcript

## 🛠️ Tech Stack

**Backend:**
- FastAPI v0.104.1
- youtube-transcript-api >=0.6.2
- Google Gemini 2.5 Flash Lite
- Webshare rotating residential proxies

**Frontend:**
- React + TypeScript
- Chrome Extension APIs (Manifest V3)
- Shadow DOM for UI isolation
- Vite build system

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Chrome browser

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure your API keys
uvicorn app.main:app --reload
```

### Extension Setup
```bash
cd extension
npm install
npm run build
```

Load the `extension/dist/` folder in Chrome at `chrome://extensions/`

### Testing
```bash
# Backend tests
cd backend
pytest

# Extension tests (49 tests — manifest, API client, auth token management)
cd extension
npm test -- --ci --forceExit --testPathIgnorePatterns="authentication.test" "ui-components.test"

# Web app tests
cd web-app
npx jest --ci --forceExit
```

## 🔁 CI (GitHub Actions)

Tests run automatically on every push or PR to `main`. Three jobs, path-filtered so only changed areas run:

| Job | Trigger | What it checks |
|-----|---------|----------------|
| **Backend Tests** | `backend/**` changed | pytest suite (Python 3.11 + 3.12) |
| **Extension Tests** | `extension/**` changed | manifest validation, API client, auth token management (Jest, ~60s) |
| **Web App Checks** | `web-app/**` changed | TypeScript, ESLint, Jest |

**Extension test highlights** — these catch the class of bugs that caused production outages:
- `manifest-validation.test.ts` — asserts `host_permissions` in `manifest.json` covers all production URLs from `src/config.ts` (catches the v0.1.4 auth bug)
- `api-client.test.ts` — verifies transcript fetch, summary, chat, and token refresh request shape and error handling
- `auth-token-management.test.ts` — verifies `getValidAccessToken()` auto-refresh logic

## 📖 Documentation

- **[Project Context](CLAUDE.md)** - Comprehensive project documentation, recent changes, and architecture
- **[Session Summaries](.claude/)** - Development session notes and progress tracking

## 🤝 Contributing

This project uses Agent OS for structured development workflows. See the [agent-os/](agent-os/) directory for:
- Product specifications
- Development standards
- Implementation guidelines

## 📝 License

[Add your license information here]

## 🔗 Links

- **GitHub**: https://github.com/EugeneWoo/mintclip
- **Issue Tracker**: https://github.com/EugeneWoo/mintclip/issues

---

**Status**: ✅ Active Development | **Last Updated**: March 2026
