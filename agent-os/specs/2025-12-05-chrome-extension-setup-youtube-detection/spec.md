# Specification: Chrome Extension Setup & YouTube Page Detection

## Goal
Deliver a Manifest V3 Chrome extension that auto-detects YouTube pages, injects a minimal floating button + side panel UI, and connects to backend APIs for transcripts, summaries, and chat without disrupting YouTube’s native experience.

## User Stories
- As a YouTube viewer, I want the extension to appear automatically on video pages so I can open transcripts, summaries, and chat without copying links.
- As a founder validating the product, I want the extension to prove instant transcript + chat value before investing in batch processing infrastructure.
- As a privacy-conscious user, I want the extension to request only the minimal permissions needed and avoid interfering with YouTube controls or comments.

## Specific Requirements

**Manifest & Permissions**
- Use Manifest V3 (required for new extensions).
- Permissions: `activeTab`, `storage`, `host_permissions: ["*://*.youtube.com/*"]`.
- Include `identity` permission for Google OAuth authentication (required for sign up flow).

**YouTube Page Detection**
- Match URLs: `youtube.com/watch*`, `youtube.com/shorts/*`, `youtube.com/@*`, `youtube.com/channel/*`.
- Detect navigation changes on single-page app routing (YouTube SPA) to re-inject as needed.

