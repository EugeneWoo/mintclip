# YT Coach API - Curl Examples

Test all backend endpoints with these curl commands. Copy and paste them into your terminal.

## 1. Get Available Languages

```bash
curl http://localhost:8000/api/transcript/languages/dQw4w9WgXcQ | python3 -m json.tool
```

## 2. Extract Transcript

```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }' | python3 -m json.tool
```

**Extract transcript in a specific language:**

```bash
curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "languages": ["es-419"]
  }' | python3 -m json.tool
```

## 3. Generate Summary (Q&A Format)

First, save the transcript to a variable:

```bash
TRANSCRIPT=$(curl -s -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_id": "dQw4w9WgXcQ", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['full_text'])")
```

Then generate the summary:

```bash
curl -X POST http://localhost:8000/api/summary/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"dQw4w9WgXcQ\",
    \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"),
    \"format\": \"qa\",
    \"detail\": \"short\",
    \"focus\": \"insightful\"
  }" | python3 -m json.tool
```

## 4. Generate Summary (Listicle Format)

```bash
curl -X POST http://localhost:8000/api/summary/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"dQw4w9WgXcQ\",
    \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"),
    \"format\": \"listicle\",
    \"detail\": \"detailed\",
    \"focus\": \"actionable\"
  }" | python3 -m json.tool
```

## 5. Generate Suggested Questions

```bash
curl -X POST http://localhost:8000/api/chat/suggested-questions \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"dQw4w9WgXcQ\",
    \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))")
  }" | python3 -m json.tool
```

## 6. Chat Message

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"dQw4w9WgXcQ\",
    \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"),
    \"question\": \"What is this video about?\",
    \"chat_history\": []
  }" | python3 -m json.tool
```

## 7. Chat with History

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"dQw4w9WgXcQ\",
    \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"),
    \"question\": \"What are the key takeaways?\",
    \"chat_history\": [
      {\"role\": \"user\", \"content\": \"What is this video about?\"},
      {\"role\": \"assistant\", \"content\": \"This is a music video.\"}
    ]
  }" | python3 -m json.tool
```

---

## Quick Test (All-in-One)

Run all tests sequentially:

```bash
# Step 1: Get transcript
echo "=== 1. Extracting Transcript ==="
TRANSCRIPT=$(curl -s -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d '{"video_id": "dQw4w9WgXcQ", "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  | tee >(python3 -m json.tool) \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['full_text'])")

echo -e "\n\n=== 2. Generating Q&A Summary ==="
curl -s -X POST http://localhost:8000/api/summary/generate \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"dQw4w9WgXcQ\", \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"), \"format\": \"qa\", \"detail\": \"short\", \"focus\": \"insightful\"}" \
  | python3 -m json.tool

echo -e "\n\n=== 3. Generating Suggested Questions ==="
curl -s -X POST http://localhost:8000/api/chat/suggested-questions \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"dQw4w9WgXcQ\", \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))")}" \
  | python3 -m json.tool

echo -e "\n\n=== 4. Sending Chat Message ==="
curl -s -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"dQw4w9WgXcQ\", \"transcript\": $(echo "$TRANSCRIPT" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read().strip()))"), \"question\": \"What is this video about?\", \"chat_history\": []}" \
  | python3 -m json.tool
```

---

## Summary Format Options

**Format:**
- `qa` - Question & Answer format
- `listicle` - Numbered list format

**Detail:**
- `short` - 3-4 key points
- `detailed` - 6-8 comprehensive points

**Focus:**
- `insightful` - Deep understanding and analysis
- `actionable` - Practical steps and applications
- `funny` - Humorous take on the content

---

## Testing Different Videos

Replace the video ID and URL in the commands above:

```bash
# Example with a different video
VIDEO_ID="jNQXAC9IVRw"
VIDEO_URL="https://www.youtube.com/watch?v=${VIDEO_ID}"

curl -X POST http://localhost:8000/api/transcript/extract \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"${VIDEO_ID}\", \"video_url\": \"${VIDEO_URL}\"}" \
  | python3 -m json.tool
```
