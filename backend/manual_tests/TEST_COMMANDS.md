# Test Commands for YT Coach Backend API

## Starting the Server

```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --port 8000
```

The server will be available at `http://localhost:8000`

---

## Test Videos

### 1. Me at the Zoo (19 seconds) - First YouTube video

**Video ID:** `jNQXAC9IVRw`
**URL:** https://www.youtube.com/watch?v=jNQXAC9IVRw

**curl command:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

**With pretty-print:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}' \
  | python3 -m json.tool
```

**Expected output:**
- Success: `true`
- Video ID: `jNQXAC9IVRw`
- Language: `en`
- Transcript entries: 6
- Extraction time: ~1.4 seconds

---

### 2. Rick Astley - Never Gonna Give You Up (3.5 minutes)

**Video ID:** `dQw4w9WgXcQ`
**URL:** https://www.youtube.com/watch?v=dQw4w9WgXcQ

**curl command:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**With pretty-print:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  | python3 -m json.tool
```

**Expected output:**
- Success: `true`
- Video ID: `dQw4w9WgXcQ`
- Language: `en`
- Transcript entries: 61
- Extraction time: ~0.9 seconds

---

## Alternative: Using Video ID Directly

You can also pass just the video ID instead of the full URL:

**Me at the Zoo:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_id": "jNQXAC9IVRw"}'
```

**Rick Astley:**
```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_id": "dQw4w9WgXcQ"}'
```

---

## Other Test Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

**Expected output:**
```json
{"status": "healthy"}
```

### Get Available Languages for a Video
```bash
curl http://localhost:8000/api/transcript/languages/dQw4w9WgXcQ
```

---

## Troubleshooting

### If you get "Connection refused"
Make sure the server is running:
```bash
./venv/bin/uvicorn app.main:app --reload --port 8000
```

### If you get cached code errors
Clean Python cache and restart:
```bash
find . -type d -name __pycache__ -exec rm -rf {} +
pkill -f "uvicorn app.main:app"
./venv/bin/uvicorn app.main:app --reload --port 8000
```

### If you get import errors
Reinstall dependencies:
```bash
./venv/bin/pip install -r requirements.txt
```

---

## Expected Response Format

Successful extraction:
```json
{
  "success": true,
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "is_generated": false,
  "transcript": [
    {
      "timestamp": "00:01",
      "start_seconds": 1.36,
      "duration": 1.68,
      "text": "[♪♪♪]"
    },
    {
      "timestamp": "00:18",
      "start_seconds": 18.64,
      "duration": 3.24,
      "text": "♪ We're no strangers to love ♪"
    }
  ],
  "full_text": "[♪♪♪] ♪ We're no strangers to love ♪ ..."
}
```

Failed extraction (no captions):
```json
{
  "success": false,
  "error": "no_captions",
  "message": "This video does not have captions available.",
  "video_id": "abc123",
  "details": "..."
}
```
