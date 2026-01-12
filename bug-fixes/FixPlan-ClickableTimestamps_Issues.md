# Fix Plan: Clickable Timestamps Issues

I've completed a thorough investigation of why clickable timestamps aren't working. Here are my findings:

---

## Issue 1: Transcript Tab - ClickableTimestamp Component Removed

### Root Cause
The ClickableTimestamp component documented in `CLAUDE.md` (lines 270-295) was completely removed from `TranscriptTab.tsx`.

### Evidence
- **CLAUDE.md claims** (Dec 31, 2025): "Created a new ClickableTimestamp component that wraps timestamp text" at lines 17-40
- **Current code reality** (lines 368-383): Timestamps are rendered as plain `<span>` tags with NO click handlers:

```tsx
<span style={{ color: '#667eea', ... }}>
  {segment.timestamp}  // Plain text - NOT clickable!
</span>
```

### Missing Implementation
- ❌ No ClickableTimestamp component exists
- ❌ No `seekToTimestamp()` function (only exists in SummaryTab)
- ❌ No click handlers on timestamps
- ❌ No CSS styling for hover effects
- ❌ Timestamps are purely decorative purple text

---

## Issue 2: Summary Tab - Regex Not Capturing URLs Properly

### Root Cause
The markdown link parser in `SummaryTab.tsx:217` has a flawed regex pattern that doesn't fully consume markdown link syntax, leaving URLs visible.

### Evidence

```javascript
// Line 217 - Current regex
const linkPattern = /\*?\*?\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*?\*?/g;
//                   ^^^^^^ Optional bold markers NOT properly matched
```

### The Problem
Pattern uses `\*?\*?` (two optional asterisks) which matches:
- `[text](url)` ✅
- `**[text](url)**` ⚠️ (only if both ** are at exact positions)

Does NOT properly match all bold variations:
- `** [text](url)` (space after asterisks)
- `**[text](url)` (only opening bold)
- `[text](url)**` (only closing bold)

**Result:** When regex fails to match, the original markdown syntax `[timestamp](https://...)` remains in the text, causing:
- Clickable timestamp appears (from captured groups)
- BUT full URL also displays next to it from unmatched remainder

### Correct Fix Needed

```javascript
// Should be:
const linkPattern = /\*\*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
//                  ^^^^^^^^^^ Match bold wrapper ^^^^^^^^^^  OR  ^^^^^^^^ Match plain link ^^^^^^^^
```

---

## Issue 3: Video Element Selector Mismatch

### Root Cause
SummaryTab uses an incorrect video selector that won't find YouTube's player.

### Evidence

```typescript
// SummaryTab.tsx:40 - WRONG selector
const videoElement = document.querySelector(
  `#movie_player-${videoId} video, html5-main-video`
  //               ^^^^^^^^ YouTube player ID does NOT include videoId!
) as HTMLVideoElement;
```

### The Problem
- YouTube's player ID is `#movie_player` (NOT `#movie_player-${videoId}`)
- Selector should be: `#movie_player video, .html5-main-video`
- Note: `.html5-main-video` needs the `.` class selector prefix!

### Correct Selector

```typescript
const videoElement = document.querySelector(
  '#movie_player video, .html5-main-video'
) as HTMLVideoElement;
```

---

## Fix Plan

### Fix 1: Restore ClickableTimestamp to TranscriptTab

**Files:** `extension/src/content/components/TranscriptTab.tsx`

**Changes Required:**
1. Add ClickableTimestamp component interface (after line 25)
2. Add `seekToTimestamp()` function (after line 50)
3. Replace plain timestamp `<span>` with `<ClickableTimestamp>` component (line 368-383)
4. Add CSS styles for hover effects

**Implementation:**
- Copy `seekToTimestamp()` from `SummaryTab.tsx:38-49` (but fix the selector!)
- Wrap `{segment.timestamp}` in `<ClickableTimestamp>` component
- Pass `videoId` prop from parent component

---

### Fix 2: Fix Markdown Link Regex in SummaryTab

**File:** `extension/src/content/components/SummaryTab.tsx:217`

**Change:**

```javascript
// OLD (broken):
const linkPattern = /\*?\*?\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*?\*?/g;

// NEW (correct):
const linkPattern = /\*\*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
```

**Also Update Capture Group Handling:**
- Group 1 & 2: Bold wrapped link `**[text](url)**`
- Group 3 & 4: Plain link `[text](url)`

---

### Fix 3: Correct Video Selector in Both Components

**Files:**
- `extension/src/content/components/SummaryTab.tsx:40`
- `extension/src/content/components/TranscriptTab.tsx` (after adding seekToTimestamp)

**Change:**

```typescript
// OLD (broken):
const videoElement = document.querySelector(
  `#movie_player-${videoId} video, html5-main-video`
) as HTMLVideoElement;

// NEW (correct):
const videoElement = document.querySelector(
  '#movie_player video, .html5-main-video'
) as HTMLVideoElement;
```

---

## Summary

### 3 Critical Bugs Found:

1. ❌ **TranscriptTab:** Entire ClickableTimestamp feature was removed (code doesn't match documentation)
2. ❌ **SummaryTab:** Regex pattern fails to fully consume markdown links → URLs visible
3. ❌ **Both tabs:** Video selector uses wrong ID format → `seekToTimestamp()` can't find player

### Impact:

- **Transcript timestamps:** Completely non-functional (plain text)
- **Summary timestamps:** Partially working (clickable but shows URL artifact)
- **Video seeking:** May fail to find YouTube player element
