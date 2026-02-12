# Specification: Mintclip Web App V1 (REVISED Feb 2026)

## Goal
Deliver a **desktop-only** web application where users authenticate via Google OAuth, extract YouTube transcripts from single URLs with **interactive generation** (summary/chat), view saved items in a **paginated dashboard grid**, and interact with content through a slide-out modal. **Library screen removed** - use Dashboard only. **Markdown export only** - PDF/TXT deprioritized.

## User Stories
- As a YouTube content researcher, I want to sign in with Google and paste a YouTube URL to instantly extract transcripts, generate AI summaries, and chat with video content so I can organize my research in one place.
- As a student, I want to view my saved videos in a simple dashboard grid with pagination so I can quickly find specific videos and review their content without complexity.

## Specific Requirements

**Google OAuth Authentication**
- Sign-in flow: User clicks "Sign In with Google" on landing page, redirects to Google OAuth consent screen, returns to `/auth/callback` with authorization code
- Backend exchanges authorization code for JWT tokens via `POST /api/auth/google/code` endpoint (existing)
- Store tokens in localStorage: `mintclip_access_token`, `mintclip_refresh_token`, `mintclip_user` (JSON object)
- Protected routes redirect to `/` when user not authenticated
- Token refresh: Automatically refresh access token when expired using existing `POST /api/auth/refresh` endpoint
- No email/password authentication in V1

**Single URL Processing**
- Dashboard displays single text input with "Extract" button
- Input validation: Must match YouTube URL pattern (`youtube.com/watch?v=`, `youtu.be/`, etc.)
- Extract button disabled when input empty or invalid URL format
- On submit: POST to existing `/api/transcript/extract` endpoint with video_id
- Backend auto-translates non-English transcripts to English using Gemini AI
- Auto-save extracted transcript to Supabase `saved_items` table with `source='upload'`
- Show loading spinner "Extracting..." during processing
- Display error message below input if extraction fails (private video, no captions, etc.)
- After success: New video card appears in grid immediately

**Dashboard Video Grid**
- Display 4-column grid (desktop only, 1024px+)
- Show 9 cards initially with "Load More" button for pagination (next 10)
- Video card elements: YouTube thumbnail (from CDN), title (2-line ellipsis with tooltip on hover), badges showing available content (Transcript/Summary/Chat), Export MD button, created date, hover actions (View/Delete)
- Filter bar with tabs: "All", "With Summary", "With Chat", "Recent" (active tab has green background)
- Real-time search input (right-aligned) filters cards by video title
- Cards have 20px border radius, subtle border, hover effect lifts card -4px
- Load all saved items from `GET /api/saved-items/list` on mount
- Client-side pagination: Show 9 cards, load next 10 on button click
- Clicking "View" opens SavedItemModal
- Clicking "Delete" shows confirmation, calls `DELETE /api/saved-items/{video_id}/{item_type}`, removes card

**Library Table View - REMOVED FOR V1**
- Library screen removed from V1 scope
- Use Dashboard with pagination instead
- Will be added in V2 as advanced view

**SavedItemModal Slide-Out Design**
- Trigger: Clicking "View" button on Dashboard card or Library table row
- Design specs: 600px max width, 800px height (full viewport), slides from right side, 0.3s ease-out animation
- Background: #212121 dark theme, overlay rgba(0, 0, 0, 0.5)
- Header: Video title (18px bold, single line ellipsis), close button (36x36px)
- Three tabs: Transcript, Summary, Chat (active tab has green underline)
- Close handlers: ESC key, overlay click, X button click
- Tab content area scrollable with custom scrollbar styling

