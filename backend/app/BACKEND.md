# Mintclip Backend Deployment Guide

## Quick Reference

### Production URLs
- **Backend API**: `https://mintclip-production.up.railway.app`
- **Health Check**: `https://mintclip-production.up.railway.app/health`
- **Debug Endpoint**: `https://mintclip-production.up.railway.app/debug/proxy-config`

### Extension Configuration
Update `extension/src/config.ts`:
```typescript
const defaultBackendUrl = 'https://mintclip-production.up.railway.app'
```

### Web App Configuration
Set environment variables:
```bash
VITE_API_BASE_URL=https://mintclip-production.up.railway.app
```

---

## Overview

This document outlines the deployment steps for the Mintclip backend (FastAPI) and extension (Chrome Extension) to Railway.

## Prerequisites

- Railway account (https://railway.app/)
- GitHub repository with code
- Google Cloud project with OAuth 2.0 credentials
- Supabase project for database
- Webshare proxy account (for YouTube API)
- Redis database (auto-provisioned on Railway)

---

## Part 1: Backend Deployment (Railway)

### Step 1: Prepare Backend Code

1. **Verify `.env.example` has all required variables:**
   ```bash
   cat backend/.env.example
   ```

2. **Required environment variables:**
   - `GEMINI_API_KEY` - Google Gemini API key for AI features
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Supabase service role key
   - `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth 2.0 client ID
   - `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth 2.0 client secret
   - `FRONTEND_URL` - Web app URL (e.g., `https://mintclip-webapp.railway.app`)
   - `JWT_SECRET` - Secret for JWT token signing
   - `JWT_ALGORITHM` - JWT algorithm (default: `HS256`)
   - `ACCESS_TOKEN_EXPIRE_MINUTES` - Access token expiry (default: `60`)
   - `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token expiry (default: `90`)

### Step 2: Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `mintclip` repository
4. Click **Deploy Now**

### Step 3: Configure Backend Service

1. **Root Directory:** Set to `backend`
2. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Environment Variables:** Add all variables from `.env.example`

### Step 4: Configure Railway Settings

1. **Port:** Railway auto-assigns port, app uses `$PORT` env var
2. **Health Check:** Enable at path `/`
3. **Root Domain:** Railway provides (e.g., `mintclip-api.up.railway.app`)

### Step 5: Connect Supabase

1. Create Supabase project at [supabase.com](https://supabase.com/)
2. Get project URL and service key from Settings → API
3. Run database migrations:
   ```bash
   # Use Supabase SQL Editor to run:
   # backend/scripts/create_saved_items_table.sql
   # backend/scripts/add_constraints.sql
   ```
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to Railway env vars

### Step 6: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials:
   - **Application type:** Web application
   - **Authorized redirect URIs:**
     - `https://[your-backend-url].railway.app/api/auth/google/callback`
     - `https://[your-webapp-url].railway.app/auth/callback`
3. Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to Railway env vars
4. Update `FRONTEND_URL` env var to match your web app domain

### Step 7: Setup Redis Cache (Required)

**Status:** ✅ COMPLETED

1. **Add Redis Database to Railway Project**
   - Click **New** → **Database** → **Add Redis**
   - Railway auto-provisions Redis with environment variables

2. **Connect Backend to Redis**
   - Go to **Backend Service** → **Variables** tab
   - Add variable: `REDIS_URL`
   - Value: Copy the **REDIS_PUBLIC_URL** from Redis service variables
   - Example: `redis://default:password@redis-abc123.railway.app:6379`

3. **Verify Redis Connection**
   ```bash
   curl https://mintclip-production.up.railway.app/debug/proxy-config
   # Should show: "cache_type": "RedisCache", "redis_url_set": true
   ```

**Cache Configuration:**
- **Transcripts:** 30-day TTL (never change)
- **Summaries:** 7-day TTL
- **Chat Messages:** 24-hour TTL
- **Automatic Expiration:** Redis handles cleanup

**Note:** Private network (`redis.railway.internal`) may not work due to DNS resolution. Use **public URL** instead.

### Step 8: Configure Webshare Proxy (Required for YouTube API)

**Status:** ✅ COMPLETED

1. **Add Proxy Credentials to Railway**
   - Go to **Backend Service** → **Variables** tab
   - Add variable: `WS_USER` (e.g., `ivpzpnvq-rotate`)
   - Add variable: `WS_PASS` (your Webshare password)

2. **Verify Proxy is Working**
   ```bash
   curl https://mintclip-production.up.railway.app/debug/proxy-config
   # Should show: "proxy_enabled": true
   ```

**Proxy Provider:** Webshare rotating proxy (prevents YouTube rate limiting)

### Step 9: Get Backend URL

After deployment:
1. Go to Railway dashboard
2. Click on backend service
3. Copy the domain (e.g., `https://mintclip-production.up.railway.app`)
4. Test health check: `curl https://mintclip-production.up.railway.app/health`
5. Test debug endpoint: `curl https://mintclip-production.up.railway.app/debug/proxy-config`

**Production URL:** `https://mintclip-production.up.railway.app`

---

## Part 2: Extension Configuration

### Step 1: Update Extension Config

**File:** `extension/src/config.ts`

Update production URLs to match Railway domains:

```typescript
const defaultBackendUrl = isDevelopment
  ? 'http://localhost:8000'
  : 'https://mintclip-api-production.up.railway.app';

const defaultWebAppUrl = isDevelopment
  ? 'http://127.0.0.1:5173'
  : 'https://mintclip-webapp-production.up.railway.app';
```

### Step 2: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Open OAuth 2.0 credentials
3. Add production redirect URI:
   - `https://[your-webapp-url].railway.app/auth/callback`

### Step 3: Build Extension for Production

```bash
cd extension
npm run build
```

### Step 4: Submit to Chrome Web Store

1. Package the `dist` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create new item
4. Upload `dist.zip`
5. Fill in store listing:
   - Name: Mintclip - YouTube Transcripts
   - Description: Extract transcripts, AI summaries, and chat with YouTube videos
   - Screenshots: Add 5 screenshots (1280x800 or 640x400)
   - Icon: Upload `icon-128.png`
6. Set pricing: Free
7. Permissions review (already in manifest.json)
8. Submit for review

---

## Part 3: Web App Deployment (Railway)

### Step 1: Create Railway Service

1. In Railway project, click **New Service** → **Deploy from GitHub repo**
2. Select same repository
3. **Root Directory:** `web-app`
4. **Build Command:** `npm run build`
5. **Start Command:** `npm run preview`

### Step 2: Configure Web App Settings

1. **Environment Variables:**
   - `VITE_API_BASE_URL`: `https://[your-backend-url].railway.app`
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID

2. **Port:** Vite dev server (default: 5173)

### Step 3: Get Web App URL

1. Go to Railway dashboard
2. Click on web app service
3. Copy the domain (e.g., `https://mintclip-webapp.up.railway.app`)

### Step 4: Update CORS Settings

**File:** `backend/app/main.py`

Ensure CORS allows web app domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://mintclip-webapp-production.up.railway.app",  # Add production URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Part 4: Post-Deployment Checklist

### Backend

- [x] Health check returns 200: `curl https://mintclip-production.up.railway.app/health`
- [x] Redis cache working: `curl https://mintclip-production.up.railway.app/debug/proxy-config`
  - Should show: `"cache_type": "RedisCache"`, `"redis_url_set": true`
- [x] Webshare proxy enabled: Check `"proxy_enabled": true` in debug endpoint
- [x] Transcript extraction works: Test with `/api/transcript/extract`
- [x] Cache persistence verified: Second request returns `"cached": true`
- [ ] Google OAuth redirects work: Visit `/api/auth/google/login`
- [ ] Token refresh endpoint works
- [ ] Supabase connection successful
- [ ] CORS headers allow web app domain

### Extension

- [ ] Config has correct production URLs
- [ ] Extension loads without errors
- [ ] Dashboard button opens web app URL
- [ ] OAuth redirect URI includes production web app URL
- [ ] Build succeeds without warnings
- [ ] Chrome Web Store submission ready

### Web App

- [ ] Build completes successfully
- [ ] Vite preview server starts
- [ ] Environment variables load correctly
- [ ] API calls work from web app
- [ ] OAuth flow completes
- [ ] Redirects back from Google work

---

## Part 5: Monitoring and Maintenance

### Railway Dashboard

1. **Backend Service:**
   - Monitor CPU/memory usage
   - Check deployment logs
   - Set up alerts for failures
   - **Redis Cache Status:** Check `/debug/proxy-config` endpoint

2. **Redis Service:**
   - Monitor memory usage (free tier: 512MB)
   - Track cache hit/miss rates
   - Check connection count
   - Note: UI may show "empty" but cache is working

3. **Web App Service:**
   - Monitor build logs
   - Check preview server status
   - Track bandwidth usage

### Supabase

1. **Database Monitoring:**
   - Check table sizes (saved_items table growth)
   - Monitor query performance
   - Set up backups

2. **API Monitoring:**
   - Track API call counts
   - Monitor Gemini API usage
   - Check quota limits

### Google Cloud Console

1. **OAuth Usage:**
   - Monitor consent screen usage
   - Track token refresh rates
   - Check for errors in OAuth logs

### Chrome Web Store Dashboard

1. **Extension Metrics:**
   - Track install count
   - Monitor user ratings
   - Review crash reports
   - Respond to user reviews

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJ...` |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth 2.0 client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret | `GOCSPX-...` |
| `FRONTEND_URL` | Web app URL | `https://mintclip-webapp.railway.app` |
| `JWT_SECRET` | JWT signing secret | Random string |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | `90` |
| `REDIS_URL` | Redis connection URL | `redis://default:pass@redis-abc.railway.app:6379` |
| `WS_USER` | Webshare proxy username | `username-rotate` |
| `WS_PASS` | Webshare proxy password | `password` |

### Extension (`extension/.env.production`)

| Variable | Description | Example |
|----------|-------------|----------|
| `VITE_BACKEND_URL` | Backend API URL | `https://mintclip-api.railway.app` |
| `VITE_WEBAPP_URL` | Web app URL | `https://mintclip-webapp.railway.app` |

### Web App (`web-app/.env.production`)

| Variable | Description | Example |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | `https://mintclip-api.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID | `xxx.apps.googleusercontent.com` |

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Update `backend/app/main.py` with production web app URL
- Restart backend service on Railway

**2. OAuth Redirect Mismatch**
- Verify redirect URIs in Google Cloud Console match exactly
- Include both `http://localhost:5173` and production URL
- Check for trailing slashes

**3. Extension API Connection Failed**
- Verify backend URL in `extension/src/config.ts`
- Test backend health endpoint
- Check Railway logs for errors

**4. Web App Build Failures**
- Check environment variables in Railway
- Verify build command: `npm run build`
- Check Vite config for correct port

**5. Supabase Connection Errors**
- Verify Supabase URL and service key
- Check IP restrictions in Supabase settings
- Run SQL migrations manually if needed

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Chrome Extension Publishing](https://developer.chrome.com/docs/webstore/publish/)
- [Google Cloud OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
