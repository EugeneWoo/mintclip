# Spec Requirements: Chrome Extension Setup & YouTube Page Detection

## Initial Description

Chrome Extension Setup & YouTube Page Detection — Create Chrome extension manifest, content scripts, and background service worker. Detect when user is on a YouTube video page and inject extension UI.

## Requirements Discussion

### First Round Questions

**Q1:** I assume we're using Manifest V3 (current Chrome standard). Is that correct, or should we use Manifest V2 for compatibility?

**Answer:** Manifest V3 - yes, correct. It's the current standard and required for new extensions.

**Q2:** For YouTube page detection, I'm thinking we detect URLs matching `youtube.com/watch*` and `youtube.com/shorts/*`. Should we also handle other YouTube URL patterns, or just these two?

**Answer:** URL patterns - Start with youtube.com/watch* and youtube.com/shorts/*. You could also add youtube.com/@*/videos and youtube.com/channel/* for when users are browsing channel pages (useful for your batch processing feature trigger).

**Q3:** For UI injection, I'm thinking we inject a sidebar panel or floating button that opens a panel overlay on the YouTube page. Should we use a popup (clicking the extension icon), or inject directly into the YouTube page?

**Answer:** UI injection - I'd suggest injecting directly into the YouTube page with a floating button/sidebar, similar to how Grammarly or 1Password work. This is more seamless than requiring users to click the extension icon. The button could expand into a side panel showing transcript/summary/chat.

**Q4:** For the content script, I'm assuming we'll inject React components (matching the Next.js/React tech stack) into the YouTube page. Should we use a shadow DOM to isolate styles, or rely on scoped CSS?

**Answer:** Shadow DOM - Yes, absolutely use shadow DOM to isolate styles. YouTube's CSS is complex and you don't want conflicts breaking either their UI or yours.

**Q5:** For the background service worker, I'm thinking it handles API calls to your backend (for transcript extraction, Gemini API, etc.) and manages extension state. Should it also handle offline functionality, or focus on API communication?

**Answer:** Service worker - Focus on API communication for MVP. Handle: transcript fetching, Gemini API calls (proxied through your backend for API key security), and basic state management. Skip offline functionality initially - adds complexity without clear MVP value.

**Q6:** For permissions, I assume we need `activeTab` (to access YouTube page content), `storage` (for user preferences), and host permissions for `youtube.com`. Are there other permissions needed, or should we request minimal permissions initially?

**Answer:** Permissions - You've got the key ones: activeTab - access YouTube pages, storage - user preferences, cached transcripts, host_permissions: ["*://*.youtube.com/*"] - interact with YouTube. Potentially identity if you want OAuth for your web app sync.

**Q7:** For the extension icon, I'm thinking we place it in the Chrome toolbar and show a badge/indicator when on a YouTube video page. Should the icon be clickable to open the extension UI, or should the UI auto-inject when a video page is detected?

**Answer:** Extension icon - Make it clickable to open settings/preferences, but auto-inject the UI when a video page is detected. The icon could show a badge (like "✓") when on a processable YouTube page.

**Q8:** Are there any specific YouTube page elements or interactions we should avoid interfering with, or any constraints on where/how we inject the UI?

**Answer:** Avoid interfering with - YouTube's video player controls, comment section, and their own UI elements. Inject your UI on the right side (where YouTube sometimes shows related videos) or as an overlay that can be toggled on/off.

### Existing Code to Reference

**Similar Features Identified:**
- No similar existing features identified for reference (new project)
- User recommends considering a monorepo structure with shared utilities between extension and web app

**Architecture Guidance:**
- Shared logic between extension and web app: transcript processing, Gemini API formatting, summary generation
- Extension-specific: content scripts for YouTube DOM manipulation, service worker for background tasks
- Web app-specific: batch processing, 30-day storage, user accounts
- Consider a monorepo structure with shared utilities

### Follow-up Questions

No follow-up questions needed - all requirements are clear.

## Visual Assets

### Files Provided:
No visual files found.

### Visual Insights:
No visual assets provided. User indicated: "No visual assets needed yet - for MVP, keep the UI minimal. A simple floating button + side panel with transcript/chat interface is sufficient. Worry about polish after validating the core value prop."

## Requirements Summary

### Functional Requirements
- Create Chrome extension using Manifest V3
- Detect YouTube pages matching patterns: youtube.com/watch*, youtube.com/shorts/*, youtube.com/@*/videos, youtube.com/channel/*
- Auto-inject UI when video page is detected (floating button that expands to side panel)
- Inject UI directly into YouTube page (not popup-based)
- Use shadow DOM to isolate extension styles from YouTube's CSS
- Background service worker handles: transcript fetching, Gemini API calls (proxied through backend), basic state management
- Extension icon shows badge indicator when on processable YouTube page
- Extension icon clickable to open settings/preferences
- UI injection on right side of page or as toggleable overlay
- Avoid interfering with YouTube's video player controls, comment section, and UI elements

### Reusability Opportunities
- Plan for shared logic between extension and web app: transcript processing, Gemini API formatting, summary generation
- Consider monorepo structure for code sharing
- Extension-specific: content scripts for YouTube DOM manipulation, service worker for background tasks

### Scope Boundaries
**In Scope:**
- Manifest V3 setup
- Content scripts for YouTube page detection and UI injection
- Background service worker for API communication
- Floating button + side panel UI (minimal MVP design)
- Shadow DOM for style isolation
- Basic permissions: activeTab, storage, host_permissions for YouTube
- Icon badge indicator for processable pages
- Settings/preferences via icon click

**Out of Scope:**
- Offline functionality (skip for MVP)
- Manifest V2 compatibility
- Complex UI polish (keep minimal for MVP validation)
- OAuth/identity permissions (potentially future, not MVP)

### Technical Considerations
- Manifest V3 required (current standard)
- Shadow DOM for style isolation (critical to avoid YouTube CSS conflicts)
- React components injected into YouTube page
- Service worker proxies API calls through backend for API key security
- UI injection similar to Grammarly/1Password pattern (floating button + side panel)
- Strategic importance: Build extension before web app as main acquisition channel
- MVP focus: Prove core value (instant transcript + chat) before batch processing infrastructure

