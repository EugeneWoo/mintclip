# Clickable Timestamps in Summary Output - Implementation Plan

**Date:** December 30, 2025
**Status:** Investigation Complete - Ready for Implementation

## Problem Statement

Users want to click timestamps in the summary output to jump to the exact moment in the YouTube video where the topic was discussed. Currently, summaries don't include any timestamps, making it difficult to reference the source material.

## Current State Analysis

### Backend (Summary Generation)

**Location:** [backend/app/prompts/summary.py](backend/app/prompts/summary.py)

**Current Behavior:**
- System instructions explicitly forbid timestamps: `"DO NOT include timestamps in the summary (keep it clean and readable)"`
- Gemini receives ONLY the full text transcript without any timing information
- No timestamp context is provided to the AI

**Key Code:**
```python
# Line 17 in summary.py
"- DO NOT include timestamps in the summary (keep it clean and readable)"

# Lines 116-132 in summary.py
def get_summary_prompt(format: str, transcript: str) -> str:
    # Only passes raw text string to Gemini
    prompt_template = SUMMARY_PROMPTS[format]
    return prompt_template.format(transcript=transcript)
```

### Frontend (Summary Display)

**Location:** [extension/src/content/components/SummaryTab.tsx](extension/src/content/components/SummaryTab.tsx)

**Current Behavior:**
- Renders plain markdown text (lines 182-247)
- Supports headings (`###`, `##`), bold text (`**text**`)
- No timestamp parsing or clicking functionality

**Rendering Logic:**
```typescript
// Lines 182-247 - Simple markdown renderer
const renderSummary = (text: string) => {
  const lines = text.split('\n');
  // Parses headings and bold text only
  // No timestamp detection
}
```

### Transcript Data Structure

**Location:** [extension/src/content/components/TranscriptTab.tsx](extension/src/content/components/TranscriptTab.tsx)

**Available Data:**
```typescript
interface TranscriptSegment {
  timestamp: string;       // "MM:SS" format
  start_seconds?: number;  // Exact start time in seconds
  duration?: number;       // Segment duration in seconds
  text: string;           // Transcript text
}
```

**Current Usage:**
- Transcript segments have precise timing data (`start_seconds`)
- This data is available in [YouTubeSidebar.tsx](extension/src/content/components/YouTubeSidebar.tsx) state
- Currently only used for transcript display, NOT passed to summary generation

## Implementation Approaches

### Option 1: Gemini-Based Timestamp Injection (Recommended ✅)

**Approach:** Modify the prompt to include timestamps with each transcript segment, instruct Gemini to include relevant timestamps in the summary.

**Backend Changes:**

1. **Modify Summary Prompt** ([backend/app/prompts/summary.py](backend/app/prompts/summary.py))
   - Remove the "DO NOT include timestamps" instruction
   - Add instruction to include timestamps in `(MM:SS)` format
   - Pass transcript with timestamps included

**Updated System Instructions:**
```python
SYSTEM_INSTRUCTIONS = """You are an expert at summarizing video content in clear, engaging ways.

Your task is to analyze a video transcript and create a summary based on specific requirements.

Key principles:
- Focus on the actual content discussed in the video
- Be accurate and faithful to the source material
- Make the summary useful and actionable for viewers
- Use clear, concise language
- **Include relevant timestamps (MM:SS) when discussing specific topics or concepts**
- **Format timestamps as (MM:SS) - for example: "The speaker discusses authentication (05:23)"**
- **Only include timestamps for substantial topics, not every sentence**
- Start IMMEDIATELY with the content - NO opening sentences like "Okay, here's a summary..."
- Go straight to the first question or topic
- ALWAYS capitalize the first letter of every answer/paragraph

CRITICAL CONSTRAINTS:
- You must ONLY use information explicitly stated in the transcript
- Apply semantic understanding beyond simple keyword matching
- If something is not discussed in the transcript, do not include it
"""
```