**Transcript Tab Features**
- Controls row: Search input, Language display (read-only), Export MD button
- Transcript display: Paragraphs grouped by 8 lines or punctuation breaks with timestamps
- Timestamps: Blue color (#3ea6ff), underlined, clickable, format "MM:SS"
- Clicking timestamp seeks YouTube video to that position (if player accessible)
- Search highlights matching text in yellow
- Export button downloads transcript as Markdown file (TXT/PDF removed)
- Copy button copies entire transcript to clipboard

**Summary Tab Features**
- Format selector dropdown: "Short", "Topics", "Q&A" (changes displayed summary)
- Generate button: Visible only for `source='upload'` items, calls `POST /api/summary/generate`
- Display: Markdown rendering with headers (bold), bullet lists, proper line breaks
- Loading state: "Generating summary..." spinner while backend processes
- Export button downloads summary as Markdown file (TXT/PDF removed)
- Copy button copies summary text to clipboard
- View-only mode for `source='extension'` items (no Generate button, show existing summary only)
- Cache summaries per format to avoid regenerating

**Chat Tab Features**
- Suggested questions: 3 purple pill buttons (upload items only), clicking sends question automatically
- Message list: User messages (purple gradient bubble, right-aligned), Assistant messages (gray bubble, left-aligned)
- Input area: Textarea with Send button (disabled when empty or loading)
- Interactive mode: `source='upload'` items can send messages via `POST /api/chat/message`
- View-only mode: `source='extension'` items show existing chat history, input disabled with message "Chat only available for uploaded videos"
- Empty state: 💬 icon with "Start a conversation about this video"
- Auto-scroll to latest message
- Suggested questions generated via `POST /api/chat/suggested-questions` on tab mount

**Design System Implementation**
- Colors: Background dark (#171717), elevated (#1f1f1f), card (#262626), accent green (#22c55e), text white (#ffffff), secondary (#a3a3a3)
- Typography: Plus Jakarta Sans (700-800 weight) for headings, Inter (400-600) for body text
- Navigation: Fixed top bar, pill-shaped (100px radius), blur backdrop filter
- Buttons: Primary (100px radius, green gradient), Secondary (8-12px radius, border only)
- Cards: 20px radius, subtle border, hover lift effect, tooltip on title hover
- Match provided HTML mockups pixel-perfect: `landing-page-framer.html`, `dashboard-framer.html`, `modal-mockup.html` (library.html removed)

**Data Integration with Supabase**
- Use existing `saved_items` table with columns: id, user_id, video_id, item_type, content (JSONB), created_at, expires_at, source
- Content JSONB schema for transcript: `{ videoTitle, videoThumbnail, savedAt, language, text, segments[] }`
- Content JSONB schema for summary: `{ videoTitle, videoThumbnail, savedAt, format, summary, is_structured }`
- Content JSONB schema for chat: `{ videoTitle, videoThumbnail, savedAt, chat_history[], suggested_questions[] }`
- Source field: 'extension' (from Chrome extension, view-only) or 'upload' (from web app, interactive)
- Free tier: 25 saved items max, 30-day expiration
- Premium tier: Unlimited saved items, no expiration

**Frontend Tech Stack**
- React 18 with TypeScript for type safety
- Vite for fast bundler and dev server
- React Router DOM v7 ONLY for routing (no additional dependencies)
- Fetch API for HTTP requests (no Axios)
- Inline styles or CSS modules matching design references exactly (no Tailwind, no UI libraries)
- State management: useState/useEffect hooks only (no Redux, no Zustand)
- Desktop-only (1024px+) - mobile responsiveness deprioritized to V2

**API Endpoint Reuse**
- All endpoints already exist in FastAPI backend, no new endpoints needed
- Auth: `POST /api/auth/google/code`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- Transcripts: `POST /api/transcript/extract` (returns transcript with auto-translation)
- Summaries: `POST /api/summary/generate` (format: short/topic/qa)
- Chat: `POST /api/chat/message`, `POST /api/chat/suggested-questions`
- Saved Items: `POST /api/saved-items/save`, `GET /api/saved-items/list`, `GET /api/saved-items/{video_id}/{item_type}`, `DELETE /api/saved-items/{video_id}/{item_type}`

## Visual Design

**`planning/visuals/landing-page-framer.html`**
- Hero section with Mintclip logo, headline "Extract YouTube transcripts instantly", subheadline describing features
- Single prominent "Sign In with Google" button (green, pill-shaped, centered)
- Three feature cards below hero: "Transcripts", "Summaries", "Chat" with icons and descriptions
- Footer with copyright text
- Dark theme throughout with green accent color

**`planning/visuals/dashboard-framer.html`**
- Fixed navigation bar at top with logo, navigation links (Dashboard only - Library removed), user avatar dropdown
- Page header "Welcome back, [Name]" below navigation
- URL input section: Large text input with placeholder "Paste YouTube URL...", green "Extract" button right-aligned
- Filter bar below input: Tab buttons "All", "With Summary", "With Chat", "Recent" plus search input right-aligned
- Video grid: 4 columns, 9 cards visible (3 rows), "Load More" button below
- Cards: thumbnail (16:9 ratio), title with tooltip, badges, Export MD button, created date, hover actions

**`planning/visuals/modal-mockup.html`**
- Slide-in from right animation (translateX transform)
- Dark background (#212121) with rounded corners on left edge
- Header: Video title left-aligned, close X button right-aligned (36x36px clickable area)
- Tab navigation: Three tabs with green underline for active tab
- Content area: White text on dark background, proper spacing (16-24px padding)
- Transcript: Paragraphs with blue timestamps, search input at top, Export MD button
- Summary: Format dropdown, Markdown rendering, Generate/Export MD buttons
- Chat: Suggested questions (purple pills), message bubbles, input textarea at bottom

## Existing Code to Leverage

**Authentication Service (`backend/app/routes/auth.py`)**
- Google OAuth code exchange endpoint already implemented with Supabase integration
- JWT token generation with 1-hour access token, 30-90 day refresh token
- Token validation middleware via HTTPBearer security
- User profile retrieval from Supabase with tier information
- Reuse token refresh logic and validation patterns

**Saved Items API (`backend/app/routes/saved_items.py`)**
- CRUD operations for saved_items table with quota enforcement (25 free, unlimited premium)
- Upsert logic prevents duplicates via unique constraint (user_id, video_id, item_type)
- Automatic expiration calculation (30 days free, None premium)
- Source field tracking ('extension' vs 'upload')
- Reuse all endpoints without modification

**Extension Component Patterns (`extension/src/content/components/YouTubeSidebar.tsx`)**
- Tab navigation structure with active state management
- Transcript display with timestamp parsing and clickable links
- Summary format selector with caching per format
- Chat message rendering with user/assistant styling
- Error handling with toast notifications
- Adapt these patterns for web app modal implementation

**Transcript Extraction (`backend/app/routes/transcript.py`)**
- YouTube transcript API integration with language detection
- Automatic AI translation for non-English videos using Gemini
- Multi-layer caching (1hr in-memory, 30-day persistent)
- Segment parsing with timestamp formatting
- Leverage existing extraction logic, no changes needed

**Backend Middleware (`backend/app/middleware/auth.py`)**
- Token validation with Supabase JWT verification
- User context injection into request
- Error handling for expired/invalid tokens
- Use existing middleware for all protected web app routes

## Out of Scope (V1) - Deprioritized to V2

### Removed from V1 Scope (Feb 2026 Revision)
- ❌ **Library table view** - Dashboard pagination sufficient for MVP
- ❌ **Mobile responsiveness** - Desktop-only (1024px+), add mobile in V2
- ❌ **PDF & Text export** - Markdown export only (sufficient for LLM pasting)
- ❌ **Advanced animations** - Basic hover effects only
- ❌ **Automated tests** - Manual QA only

### Original Out of Scope Items
- Batch URL processing UI (completely hidden, no multi-URL input interface)
- Extension and webapp token sharing or auth bridge (web app uses independent Google OAuth)
- Email/password authentication (Google OAuth only for V1)
- Multi-video chat across different videos (chat limited to single video context)
- Collections or folders for organizing videos (flat list only)
- Cloud storage integration like Dropbox or Google Drive sync
- Advanced search across all video transcripts (only title search)
- Password reset flow (can add in V1.1 if email auth added)
- Analytics integration like Mixpanel or Google Analytics
- Mobile native apps (web app responsive only)
- Public sharing links for saved items
- Collaborative features or team workspaces
- Video playlist import from YouTube
- Custom branding or white-label options
- Third-party API integrations
- Offline mode or PWA functionality
- Browser extensions for browsers other than Chrome
- Video download or local storage of video files
