# Mintclip - AI-Powered YouTube Transcript Extension

A Chrome extension with FastAPI backend that provides AI-powered transcript extraction, summarization, and chat functionality for YouTube videos.

## 🚀 Quick Links

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

### Interactive Features
- **Clickable Timestamps**: Jump directly to specific moments in videos
- **Smart Grouping**: Natural paragraph breaks based on speech patterns
- **Language Switching**: View transcripts in original or AI-translated English
- **Persistent Caching**: 1-hour TTL for instant language switching

### AI-Powered (Coming Soon)
- Automatic video summarization
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

# Frontend tests
cd extension
npm test
```

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

**Status**: ✅ Active Development | **Last Updated**: January 2025