2. **Update Transcript Formatting** ([backend/app/routes/summary.py](backend/app/routes/summary.py))
   - Modify the transcript text to include timestamps before sending to Gemini
   - Format: `[MM:SS] Transcript text here`

**Modified Code:**
```python
# In backend/app/routes/summary.py, lines 75-108
# Before calling gemini_client.generate_summary()

# Format transcript with timestamps for Gemini
# This assumes we receive structured transcript data from frontend
# For now, we can work with the text format if segments are separated

# Option A: If frontend sends segments with timestamps
if isinstance(request.transcript, list):  # List of segments
    formatted_transcript = '\n'.join([
        f"[{seg['timestamp']}] {seg['text']}"
        for seg in request.transcript
    ])
else:
    formatted_transcript = request.transcript  # Fallback to text

# Generate summary with Gemini
summary = gemini_client.generate_summary(
    transcript=formatted_transcript,
    format=request.format
)
```

**Frontend Changes:**

1. **Update Request Format** ([extension/src/content/components/YouTubeSidebar.tsx](extension/src/content/components/YouTubeSidebar.tsx))
   - Modify summary request to send structured transcript data (optional - only if we want to guarantee timestamp format)
   - Current: Sends `transcript: transcriptText` (plain string)
   - Enhanced: Could send `transcript: transcript` (array of segments)

2. **Add Timestamp Parsing & Clicking** ([extension/src/content/components/SummaryTab.tsx](extension/src/content/components/SummaryTab.tsx))
   - Parse `(MM:SS)` patterns in summary text
   - Convert to clickable links
   - Implement YouTube player seek functionality

**New Code in SummaryTab.tsx:**
```typescript
// Lines 181-247 - Enhanced renderSummary function
const renderSummary = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // ... existing heading logic ...

    // For regular text, parse timestamps
    const parts = parseTimestamps(line);
    const rendered = parts.map((part, i) => {
      if (part.type === 'timestamp') {
        return (
          <span
            key={i}
            onClick={() => handleTimestampClick(part.seconds)}
            style={{
              color: '#667eea',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            title={`Jump to ${part.text}`}
          >
            {part.text}
          </span>
        );
      }
      return part.text;
    });

    // ... rest of rendering logic ...
  });

  return elements;
};

// Timestamp parsing helper
function parseTimestamps(text: string): Array<{type: 'text' | 'timestamp', text: string, seconds?: number}> {
  const timestampRegex = /\((\d{1,2}):(\d{2})\)/g;
  const parts: Array<any> = [];
  let lastIndex = 0;
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    // Add text before timestamp
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: text.substring(lastIndex, match.index)
      });
    }

    // Add timestamp
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const totalSeconds = minutes * 60 + seconds;

    parts.push({
      type: 'timestamp',
      text: match[0],  // "(MM:SS)"
      seconds: totalSeconds
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      text: text.substring(lastIndex)
    });
  }

  return parts;
}
```

3. **YouTube Player Integration** ([extension/src/content/components/SummaryTab.tsx](extension/src/content/components/SummaryTab.tsx))
   - Add callback prop to seek YouTube video
   - Use YouTube iframe API to control playback

**YouTube Player Integration:**
```typescript
// In SummaryTab.tsx interface
interface SummaryTabProps {
  // ... existing props ...
  onSeekVideo?: (seconds: number) => void;
}

// Click handler
const handleTimestampClick = (seconds: number) => {
  if (onSeekVideo) {
    onSeekVideo(seconds);
  }
};

// In YouTubeSidebar.tsx - implement video seeking
const handleSeekVideo = (seconds: number) => {
  // Access YouTube player via global window object
  const player = (window as any).ytPlayer ||
                 document.querySelector('video') as HTMLVideoElement;

  if (player) {
    if (player.seekTo) {
      // YouTube iframe API method
      player.seekTo(seconds, true);
      player.playVideo();
    } else if (player.currentTime !== undefined) {
      // HTML5 video element
      player.currentTime = seconds;
      player.play();
    }
  }
};

// Pass to SummaryTab
<SummaryTab
  summary={summary}
  onSeekVideo={handleSeekVideo}
  // ... other props ...
/>
```

