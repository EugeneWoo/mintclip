# Product Roadmap

## Chrome Extension (MVP)

1. [ ] Chrome Extension Setup & YouTube Page Detection — Create Chrome extension manifest, content scripts, and background service worker. Detect when user is on a YouTube video page and inject extension UI. `M`

2. [ ] Single Video Transcript Extraction (Extension) — Extract transcript from the current YouTube video page using existing captions API, with fallback to Gemini transcription for videos without captions. Display transcript in extension popup or sidebar with timestamps. `M`

3. [ ] AI Summary Generation (Extension) — Generate intelligent summaries of video transcripts using Gemini, extracting key points, main topics, and actionable insights. Display summary in extension interface alongside transcript. `M`

4. [ ] Chat Interface in Extension — Implement chat interface within the extension where users can ask questions about the current video's content. Use Gemini to answer questions with timestamp references back to the original transcript. Users interact without leaving YouTube. `L`

## Web App (Batch Processing)

5. [ ] Web App Setup & Channel URL Input — Create web application with URL(s) input interface. Users paste a YouTube channel URL or a list of individual video URLS and the system discovers and lists all videos from that channel or list (up to 50 videos). Display video list with metadata. `M`

6. [ ] Batch Transcript Extraction (Web App) — Process multiple videos (25-50) from a channel or a list of URLs simultaneously, extracting transcripts for all videos in parallel. Show progress indicator and handle errors gracefully. `L`

7. [ ] Batch AI Summary Generation (Web App) — Generate summaries for all videos in a batch, identifying common themes and patterns across the content. Display individual summaries plus cross-video insights. `L`

8. [ ] Cross-Video Pattern Analysis — Analyze transcripts and summaries across multiple videos to identify recurring themes, common concepts, and knowledge patterns. Generate a combined analysis report highlighting insights across the channel. `XL`

## Authentication & Storage

9. [ ] User Authentication & Accounts — Implement user authentication system in web app so users can create accounts, sign in, and access their processed content. Extension syncs with user account. `M`

10. [ ] Transcript & Summary Storage — Store processed transcripts and summaries from both extension and web app in database with user association. Implement 30-day retention policy for stored content. `M`

11. [ ] Search Functionality (Web App) — Implement full-text search across all stored transcripts and summaries for a user. Allow filtering by channel, date range, and keywords. Display search results with relevant excerpts. `L`

12. [ ] Pro Tier Subscription System — Implement subscription management for Pro tier (30-day storage and search). Include payment processing, subscription status management, and feature gating in both extension and web app. `L`

> Notes
> - Order items by technical dependencies and product architecture
> - Each item should represent an end-to-end (frontend + backend) functional and testable feature
> - MVP focuses on Chrome extension single video processing (items 1-4) to validate core value proposition and zero-friction experience
> - Web app batch processing (items 5-8) represents the core differentiator and should follow MVP validation
> - Authentication and storage (items 9-12) enable cross-platform sync and monetization features

