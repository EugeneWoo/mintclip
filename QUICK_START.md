# Quick Start Guide

## First Time Setup

### Backend

```bash
# 1. Create virtual environment with Python 3.12
/opt/homebrew/bin/python3.12 -m venv .venv

# 2. Install dependencies
.venv/bin/pip install -r backend/requirements.txt

# 3. Setup environment (first time only - don't overwrite existing .env!)
cd backend
# Safe copy (only if .env doesn't exist)
[ ! -f .env ] && cp .env.example .env || echo ".env already exists"
# Edit .env and add your API keys

# 4. Start server
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

### Extension

```bash
# 1. Install dependencies
cd extension
npm install

# 2. Setup environment (first time only - don't overwrite existing .env!)
# Safe copy (only if .env doesn't exist)
[ ! -f .env ] && cp .env.example .env || echo ".env already exists"
# .env should have: VITE_BACKEND_URL=http://localhost:8000

# 3. Start development build
npm run dev

# 4. Load extension in Chrome
# - Go to chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select extension/dist/ folder
```

## Daily Development

```bash
# Terminal 1: Backend
.venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2: Extension
cd extension && npm run dev

# Changes auto-reload in both!
```

## Deploying to Production

### 1. Deploy Backend to Railway

```bash
# Setup Railway (first time only)
npm install -g @railway/cli
railway login
railway init  # Or railway link if project exists

# Set environment variables (first time only)
railway variables set ENVIRONMENT=production
railway variables set GEMINI_API_KEY=your_prod_key
railway variables set JWT_SECRET=$(openssl rand -hex 32)
# ... copy all variables from backend/.env.example

# Deploy
railway up

# Get your production URL
railway domain
# Example: https://mintclip-production.railway.app
```

### 2. Build Extension for Production

```bash
cd extension

# Create production config (first time only)
cp .env.production.example .env.production
# Edit .env.production with your Railway URL:
# VITE_BACKEND_URL=https://mintclip-production.railway.app

# Build for production
npm run build:prod

# Package for Chrome Web Store
cd dist
zip -r mintclip-extension.zip *
```

### 3. Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Upload `mintclip-extension.zip`
3. Fill in store listing details
4. Submit for review

## Environment Cheat Sheet

| Environment | Backend | Extension | Committed? |
|-------------|---------|-----------|------------|
| **Dev** | `backend/.env` | `extension/.env` | ❌ No |
| **Prod** | Railway dashboard | `extension/.env.production` | ❌ No |
| **Template** | `backend/.env.example` | `extension/.env.example` | ✅ Yes |

## Common Commands

```bash
# Backend
../.venv/bin/uvicorn app.main:app --reload      # Start dev server
../.venv/bin/pip install -r requirements.txt     # Install dependencies
../.venv/bin/python -m pytest                    # Run tests

# Extension
npm run dev          # Development build (auto-reload)
npm run build:dev    # Development build (one-time)
npm run build:prod   # Production build
npm run lint         # Lint code
npm run format       # Format code

# Railway
railway up           # Deploy to production
railway logs         # View production logs
railway variables    # List environment variables
railway domain       # Get production URL
```

## Troubleshooting

### Backend not starting?
```bash
# Check Python version (should be 3.12)
.venv/bin/python --version

# Recreate virtual environment if wrong version
rm -rf .venv
/opt/homebrew/bin/python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
```

### Extension not connecting?
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check extension .env
cat extension/.env
# Should show: VITE_BACKEND_URL=http://localhost:8000

# 3. Rebuild extension
cd extension && npm run dev

# 4. Reload extension in Chrome
# Go to chrome://extensions/ and click refresh icon
```

### Gemini not working?
```bash
# Check Gemini is initialized
.venv/bin/python -c "from app.services.gemini_client import get_gemini_client, GEMINI_AVAILABLE; print(f'Available: {GEMINI_AVAILABLE}')"

# Should show: Available: True
# If False, you're using Python 3.14 (incompatible)
# Switch to Python 3.12
```

## File Structure

```
mintclip/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py          # Entry point
│   │   ├── routes/          # API endpoints
│   │   └── services/        # Business logic
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Production build
│   ├── .env.example         # Environment template
│   └── .env                 # Local config (git-ignored)
├── extension/               # Chrome extension
│   ├── src/
│   │   ├── background/      # Service worker
│   │   ├── content/         # Content script
│   │   └── popup/           # Extension popup
│   ├── package.json
│   ├── .env.example         # Dev template
│   ├── .env                 # Local config (git-ignored)
│   └── .env.production      # Prod config (git-ignored)
├── railway.toml             # Railway config
├── .python-version          # Python 3.12.11
└── DEV_VS_PROD_WORKFLOW.md  # Full workflow guide
```

## Next Steps

- Read [DEV_VS_PROD_WORKFLOW.md](DEV_VS_PROD_WORKFLOW.md) for detailed workflow
- Read [backend/docs/RAILWAY_DEPLOYMENT.md](backend/docs/RAILWAY_DEPLOYMENT.md) for Railway specifics
- Check [CLAUDE.MD](CLAUDE.md) for architecture overview