**Advantages:**
- ✅ Leverages AI's contextual understanding
- ✅ Timestamps only added for relevant topics (not every sentence)
- ✅ Natural language integration ("discusses authentication (05:23)")
- ✅ Minimal backend complexity
- ✅ Frontend has full control over rendering and clicking

**Disadvantages:**
- ⚠️ Relies on Gemini to consistently format timestamps correctly
- ⚠️ May occasionally include incorrect timestamps if AI makes mistakes

---

### Option 2: Post-Processing Timestamp Injection

**Approach:** Generate summary without timestamps, then use a second AI pass to inject timestamps by matching summary content to transcript segments.

**Implementation:**
1. Generate summary as normal
2. Send summary + timestamped transcript to Gemini with prompt:
   ```
   "For each topic/sentence in the summary below, find the most relevant timestamp
   from the transcript and inject it in (MM:SS) format. Only add timestamps for
   substantial topics, not every sentence."
   ```

**Advantages:**
- ✅ Guaranteed accurate timestamps (matched from actual transcript)
- ✅ Consistent timestamp formatting

**Disadvantages:**
- ❌ Requires 2 API calls (double latency, double cost)
- ❌ More complex backend logic
- ❌ May struggle to match summary text to transcript segments

---

### Option 3: Rule-Based Timestamp Extraction

**Approach:** Backend analyzes transcript, extracts key topics with timestamps, frontend attempts to match summary text to topics.

**Implementation:**
1. Backend pre-processes transcript to identify topic markers
2. Extract timestamps for each topic
3. Frontend attempts fuzzy matching of summary text to topics
4. Inject timestamps for matched sections

**Advantages:**
- ✅ No AI uncertainty
- ✅ Precise timestamp mapping

**Disadvantages:**
- ❌ Very complex topic extraction logic
- ❌ Fragile fuzzy matching
- ❌ May miss topics or create false matches

---

## Recommended Implementation: Option 1 (Gemini-Based)

### Rationale

1. **Simplicity:** Minimal code changes, leverages existing AI infrastructure
2. **Quality:** Gemini can understand context and only add timestamps where relevant
3. **Natural Integration:** Timestamps flow naturally in the summary text
4. **User Experience:** Clickable timestamps blend seamlessly with readable summary
5. **Performance:** Single API call, no additional latency

### Risk Mitigation

**Concern:** Gemini might hallucinate incorrect timestamps

**Mitigation:**
- Provide explicit format instructions in prompt
- Include examples of good timestamp usage
- Validate timestamp format in frontend (regex pattern matching)
- Ignore/hide malformed timestamps gracefully

## Implementation Checklist

### Phase 1: Backend (Timestamp Injection in Summaries)

- [ ] Update `SYSTEM_INSTRUCTIONS` in [backend/app/prompts/summary.py](backend/app/prompts/summary.py:8-26)
  - Remove "DO NOT include timestamps" instruction
  - Add clear timestamp formatting guidelines
  - Add examples of good timestamp usage

- [ ] (Optional) Format transcript with timestamps in [backend/app/routes/summary.py](backend/app/routes/summary.py:75-108)
  - Prefix each segment with `[MM:SS]` for clarity
  - Helps Gemini understand available timestamps

### Phase 2: Frontend (Timestamp Parsing)

- [ ] Add timestamp parsing function in [extension/src/content/components/SummaryTab.tsx](extension/src/content/components/SummaryTab.tsx:182-247)
  - Regex pattern: `/\((\d{1,2}):(\d{2})\)/g`
  - Parse `(MM:SS)` into seconds
  - Return array of text/timestamp parts

- [ ] Update `renderSummary()` to render clickable timestamps
  - Detect timestamp parts
  - Render as styled `<span>` with onClick handler
  - Style: purple color, underlined, pointer cursor

