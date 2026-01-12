# Mintclip Integration Test Guide

## Overview
This guide walks through testing the complete integration between the Chrome extension and the FastAPI backend for transcript extraction.

## Prerequisites

### 1. Backend Server Running
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --port 8000
```

**Verify backend is running:**
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

### 2. Extension Built
```bash
cd extension
npm run build
```

### 3. Extension Loaded in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. Note the extension ID (you'll need this for debugging)

---

## Test Flow

### Step 1: Navigate to YouTube
1. Open a new tab and go to any YouTube video
2. Examples:
   - Rick Astley: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   - Me at the zoo: https://www.youtube.com/watch?v=jNQXAC9IVRw

### Step 2: Check Extension Loads
**Expected behavior:**
- Mintclip sidebar should appear on the right side of the video
- Sidebar should show "Sign In" button if not authenticated

### Step 3: Sign In (Test Mode)
1. Click the "Sign In" button in the sidebar
2. Extension popup should open
3. Enter ANY email and password (validation disabled for testing)
4. Click "Sign Up" or "Sign In"
5. Popup should close immediately
6. Sidebar should update to show the tabbed interface

**If sign-in doesn't work:**
- Check browser console (F12) for errors
- Verify auth state in Chrome DevTools:
  ```javascript
  chrome.storage.local.get('auth', console.log)
  ```

### Step 4: Extract Transcript
1. In the sidebar, you should see three tabs: Transcript, Summary, Chat
2. Click on the "Transcript" tab
3. Click the "Get Transcript" button
4. **Expected behavior:**
   - Button shows "Loading transcript..." for ~1-2 seconds
   - Transcript appears with timestamps
   - Each line shows: `[00:00] Transcript text`
   - Search box and Copy button are visible

**If transcript doesn't load:**
- Open browser console (F12) and check for errors
- Open backend terminal and check for API requests
- Verify CORS is working (backend should log the request)

### Step 5: Verify Transcript Display
**Check these elements:**
- ✅ Timestamps are formatted correctly (MM:SS or HH:MM:SS)
- ✅ Text is readable and properly formatted
- ✅ Search functionality works (type in search box)
- ✅ Copy button works (copies full transcript to clipboard)
- ✅ Scrolling works for long transcripts

---

## Debugging

### Backend Logs
Check the backend terminal for:
```
INFO:     Attempting to extract transcript for video: dQw4w9WgXcQ
INFO:     Found transcript in language: en
INFO:     Successfully extracted transcript with 61 entries
INFO:     127.0.0.1:xxxxx - "POST /api/transcript/extract HTTP/1.1" 200 OK
```

### Browser Console (F12)
Check for:
```
Fetching transcript for video: dQw4w9WgXcQ
Transcript fetched successfully: {entries: 61, language: "en"}
```

### Extension Service Worker Console
1. Go to `chrome://extensions/`
2. Find Mintclip extension
3. Click "Service Worker" link
4. Check console for messages

### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for request to `http://localhost:8000/api/transcript/extract`
5. Check:
   - Request payload has `video_id`
   - Response status is 200
   - Response has `success: true` and `transcript` array

---

## Common Issues

### Issue: "Failed to fetch"
**Cause:** Backend not running or CORS issue
**Fix:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check backend CORS is configured for all origins
3. Restart backend if needed

### Issue: "Transcripts disabled for this video"
**Cause:** Video doesn't have captions
**Fix:** Try a different video with captions

### Issue: Extension doesn't appear
**Cause:** Content script not injecting
**Fix:**
1. Check manifest.json has correct YouTube match pattern
2. Reload extension in `chrome://extensions/`
3. Refresh YouTube page

### Issue: Authentication not persisting
**Cause:** Chrome storage not working
**Fix:**
1. Check manifest has `storage` permission
2. Clear extension storage:
   ```javascript
   chrome.storage.local.clear()
   ```
3. Reload extension

---

## Expected API Flow

```
User clicks "Get Transcript"
  ↓
YouTubeSidebar.handleFetchTranscript()
  ↓
chrome.runtime.sendMessage({ type: 'GET_TRANSCRIPT', payload: { videoId } })
  ↓
background/messageHandler.ts handles message
  ↓
background/apiClient.fetchTranscript()
  ↓
POST http://localhost:8000/api/transcript/extract
  ↓
Backend extracts transcript (1-2 seconds)
  ↓
Returns { success: true, transcript: [...], language: "en" }
  ↓
Message handler transforms to UI format
  ↓
Response sent back to content script
  ↓
YouTubeSidebar updates state
  ↓
TranscriptTab renders transcript
```

---

## Success Criteria

✅ **Backend:**
- Server runs without errors
- Transcript extraction takes 1-2 seconds
- Returns properly formatted response

✅ **Extension:**
- Loads on YouTube pages
- Sign-in works (any credentials)
- Sidebar displays correctly
- Transcript tab shows "Get Transcript" button

✅ **Integration:**
- Clicking button triggers API call
- Loading state displays (~1-2 seconds)
- Transcript appears with timestamps
- Search and copy functionality works
- No console errors

---

## Next Steps After Integration Works

1. **Test Summary Generation** (requires Gemini API integration)
2. **Test Chat Feature** (requires Gemini API integration)
3. **Handle edge cases:**
   - Videos without captions
   - Very long videos (30+ minutes)
   - Non-English videos
4. **Production deployment:**
   - Change API_URL from localhost to production URL
   - Set up proper authentication
   - Deploy backend to cloud service

---

## Quick Test Commands

**Test backend directly:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_id": "dQw4w9WgXcQ"}' \
  | python3 -m json.tool | head -30
```

**Check extension console:**
```javascript
// In browser console on YouTube page
chrome.runtime.sendMessage(
  { type: 'GET_TRANSCRIPT', payload: { videoId: 'dQw4w9WgXcQ' } },
  console.log
)
```