**UI Injection**
- Auto-inject a floating button on detected pages; button expands into a side panel overlay (prefer right side).
- UI must be toggleable on/off by the user.
- Avoid interfering with player controls, comments, and native UI elements.
- Side panel UI should follow patterns similar to Eightify and similar YouTube summarizer extensions (reference: https://chromewebstore.google.com/detail/eightify-ai-youtube-summa/cdcpabkolgalpgeingbdcebojebfelgb).

**Rendering & Styles**
- Inject React-based UI.
- Wrap injected UI in a shadow DOM to isolate styles from YouTube CSS.
- Keep MVP styling minimal; prioritize functionality over polish.

**Content Script**
- Mount the shadow-root React app when detection triggers.
- Handle cleanup/unmount on navigation changes.
- Provide hooks for transcript display, summary, and chat once backend endpoints exist.

**UI Structure & Tabs**
- Implement tabbed interface in side panel with at least three tabs: Transcript, Summary, and Chat.
- Transcript tab: Display streaming raw transcript as it becomes available, with timestamps. Support scrolling and search within transcript. Include Copy button for copying transcript text.
- Summary tab: Display AI-generated summary with configurable options:
  - Format selector: Toggle between "Q&A" format and "Listicle" format.
  - Detail level selector: Toggle between "Short" and "Detailed" summary options.
  - Focus options: Provide "Insightful", "Actionable", and "Funny" options (can be managed via customizable prompts in backend, as outputs are similar).
  - Include Share button with dropdown menu:
    - Copy section: "Copy Link", "Copy Text"
    - Export section: "Export as Text", "Export as Doc", "Export as PDF", "Export as Markdown"
  - Include Copy button for quick copying of summary text.
- Chat tab: Interactive chat interface for asking questions about video content with timestamp-referenced answers.
- Tabs should be clearly labeled and easily switchable, following common tab UI patterns (similar to Eightify's interface).

**Background Service Worker**
- Handle API communication to backend (transcript fetch, Gemini calls via backend proxy for key security).
- Support streaming transcript data to content script for real-time display in Transcript tab.
- Handle requests for multiple summary configurations:
  - Format options: Q&A format, Listicle format
  - Detail levels: Short, Detailed
  - Focus options: Insightful, Actionable, Funny (managed via customizable prompts in backend)
- Handle export functionality: Text, Doc, PDF, Markdown formats.
- Manage authentication state and user session.
- Manage basic extension state and message passing with content scripts.
- Skip offline functionality for MVP.

**Extension Icon Behavior**
- When extension icon is clicked (first time or when user is not authenticated), open a sign up/authentication page.
- Sign up page should include:
  - Google Auth option (OAuth integration)
  - Other authentication options (to be determined based on backend auth system)
  - User registration/login flow
- After authentication, icon click can open settings/preferences.
- Show a badge (e.g., "✓") when on a processable YouTube page.
- UI injects automatically on detection; icon does not gate UI.
- Authentication state should be persisted and checked before allowing full extension functionality.

**Error Handling & Resilience**
- Gracefully handle missing captions; allow backend/Gemini transcription fallback.
- Show lightweight error toasts in the panel without blocking YouTube playback.

**Security & Data Flow**
- Keep API keys on backend; extension calls backend endpoints only.
- Minimize data persisted in `storage`; scope to user preferences and lightweight cache.

## Visual Design
No visual assets provided. MVP: floating button + side panel pattern (similar to Grammarly/1Password UX). UI structure should reference Eightify's tabbed interface pattern (https://chromewebstore.google.com/detail/eightify-ai-youtube-summa/cdcpabkolgalpgeingbdcebojebfelgb) with tabs for Transcript, Summary (with multiple detail levels), and Chat.

## Existing Code to Leverage
- No existing features identified (new project).
- Architectural guidance: plan for shared utilities (transcript processing, Gemini formatting, summaries) if using a monorepo across extension and web app.

## Out of Scope
- Manifest V2 support.
- Offline functionality.
- Complex UI polish beyond minimal MVP.
- Additional authentication providers beyond Google OAuth (can be added later).

---

## Clickable Timestamps Feature (Added December 30, 2025)

### Goal
Add clickable timestamps to AI-generated summaries that allow users to jump to specific moments in the YouTube video.

### User Stories
- As a YouTube viewer, I want to click timestamps in the summary to jump to the exact moment where a topic is discussed.
- As a researcher, I want to quickly navigate to specific sections of a video based on summary timestamps.
- As a content creator, I want viewers to be able to reference specific moments in my video through the summary.

### Specific Requirements

**Backend Changes:**
- Update `SYSTEM_INSTRUCTIONS` in `backend/app/prompts/summary.py`:
  - Remove "DO NOT include timestamps" instruction
  - Add instruction to include timestamps in `(MM:SS)` format
  - Add guideline to only include timestamps for substantial topics
  - Include examples showing proper timestamp usage
- (Optional) Format transcript with `[MM:SS]` timestamps before sending to Gemini

**Frontend Changes:**
- Add `parseTimestamps(text: string)` function in `extension/src/content/components/SummaryTab.tsx`:
  - Regex pattern: `/\((\d{1,2}):(\d{2})\)/g`
  - Parse minutes and seconds from `(MM:SS)` format
  - Calculate total seconds for video seeking
  - Return array of typed parts (text or timestamp)
- Update `renderSummary()` function in `extension/src/content/components/SummaryTab.tsx`:
  - Parse timestamps from summary text
  - Render timestamps as clickable `<span>` elements
  - Style: purple color (#667eea), underlined, pointer cursor
  - Add hover tooltip: "Jump to {timestamp}"
- Add `handleTimestampClick(seconds: number)` function in `extension/src/content/components/SummaryTab.tsx`:
  - Handle timestamp click events
  - Delegate to `onSeekVideo(seconds)` callback
- Add `onSeekVideo?: (seconds: number) => void` prop to `SummaryTabProps` interface
- Implement `handleSeekVideo(seconds: number)` in `extension/src/content/components/YouTubeSidebar.tsx`:
  - Access YouTube player via `document.querySelector('video')`
  - Set `currentTime` property to seek video
  - Call `play()` to resume playback
  - Handle errors gracefully

**Expected Output Example:**
```
**Q1: What is the main topic of the video?**
The speaker discusses the importance of authentication (02:15) in modern web applications. They explain how session tokens work (05:23) and why they're more secure than storing passwords (07:45).
```

**User Experience:**
- Clicking `(02:15)` → YouTube video seeks to 2:15 and plays
- Timestamps styled in purple (#667eea), underlined, with pointer cursor
- Works across all summary formats (Q&A, Topics, Short)

**Testing:**
- Test with short (<5 min), medium (5-20 min), and long (>20 min) videos
- Test clicking timestamps at beginning, middle, and end of video
- Verify timestamp accuracy (±30 seconds acceptable)
- Test with all three summary formats
- Handle edge cases: malformed timestamps, no timestamps, player not found