### Phase 3: YouTube Player Integration

- [ ] Add `onSeekVideo` prop to SummaryTab interface

- [ ] Implement `handleSeekVideo()` in [extension/src/content/components/YouTubeSidebar.tsx](extension/src/content/components/YouTubeSidebar.tsx)
  - Access YouTube player via `document.querySelector('video')`
  - Set `currentTime` property
  - Call `play()` to resume playback

- [ ] Pass `onSeekVideo` callback to SummaryTab component

### Phase 4: Testing & Refinement

- [ ] Test with various video types (short, long, multiple topics)
- [ ] Verify timestamp accuracy
- [ ] Test clicking behavior across different YouTube layouts
- [ ] Handle edge cases (no timestamps, malformed timestamps)

## Example Output

### Before (Current)
```
**Q1: What is the main topic of the video?**
The speaker discusses the importance of authentication in modern web applications. They explain how session tokens work and why they're more secure than storing passwords.
```

### After (With Clickable Timestamps)
```
**Q1: What is the main topic of the video?**
The speaker discusses the importance of authentication (02:15) in modern web applications. They explain how session tokens work (05:23) and why they're more secure than storing passwords (07:45).
```

**User Experience:**
- Clicking `(02:15)` → YouTube video seeks to 2:15 and plays
- Clicking `(05:23)` → YouTube video seeks to 5:23 and plays
- Timestamps styled in purple (#667eea), underlined, pointer cursor

## Technical Notes

### YouTube Player Access

YouTube embeds video using an HTML5 `<video>` element that can be accessed via:
```typescript
const videoElement = document.querySelector('video') as HTMLVideoElement;
videoElement.currentTime = seconds;
videoElement.play();
```

This works for:
- Standard YouTube video pages
- Embedded videos (if permissions allow)

### Timestamp Format

**Pattern:** `(MM:SS)` or `(HH:MM:SS)`
- `MM` = minutes (1-2 digits)
- `SS` = seconds (always 2 digits)
- `HH` = hours (optional, 1-2 digits)

**Regex:**
```typescript
// MM:SS format
const timestampRegex = /\((\d{1,2}):(\d{2})\)/g;

// HH:MM:SS format (future enhancement)
const timestampRegexLong = /\((\d{1,2}):(\d{2}):(\d{2})\)/g;
```

### Error Handling

**Scenarios:**
1. **Video element not found:** Log warning, show user feedback ("Cannot seek video")
2. **Malformed timestamp:** Ignore silently, render as plain text
3. **Timestamp out of range:** Clamp to video duration or show warning

## Future Enhancements

1. **Timestamp Validation:** Verify timestamps are within video duration
2. **Smart Timestamp Placement:** Add timestamps to PDF/markdown exports
3. **Timestamp Preview:** Hover tooltip showing video frame thumbnail
4. **Timestamp Accuracy:** Validate AI-generated timestamps against actual transcript
5. **Timestamp Density Control:** Let users adjust how many timestamps appear in summary

## Estimated Effort

- **Backend Changes:** 30-45 minutes
  - Update prompt instructions
  - (Optional) Format transcript with timestamps
  - Testing with various videos

- **Frontend Changes:** 1-2 hours
  - Timestamp parsing function
  - Enhanced renderSummary with clickable spans
  - YouTube player integration
  - Styling and UX polish
  - Testing across different summary formats (Short, Topics, Q&A)

**Total:** ~2-3 hours for full implementation and testing

---

## Next Steps

1. ✅ **Investigation Complete** - This document
2. ⏳ **Backend Implementation** - Update prompts and add timestamp formatting
3. ⏳ **Frontend Implementation** - Add parsing and clicking functionality
4. ⏳ **Testing** - Verify with real videos and edge cases
5. ⏳ **Documentation** - Update [CLAUDE.md](CLAUDE.md) with implementation details

