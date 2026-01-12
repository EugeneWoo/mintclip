# Fresh Data Generation Testing Checklist

## Purpose
Verify that newly generated summaries (after the migration fix) include the format-specific boolean fields (`short_is_structured`, `topic_is_structured`, `qa_is_structured`).

## Background
- **Bug Fixed:** Legacy cached data was missing boolean fields
- **Solution Applied:** Migration logic in YouTubeSidebar.tsx lines 106-116
- **Need to Verify:** Fresh data generation includes these boolean fields correctly

---

## Testing Steps

### 1. Fresh Summary Generation (No Cache)

**Test Setup:**
- Use a YouTube video you haven't generated summaries for before
- Open Chrome DevTools → Application → Local Storage → Filter by "yt-coach-video"
- Verify no cached data exists for this video

**Steps:**
1. Navigate to a YouTube video (e.g., test video ID)
2. Open extension sidebar
3. Sign in if not authenticated
4. Go to Summary tab
5. Select "Short" format
6. Click "Generate Summary"
7. **Open DevTools Console and look for:**
   ```
   [SummaryTab Debug] Runtime values: {
     currentFormat: 'short',
     short_is_structured: ...,
     computed_isStructured: ...
   }
   ```
8. Note the value of `short_is_structured` (should be `true`)
9. Repeat for "Topics" format (check `topic_is_structured`)
10. Repeat for "Q&A" format (check `qa_is_structured`)

**Expected Result:**
- All three boolean fields should be `true` for new summaries
- Debug logs should show: `short_is_structured: true`, `topic_is_structured: true`, `qa_is_structured: true`

### 2. Verify Storage Structure

**After generating summaries:**

**Steps:**
1. In DevTools Console, run:
   ```javascript
   chrome.storage.local.get(null, (data) => {
     const videoKey = Object.keys(data).find(k => k.startsWith('yt-coach-video-'));
     if (videoKey) {
       console.log('Video cache key:', videoKey);
       console.log('Summaries data:', data[videoKey].summaries);
       console.log('Has short_is_structured?', 'short_is_structured' in data[videoKey].summaries);
       console.log('short_is_structured value:', data[videoKey].summaries.short_is_structured);
     }
   });
   ```

**Expected Result:**
```javascript
{
  summaries: {
    short: "...summary text...",
    short_is_structured: true,  // ✅ Should exist
    topic: "...summary text...",
    topic_is_structured: true,  // ✅ Should exist
    qa: "...summary text...",
    qa_is_structured: true       // ✅ Should exist
  }
}
```

### 3. Verify HTML Rendering

**Visual Check:**
1. Look at the summary content in each format
2. Headers should render as formatted HTML (bold, larger font)
3. NOT as literal markdown text like "## Key Points"

**For Short format:**
- Headers should appear as: **Key Topics** (bold, larger)
- NOT as: ## Key Topics (literal markdown)

**For Topics format:**
- Headers should appear as: **Introduction**, **Key Points**, etc. (formatted)
- NOT as: ## Introduction, ## Key Points (literal markdown)

**For Q&A format:**
- Headers should appear as: **Question 1**, **Answer 1** (formatted)
- NOT as: ## Question 1, ## Answer 1 (literal markdown)

### 4. Test Multiple Videos

**Test Scenarios:**
1. **Video 1:** English video with manual captions
2. **Video 2:** Non-English video (e.g., French, Spanish)
3. **Video 3:** Short video (< 5 minutes)
4. **Video 4:** Long video (> 30 minutes)

**For each video:**
- Generate all three formats
- Check debug logs for boolean values
- Verify chrome.storage.local structure
- Confirm HTML rendering

---

## Success Criteria

✅ **Pass Criteria:**
- `short_is_structured` = `true` for new summaries
- `topic_is_structured` = `true` for new summaries
- `qa_is_structured = `true` for new summaries
- All three fields present in chrome.storage.local
- Headers render as formatted HTML (not literal markdown)
- Behavior consistent across all test videos

❌ **Fail Criteria:**
- Boolean fields missing or undefined
- Boolean fields set to `false`
- Headers render as literal markdown text
- Inconsistent behavior between videos

---

## Quick Console Command Reference

**Check all boolean fields:**
```javascript
chrome.storage.local.get(null, (data) => {
  const videoKey = Object.keys(data).find(k => k.startsWith('yt-coach-video-'));
  if (videoKey && data[videoKey].summmaries) {
    const s = data[videoKey].summaries;
    console.log('short_is_structured:', s.short_is_structured);
    console.log('topic_is_structured:', s.topic_is_structured);
    console.log('qa_is_structured:', s.qa_is_structured);
  }
});
```

**Clear all video cache (for testing):**
```javascript
chrome.storage.local.get(null, (data) => {
  const keysToRemove = Object.keys(data).filter(k => k.startsWith('yt-coach-video-'));
  chrome.storage.local.remove(keysToRemove);
  console.log('Cleared', keysToRemove.length, 'video caches');
});
```

**Force reload (bypass cache):**
```javascript
location.reload();
```

---

## Notes

- **Testing timeframe:** December 31, 2025 onwards (post-migration fix)
- **Test videos can be any:** The boolean fields are set by the backend, not dependent on video content
- **Cache TTL:** 7 days for summaries, so fresh generation means either:
  - Using a different video ID than before
  - Manually clearing cache via console command above
  - Waiting 7 days for cache to expire (not practical for testing)

---

## Report Template

After testing, fill out this section:

**Test Date:** _______________

**Videos Tested:**
1. Video ID: _____________________ - Result: ____ Pass / Fail ____
2. Video ID: _____________________ - Result: ____ Pass / Fail ____
3. Video ID: _____________________ - Result: ____ Pass / Fail ____
4. Video ID: _____________________ - Result: ____ Pass / Fail ____

**Boolean Fields Present?**
- short_is_structured: ____ Yes / No ____
- topic_is_structured: ____ Yes / No ____
- qa_is_structured: ____ Yes / No ____

**HTML Rendering Correct?**
- Short format: ____ Yes / No ____
- Topics format: ____ Yes / No ____
- Q&A format: ____ Yes / No ____

**Overall Result:** ____ Pass / Fail ____

**Issues Found:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
