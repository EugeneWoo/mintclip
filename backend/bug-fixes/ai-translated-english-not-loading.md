# Bug Fix: AI-Translated English Not Loading

**Video ID**: FZVvpjSMuaY
**Date**: 2026-02-16
**Severity**: High - Core feature broken

## Problem

When clicking "English (AI-translated)" in the language dropdown, the transcript doesn't load even though:
1. The language menu clearly shows "English (AI-translated)" is available
2. Console logs show `transcriptCache['en']` contains 79 segments
3. The language selection handler is called correctly

## Root Cause

**TWO BUGS - Frontend State Inconsistency + Backend Fallback Bug**

### Bug #1: Frontend State Not Persisted (Original Issue)

1. When AI-translated English is first fetched (via polling), it's stored in TWO places:
   - `englishTranslation` state variable (line 307)
   - `transcriptCache['en']` (line 313)

2. When saving to storage (line 236-245), only `transcriptCache` was persisted, NOT `englishTranslation`

3. On page reload/navigation, the restore logic (line 149-156) only restored:
   - ✅ `transcriptCache` → includes `['en']` with AI-translated segments
   - ❌ `englishTranslation` → stayed `null`

4. When user clicks "English (AI-translated)", the handler checks:
   ```typescript
   if (englishTranslation && englishTranslation.length > 0) {
     // Use englishTranslation ← FAILS because null
   } else if (transcriptCache['en'] && transcriptCache['en'].length > 0) {
     // Fallback to cache ← Should work but didn't execute
   }
   ```

The first condition failed (`englishTranslation === null`), and apparently the second condition also didn't execute properly, likely due to race conditions or stale closure issues.

### Bug #2: Backend Returns Wrong Language (Critical!)

When the frontend requests `languages: ['en']` for a video with only French captions:
1. Backend tries to find English transcript → Fails (line 140)
2. Backend tries to find auto-generated English → Fails (line 150)
3. **Backend falls back to FIRST available transcript (French)** ← BUG!
4. Backend returns `{language: 'fr', transcript: [...french text...]}`
5. Frontend caches this as "English translation" → Breaks everything!

**The backend MUST return AI-translated English from cache when requested**, not fall back to the native non-English transcript.

## Solution

**Fix #1: Persist and Restore `englishTranslation` State**

### Changes Made:

1. **Save `englishTranslation` to storage** ([YouTubeSidebar.tsx:237](extension/src/content/components/YouTubeSidebar.tsx#L237))
   ```typescript
   const videoData = {
     transcript,
     transcriptCache,
     englishTranslation,  // ← Added
     currentLanguage,
     // ... rest
   };
   ```

2. **Restore `englishTranslation` from storage** ([YouTubeSidebar.tsx:154-157](extension/src/content/components/YouTubeSidebar.tsx#L154-L157))
   ```typescript
   // Restore englishTranslation state (AI-translated English only)
   if (videoData.englishTranslation) {
     setEnglishTranslation(videoData.englishTranslation);
     console.log('[YouTubeSidebar] Restored englishTranslation:', videoData.englishTranslation.length, 'segments');
   }
   ```

3. **Update dependency array** ([YouTubeSidebar.tsx:257](extension/src/content/components/YouTubeSidebar.tsx#L257))
   ```typescript
   }, [videoId, transcript, transcriptCache, englishTranslation, ...]);
   //                                        ^^^^^^^^^^^^^^^^^^^^ Added
   ```

### Why This Works:

- `englishTranslation` is **only set for AI-translated English** (line 704), NOT for native English (line 708 clears it)
- Restoring `englishTranslation` ensures the primary code path (line 613) works correctly
- The fallback path (line 625) remains as safety net

## Testing

### Manual Test:
1. Open a non-English video (e.g., French video FZVvpjSMuaY)
2. Wait for AI translation to complete → "English (AI-translated)" appears
3. Click "English (AI-translated)" → Verify transcript loads
4. **Reload the page** (this is where bug occurred)
5. Click "English (AI-translated)" again → Verify transcript still loads

### Console Verification:
```
[YouTubeSidebar] Restored englishTranslation: 79 segments
[YouTubeSidebar] Language changed to: en
[YouTubeSidebar] englishTranslation state: 79 segments
[YouTubeSidebar] Using englishTranslation state: 79 segments
[YouTubeSidebar] ✓ Switched to AI-translated English (from englishTranslation state)
```

## Prevention

To prevent similar bugs:
1. **Rule**: If a state variable is critical for feature functionality, it MUST be persisted and restored
2. **Pattern**: Always check storage save/restore logic when adding new state variables
3. **Testing**: Always test features after page reload, not just initial load

**Fix #2: Backend Must Return AI-Translated English From Cache**

When `languages: ['en']` is requested but native English doesn't exist, check translation cache BEFORE falling back to other languages.

### Changes Made:

1. **Check translation cache when English is requested** ([transcript_extractor.py:155-175](backend/app/services/transcript_extractor.py#L155-L175))
   ```python
   # If English was requested but not available natively, check AI translation cache
   if 'en' in languages:
       cache = get_cache()
       # Check all available languages for cached translations
       for avail_transcript in available_transcripts:
           translation_cache_key = f"transcript_translation:{video_id}:{avail_transcript.language_code}"
           cached_translation = cache.get(translation_cache_key)

           if cached_translation:
               # Return AI-translated English from cache
               return {'language': 'en', 'is_generated': True, ...}
   ```

2. **Only fall back to non-English if English wasn't requested**

## Files Modified

- [extension/src/content/components/YouTubeSidebar.tsx](extension/src/content/components/YouTubeSidebar.tsx)
  - Line 154-157: Restore `englishTranslation` from storage
  - Line 239: Add `englishTranslation` to saved data
  - Line 257: Add `englishTranslation` to useEffect dependencies

- [backend/app/services/transcript_extractor.py](backend/app/services/transcript_extractor.py)
  - Line 154-180: Check translation cache when English is requested before falling back
