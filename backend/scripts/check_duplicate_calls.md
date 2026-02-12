# Debugging 30+ Second Summary Generation

## Current Test Results

### Test 1: Isolated Gemini timing
- **Gemini API call only**: 2.50s
- **Transcript fetch**: 9.17s
- **Total**: 11.67s

### Test 2: Full backend flow
- **Transcript fetch**: 2.17s
- **Summary generation**: 7.92s
- **Total**: 10.09s

### Test 3: Actual API call (HTTP)
- **Transcript fetch**: 11.93s (62.5%)
- **API backend processing**: 7.17s (37.5%)
- **Total**: 19.10s

## Gap Analysis

**Measured**: 19.10s
**Reported by user**: 30+ seconds
**Gap**: ~11 seconds unaccounted for

## Potential Causes

### 1. Multiple Transcript Fetches (LIKELY)
The extension might be fetching the transcript twice:
- Once when the sidebar opens
- Again in `handleGenerateSummary` if transcript is not available

**To verify**: Check browser console for duplicate GET_TRANSCRIPT calls

### 2. Backend Cold Start
If the backend was idle, the first request might take longer due to:
- Python process startup
- Gemini client initialization
- Cache warming

**To verify**: Check if subsequent summary requests are faster

### 3. Network Latency
Extension <-> Backend communication overhead:
- Chrome message passing
- HTTP request/response
- CORS preflight requests (if applicable)

### 4. Frontend Rendering
Shadow DOM rendering of the summary might add overhead:
- Markdown parsing
- Timestamp link conversion
- DOM manipulation

### 5. Missing Language Parameter Bug
**FOUND**: [apiClient.ts:210-214](../extension/src/background/apiClient.ts#L210-L214)

The `fetchSummary` function does NOT send the `language` parameter:
```typescript
body: JSON.stringify({
  video_id: request.videoId,
  transcript: request.transcript,
  format: request.format,
  // language: request.language, // MISSING!
}),
```

This could cause the backend to:
- Default to non-English handling
- Perform unnecessary translation checks
- Add latency to the request

## Recommended Actions

### Immediate
1. **Add console.time() logging**:
   - Add to `handleGenerateSummary` in YouTubeSidebar.tsx
   - Log start/end of each step

2. **Check browser console** for:
   - Duplicate GET_TRANSCRIPT calls
   - Duplicate GET_SUMMARY calls
   - Error messages or warnings

3. **Fix missing language parameter**:
   - Update `fetchSummary` in apiClient.ts to include `language: request.language`

### Monitoring
1. Add timing logs to backend endpoint:
   ```python
   # In backend/app/routes/summary.py
   import time
   start = time.time()
   # ... processing ...
   print(f"Summary generation took {time.time() - start:.2f}s")
   ```

2. Check if cache is working:
   - Second summary request should be instant (~0.1s)

## Next Steps

Run this in browser console while generating summary:
```javascript
console.time('summary-total');
chrome.runtime.sendMessage({
  type: 'GET_SUMMARY',
  payload: { videoId: 'PmW_TMQ3l0I', transcript: '...', format: 'qa', language: 'en' }
}, (response) => {
  console.timeEnd('summary-total');
  console.log('Response:', response);
});
```
