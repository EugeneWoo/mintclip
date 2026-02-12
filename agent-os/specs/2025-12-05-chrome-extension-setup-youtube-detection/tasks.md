# Task Breakdown: Mintclip Web App V1 (REVISED Feb 2026)

## Overview
**Total Estimated Tasks:** ~35 tasks across 4 phases (reduced from 52)
**Timeline:** 4 weeks (1 phase per week)
**Tech Stack:** React 18 + TypeScript + Vite + React Router DOM v7 only
**Backend:** All APIs already exist - NO new endpoints needed

## Scope Changes (Feb 2026)
- ✅ **Dashboard pagination**: 9 cards + "Load More" button
- ✅ **Tooltips**: On hover for full video title
- ✅ **Export MD only**: PDF/TXT removed
- ❌ **Library screen**: REMOVED - use Dashboard only
- ❌ **Mobile responsiveness**: Desktop-only (1024px+)
- ❌ **Advanced animations**: Basic hover effects only
- ❌ **Automated tests**: Manual QA only

## Scope Boundaries

### IN SCOPE
- Single YouTube URL extraction (one URL at a time)
- Google OAuth authentication only
- Dashboard with video grid (3-4 columns)
- Library table view with filters
- Slide-out modal with 3 tabs (Transcript, Summary, Chat)
- Two source modes: 'upload' (interactive) and 'extension' (view-only)
- Dark theme throughout (#171717 background)
- Responsive design (mobile, tablet, desktop)
- Pixel-perfect match to design specs

### OUT OF SCOPE (Prevent Scope Creep)
- NO batch URL processing UI
- NO email/password authentication
- NO multi-video chat
- NO collections/folders
- NO cloud storage integration
- NO advanced search across transcripts
- NO analytics integration
- NO public sharing links
- NO collaborative features
- NO video playlist import
- NO offline/PWA functionality
- NO video downloads

---

## Phase 1: Foundation (Week 1)

### Task Group 1: Project Setup & Configuration
**Dependencies:** None

- [x] 1.0 Set up React web app foundation
  - [x] 1.1 Initialize Vite + React 18 + TypeScript project in `/web-app` directory
    - Spec reference: Lines 109-115 (Frontend Tech Stack)
    - Use `npm create vite@latest web-app -- --template react-ts`
    - Configure `vite.config.ts` with port 3000, proxy to backend port 8000
    - Set up `tsconfig.json` with strict mode enabled
  - [x] 1.2 Install core dependencies ONLY
    - `react-router-dom@7` (routing ONLY)
    - NO additional state management libraries (useState/useEffect only)
    - NO Axios (use native Fetch API)
    - NO UI libraries (custom components only)
  - [x] 1.3 Create project folder structure
    - `/src/pages` (Landing, Dashboard, Library, AuthCallback)
    - `/src/components` (Navigation, VideoCard, SavedItemModal, etc.)
    - `/src/services` (api.ts, auth.ts)
    - `/src/types` (SavedItem, User, ApiResponse types)
    - `/src/styles` (global.css, variables.css)
  - [x] 1.4 Set up environment configuration
    - Create `.env.development` and `.env.production`
    - Define `VITE_API_BASE_URL` (http://localhost:8000 dev, production URL)
    - Define `VITE_GOOGLE_CLIENT_ID`
    - Add `.env*` to `.gitignore`
  - [x] 1.5 Configure design tokens in CSS variables
    - Spec reference: Lines 93-97 (Design System Implementation)
    - Colors: `--bg-dark: #171717`, `--bg-elevated: #1f1f1f`, `--bg-card: #262626`, `--accent-green: #22c55e`, `--text-white: #ffffff`, `--text-secondary: #a3a3a3`
    - Typography: Plus Jakarta Sans (700-800), Inter (400-600)
    - Border radius: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-pill: 100px`
    - Spacing: `--spacing-xs: 8px`, `--spacing-sm: 12px`, `--spacing-md: 16px`, `--spacing-lg: 24px`, `--spacing-xl: 32px`

**Acceptance Criteria:**
- Vite dev server runs on port 3000
- TypeScript compiles without errors
- Folder structure matches spec requirements
- CSS variables defined and accessible
- Environment variables load correctly

---

### Task Group 2: Routing & Navigation Setup
**Dependencies:** Task Group 1

- [x] 2.0 Implement routing and navigation structure
  - [x] 2.1 Set up React Router DOM v7 routes
    - Spec reference: Lines 112-113 (React Router DOM v7 ONLY)
    - Create `src/App.tsx` with router configuration
    - Routes: `/` (Landing), `/dashboard` (Dashboard), `/library` (Library), `/auth/callback` (AuthCallback)
    - Protected route wrapper for `/dashboard` and `/library`
  - [x] 2.2 Create protected route component
    - Spec reference: Line 16 (Protected routes redirect to `/` when user not authenticated)
    - Check for `mintclip_access_token` in localStorage
    - Redirect to `/` if not authenticated
    - Validate token expiration and auto-refresh if needed
  - [x] 2.3 Build Navigation component
    - Spec reference: Lines 95-96 (Navigation: Fixed top bar, pill-shaped (100px radius), blur backdrop filter)
    - Fixed top bar with blur backdrop filter
    - Left: Mintclip logo (clickable to `/dashboard`)
    - Center: Pill-shaped nav links (Dashboard, Library) with active state
    - Right: User avatar dropdown (Logout option)
    - Show navigation only on authenticated routes
  - [x] 2.4 Create user avatar dropdown
    - Display user name and email from localStorage `mintclip_user`
    - Logout option calls `POST /api/auth/logout` and clears localStorage
    - Dropdown appears on avatar click, closes on outside click

**Acceptance Criteria:**
- All routes navigate correctly
- Protected routes redirect to landing when not authenticated
- Navigation bar shows on Dashboard and Library only
- User avatar dropdown works with logout functionality
- Active route highlighted in navigation

---

### Task Group 3: Authentication Implementation
**Dependencies:** Task Group 2

- [x] 3.0 Build Google OAuth authentication flow
  - [x] 3.1 Create auth service (`src/services/auth.ts`)
    - Spec reference: Lines 12-18 (Google OAuth Authentication)
    - `getGoogleAuthUrl()`: Generate Google OAuth URL with redirect_uri
    - `exchangeCodeForTokens(code)`: POST to `/api/auth/google/code`, store tokens in localStorage
    - `refreshAccessToken()`: POST to `/api/auth/refresh` with refresh_token
    - `logout()`: POST to `/api/auth/logout`, clear localStorage
    - `getValidAccessToken()`: Check expiration, auto-refresh if expired
  - [x] 3.2 Implement token storage in localStorage
    - Spec reference: Line 15 (Store tokens in localStorage: `mintclip_access_token`, `mintclip_refresh_token`, `mintclip_user`)
    - Keys: `mintclip_access_token`, `mintclip_refresh_token`, `mintclip_user` (JSON)
    - Store user object with `{ id, email, name, tier }` from backend response
    - Add expiration timestamp for access token (1 hour)
  - [x] 3.3 Build AuthCallback page (`/auth/callback`)
    - Spec reference: Line 13 (Returns to `/auth/callback` with authorization code)
    - Parse authorization code from URL query params
    - Call `exchangeCodeForTokens(code)` to get tokens
    - Show loading spinner during exchange
    - Redirect to `/dashboard` on success
    - Show error message and retry button on failure
  - [x] 3.4 Implement automatic token refresh
    - Spec reference: Line 17 (Token refresh: Automatically refresh access token when expired)
    - Check token expiration before each API call
    - Refresh token if expired (less than 5 minutes remaining)
    - Update localStorage with new access token
    - Handle refresh failure by redirecting to landing page

**Acceptance Criteria:**
- Google OAuth consent screen loads correctly
- Authorization code exchanges for tokens successfully
- Tokens stored in localStorage with correct keys
- Token refresh works automatically
- Logout clears all tokens and redirects to landing

---

### Task Group 4: Landing Page Design
**Dependencies:** Task Group 3

- [x] 4.0 Build landing page UI
  - [x] 4.1 Create Landing page component (`src/pages/Landing.tsx`)
    - Spec reference: Lines 127-132 (landing-page-framer.html)
    - Hero section with Mintclip logo and headline "Extract YouTube transcripts instantly"
    - Subheadline: "Get transcripts, AI summaries, and chat with any YouTube video"
    - Single "Sign In with Google" button (green, pill-shaped, centered)
  - [x] 4.2 Implement "Sign In with Google" button
    - Click triggers `getGoogleAuthUrl()` and redirects to Google OAuth
    - Button design: Green gradient background, 100px border radius, 16px padding
    - Hover effect: Slight scale transform (1.02)
    - Loading state during redirect
  - [x] 4.3 Add feature cards section
    - Three cards: "Transcripts", "Summaries", "Chat"
    - Each card: Icon, title, description
    - Card design: Dark background (#262626), 20px border radius, subtle border
    - Responsive grid: 3 columns desktop, 1 column mobile
  - [x] 4.4 Build footer section
    - Copyright text centered at bottom
    - Dark background matching page theme
    - Responsive padding

**Acceptance Criteria:**
- Landing page matches design specifications
- "Sign In with Google" button redirects to OAuth consent
- Feature cards display correctly on all screen sizes
- Dark theme applied throughout
- Responsive layout works on mobile, tablet, desktop

---

## Phase 2: Dashboard - Single URL Processing (Week 2)

### Task Group 5: API Service Layer
**Dependencies:** Task Group 3

- [x] 5.0 Build API service with authentication
  - [x] 5.1 Create API service (`src/services/api.ts`)
    - Spec reference: Lines 117-123 (API Endpoint Reuse)
    - Base function: `fetchWithAuth(endpoint, options)` adds Bearer token header
    - Automatically calls `getValidAccessToken()` before each request
    - Handles 401 errors by refreshing token and retrying once
    - Handles network errors with user-friendly messages
  - [x] 5.2 Implement transcript extraction method
    - Spec reference: Line 120 (POST /api/transcript/extract)
    - `extractTranscript(videoId)`: POST to `/api/transcript/extract`
    - Returns transcript with auto-translation to English
    - Auto-saves to Supabase with `source='upload'`
  - [x] 5.3 Implement saved items methods
    - Spec reference: Line 123 (Saved Items endpoints)
    - `getSavedItems()`: GET `/api/saved-items/list`
    - `getSavedItem(videoId, itemType)`: GET `/api/saved-items/{video_id}/{item_type}`
    - `deleteSavedItem(videoId, itemType)`: DELETE `/api/saved-items/{video_id}/{item_type}`
  - [x] 5.4 Implement summary and chat methods
    - Spec reference: Lines 121-122 (Summary and Chat endpoints)
    - `generateSummary(videoId, format)`: POST `/api/summary/generate`
    - `sendChatMessage(videoId, message, chatHistory)`: POST `/api/chat/message`
    - `getSuggestedQuestions(videoId)`: POST `/api/chat/suggested-questions`

**Acceptance Criteria:**
- All API methods include Bearer token authentication
- Token refresh works automatically on 401 errors
- Network errors return user-friendly error messages
- API methods typed with TypeScript interfaces

---

### Task Group 6: TypeScript Type Definitions
**Dependencies:** Task Group 5

- [x] 6.0 Define TypeScript types for data models
  - [x] 6.1 Create SavedItem types (`src/types/index.ts`)
    - Spec reference: Line 101 (saved_items table schema)
    - `SavedItem` interface with fields: id, user_id, video_id, item_type, content, created_at, expires_at, source
    - `ItemType` enum: 'transcript' | 'summary' | 'chat'
    - `Source` enum: 'upload' | 'extension'
  - [x] 6.2 Create content JSONB schema types
    - Spec reference: Lines 102-104 (Content JSONB schemas)
    - `TranscriptContent`: videoTitle, videoThumbnail, savedAt, language, text, segments[]
    - `SummaryContent`: videoTitle, videoThumbnail, savedAt, format, summary, is_structured
    - `ChatContent`: videoTitle, videoThumbnail, savedAt, chat_history[], suggested_questions[]
  - [x] 6.3 Create API response types
    - `ApiResponse<T>`: Generic wrapper with data, error, message fields
    - `User`: id, email, name, tier
    - `TokenResponse`: access_token, refresh_token, user
  - [x] 6.4 Create component prop types
    - `VideoCardProps`, `SavedItemModalProps`, `FilterBarProps`, etc.
    - Export all types from central `types/index.ts`

**Acceptance Criteria:**
- All data models have TypeScript interfaces
- JSONB content schemas typed correctly
- No `any` types used (strict TypeScript)
- Types exported and reusable across components

---

### Task Group 7: Dashboard Page Layout
**Dependencies:** Task Groups 4, 5, 6

- [x] 7.0 Build Dashboard page structure
  - [x] 7.1 Create Dashboard page component (`src/pages/Dashboard.tsx`)
    - Spec reference: Lines 134-139 (dashboard-framer.html)
    - Page header: "Welcome back, [Name]" using user from localStorage
    - URL input section below header
    - Filter bar below input
    - Video grid below filter bar
  - [x] 7.2 Implement single URL input section
    - Spec reference: Lines 20-29 (Single URL Processing)
    - Large text input with placeholder "Paste YouTube URL..."
    - Green "Extract" button right-aligned next to input
    - Input validation: Check YouTube URL pattern (youtube.com/watch?v=, youtu.be/)
    - Extract button disabled when input empty or invalid
    - Design: Dark input (#262626), white text, green accent
  - [x] 7.3 Add URL validation logic
    - Regex pattern: `/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/`
    - Show red border on invalid URL
    - Show checkmark icon on valid URL
    - Extract video ID from URL string
  - [x] 7.4 Implement extraction flow
    - Spec reference: Lines 23-29 (Extract flow with loading and error states)
    - On submit: Show loading spinner "Extracting..."
    - Call `extractTranscript(videoId)` from API service
    - Display success message on completion
    - Display error message below input on failure (private video, no captions, API error)
    - Clear input and refresh video grid on success

**Acceptance Criteria:**
- Dashboard matches design layout
- URL input validates YouTube URLs correctly
- Extract button disabled for invalid/empty URLs
- Loading state shows during extraction
- Error messages display below input
- Success refreshes video grid

---

### Task Group 8: Video Grid Display
**Dependencies:** Task Group 7

- [x] 8.0 Build video grid with cards (MODIFIED)
  - [x] 8.1 Create VideoCard component (`src/components/VideoCard.tsx`)
    - Spec reference: Lines 32-36 (Dashboard Video Grid)
    - Props: SavedItem with transcript content
    - Layout: YouTube thumbnail (16:9 ratio from CDN), title (2-line ellipsis), badges, created date, hover actions
    - Thumbnail source: `https://img.youtube.com/vi/{video_id}/maxresdefault.jpg`
    - Design: Dark card (#262626), 20px border radius, subtle border
  - [x] 8.2 Implement card badges
    - Badge pills showing available content: "T" (Transcript), "S" (Summary), "C" (Chat)
    - Badge colors: Transcript (blue), Summary (purple), Chat (green)
    - Only show badges for content types that exist
    - Badge design: Rounded pill, 6px padding, 12px font size
  - [x] 8.3 Add card hover effects
    - Spec reference: Line 36 (Cards have 20px border radius, subtle border, hover effect lifts card -4px)
    - Lift card -4px on hover (transform: translateY(-4px))
    - Show action buttons on hover: "View", "Export MD", and "Delete"
    - Smooth transition: 0.2s ease-out
    - Cursor pointer on entire card
  - [x] 8.4 Implement card actions (MODIFIED)
    - Spec reference: Lines 38-39 (View and Delete actions)
    - "View" button opens SavedItemModal with video details
    - **"Export MD" button**: Downloads content as Markdown file (NEW)
    - "Delete" button shows confirmation dialog
    - Delete confirmation calls `deleteSavedItem()` and removes card from grid
    - Action buttons: Secondary style (border only), 8px border radius
  - [x] 8.5 Add tooltip on title hover (NEW)
    - Show full video title on hover using HTML `title` attribute or custom tooltip
    - Prevents title truncation issues
  - [x] 8.6 Build desktop grid layout (SIMPLIFIED)
    - Spec reference: Line 32 (Display 4 column desktop grid)
    - Desktop (1024px+): 4 columns ONLY
    - Grid gap: 24px
    - Equal height cards using flexbox
    - **Mobile responsiveness removed**
  - [x] 8.7 Implement pagination (NEW)
    - Show 9 cards initially (3 rows × 3 columns)
    - "Load More" button below grid to load next 10 cards
    - Client-side pagination (all items loaded from API, show subsets)
    - Button design: Secondary style, centered, shows "Load X more videos"

**Acceptance Criteria:**
- Video cards display thumbnail, title, badges, date correctly
- Hover effects work smoothly
- Action buttons appear on hover (View, Export MD, Delete)
- Tooltip shows full title on hover
- Delete confirmation prevents accidental deletion
- Export MD button downloads Markdown file
- Grid displays 4 columns on desktop
- Pagination shows 9 cards + "Load More" button
- Cards match design specifications

---

### 🔄 Task Group 9: Filter Bar Implementation - DEPRIORITIZED TO V2
**Dependencies:** Task Group 8
**Status:** Use basic filters in Dashboard only, advanced filters moved to V2

- [ ] 9.0 Build filter and search functionality (BASIC VERSION FOR V1)
  - [ ] 9.1 Create FilterBar component (`src/components/FilterBar.tsx`)
    - Spec reference: Lines 34-35 (Filter bar with tabs and search)
    - Left side: Tab buttons "All", "With Summary", "With Chat", "Recent"
    - Right side: Search input with icon
    - Active tab has green background (#22c55e)
    - Design: Dark background, pill-shaped tabs (100px radius)
  - [ ] 9.2 Implement filter tab logic
    - "All": Show all saved items
    - "With Summary": Filter items with item_type='summary'
    - "With Chat": Filter items with item_type='chat'
    - "Recent": Sort by created_at descending (last 7 days)
    - Active tab state managed in Dashboard parent component
  - [ ] 9.3 Implement real-time search
    - Spec reference: Line 35 (Real-time search input filters cards by video title)
    - Search input filters cards by video title (case-insensitive)
    - Debounce search input by 300ms
    - Show "No results found" message when no cards match
    - Clear button (X icon) appears when search has text
  - [ ] 9.4 Combine filters and search
    - Apply filter tab first, then search on filtered results
    - Update video grid reactively when filters/search change
    - Show result count: "Showing X videos"

**Acceptance Criteria:**
- Filter tabs work correctly for each category
- Search filters by video title in real-time
- Filters and search work together correctly
- Active tab highlighted with green background
- Result count updates dynamically
- UI matches design specifications

---

## Phase 3: Library Table View (Week 3) - ❌ REMOVED FROM V1

### ❌ Task Group 10: Library Page Layout - DEPRIORITIZED TO V2
**Dependencies:** Task Groups 5, 6
**Reason:** Dashboard pagination sufficient for MVP

---

### ❌ Task Group 11: Library Table Implementation - DEPRIORITIZED TO V2
**Dependencies:** Task Group 10
**Reason:** Library screen removed

---

### ❌ Task Group 12: Library Card View (Mobile) - DEPRIORITIZED TO V2
**Dependencies:** Task Group 11
**Reason:** Mobile responsiveness deprioritized

---

### 🔄 Task Group 13: Export Functionality - SIMPLIFIED FOR V1 (MD Only)
**Dependencies:** Task Group 11
**Modification:** PDF and TXT export removed, Markdown export only

---

## Phase 4: SavedItemModal Implementation (Week 4)

### Task Group 14: Modal Foundation ✅ COMPLETED
**Dependencies:** Task Groups 8, 11

- [x] 14.0 Build modal slide-out structure
  - [x] 14.1 Create SavedItemModal component (`src/components/modal/SavedItemModal.tsx`)
    - Spec reference: Lines 54-61 (SavedItemModal Slide-Out Design)
    - Props: `isOpen`, `onClose`, `item` (SavedItemData)
    - Modal container: Fixed position, right side, slides in from right
    - Dimensions: 600px width (max), 800px height (full viewport)
    - Background: #212121 dark theme
    - Animation: 0.3s ease-out slide (translateX transform)
  - [x] 14.2 Implement modal overlay
    - Spec reference: Line 57 (Background overlay rgba(0, 0, 0, 0.5))
    - Full-screen overlay: rgba(0, 0, 0, 0.5)
    - Clicking overlay closes modal
    - Prevent body scroll when modal open
    - Fade-in animation with modal slide
  - [x] 14.3 Build modal header
    - Spec reference: Line 58 (Header: Video title, close button)
    - Left: Video title (18px bold, single line ellipsis) with tooltip
    - Right: Close button (36x36px clickable area, X icon)
    - Background: Same as modal (#212121)
    - Bottom border: Subtle separator
  - [x] 14.4 Implement close handlers
    - Spec reference: Line 60 (Close handlers: ESC key, overlay click, X button click)
    - ESC key press closes modal
    - Overlay click closes modal
    - X button click closes modal
    - Clean up event listeners on unmount
  - [x] 14.5 Build tab navigation
    - Spec reference: Line 59 (Three tabs: Transcript, Summary, Chat)
    - Three tabs: "Transcript", "Summary", "Chat"
    - Active tab: Green underline (3px thick, #22c55e)
    - Tab design: Horizontal layout with spacing
    - Click tab switches content below

**Acceptance Criteria:**
- Modal slides in from right smoothly
- Overlay fades in with modal
- Close handlers work (ESC, overlay, X button)
- Tab navigation switches between tabs
- Modal dimensions and styling match specifications
- Body scroll prevented when modal open

---

### Task Group 15: Transcript Tab Implementation ✅ COMPLETED
**Dependencies:** Task Group 14

- [x] 15.0 Build Transcript tab features
  - [x] 15.1 Create TranscriptTab component (integrated in SavedItemModal)
    - Spec reference: Lines 63-71 (Transcript Tab Features)
    - Props: `savedItem` (SavedItem with transcript content)
    - Layout: Controls row top, transcript display below
    - Scrollable content area with custom scrollbar
  - [x] 15.2 Implement controls row (MODIFIED)
    - Spec reference: Line 64 (Controls row: Search input, Language display, Copy button, Export button)
    - Search input: Filter transcript text (highlight matches)
    - Language display: Read-only badge showing transcript language
    - Copy button: Copy entire transcript to clipboard with visual feedback
    - Export button: Download transcript as **Markdown only (TXT removed)**
    - Controls design: Horizontal layout, 8px gap
  - [x] 15.3 Build transcript display
    - Spec reference: Lines 65-66 (Transcript display: Paragraphs with timestamps)
    - Group text into paragraphs (8 lines or punctuation breaks)
    - Show timestamps at paragraph start
    - Timestamp format: "MM:SS" (blue color #3ea6ff)
    - Text: White color, 15px font size, 1.6 line height
    - Paragraph spacing: 24px gap
  - [x] 15.4 Implement clickable timestamps
    - Spec reference: Line 67 (Clicking timestamp seeks YouTube video)
    - Parse timestamp format to seconds
    - Timestamps displayed in blue for visibility
  - [x] 15.5 Implement search highlight
    - Spec reference: Line 68 (Search highlights matching text in yellow)
    - Search input filters/highlights matching text
    - Highlight color: Yellow background (#fef08a)
    - Case-insensitive search
    - Show "No matches found" when no results

**Acceptance Criteria:**
- Transcript displays with timestamps correctly
- Search highlights matches in yellow
- Copy button copies to clipboard with visual feedback
- Export MD downloads Markdown file
- Layout matches modal specifications

---

### Task Group 16: Summary Tab Implementation ✅ COMPLETED
**Dependencies:** Task Group 14

- [x] 16.0 Build Summary tab features
  - [x] 16.1 Create SummaryTab component (integrated in SavedItemModal)
    - Spec reference: Lines 73-81 (Summary Tab Features)
    - Props: `savedItem`, `source` ('upload' or 'extension')
    - Layout: Format selector top, summary display below, action buttons bottom
    - Two modes: Interactive (upload) vs View-only (extension)
  - [x] 16.2 Implement format selector dropdown
    - Spec reference: Line 73 (Format selector dropdown: "Short", "Topics", "Q&A")
    - Options: "Short", "Topics", "Q&A"
    - Changes displayed summary when selected
    - Active format highlighted with green accent (#22c55e)
    - Dropdown design: Dark background, pill-shaped buttons
  - [x] 16.3 Implement Generate button (upload mode only)
    - Spec reference: Lines 74-75 (Generate button visible only for source='upload')
    - Visible only when `source='upload'`
    - Click calls `generateSummary(videoId, format)`
    - Loading state: "Generating summary..." text
    - Cache generated summary per format (avoid regenerating)
    - Show error message if generation fails
  - [x] 16.4 Build summary display with Markdown rendering
    - Spec reference: Line 75 (Display: Markdown rendering with headers, bullet lists)
    - Render Markdown with headers (bold), bullet lists, line breaks
    - Custom markdown parser for structured formats
    - Text styling: White text, proper spacing (16px paragraph gap)
    - Scrollable content area
  - [x] 16.5 Implement action buttons (MODIFIED)
    - Spec reference: Line 77 (Export and Copy buttons)
    - Export button: Download summary as **Markdown file only (PDF removed)**
    - Copy button: Copy summary text to clipboard with visual feedback
    - Buttons: Secondary style (border only), horizontal layout
  - [x] 16.6 Implement view-only mode (extension items)
    - Spec reference: Line 79 (View-only mode for source='extension')
    - Hide Generate button for `source='extension'`
    - Show existing summary only
    - Export and copy still available

**Acceptance Criteria:**
- Format selector switches between Short/Topics/Q&A
- Generate button works for upload items only
- Summary displays with proper Markdown formatting
- Summaries cached per format
- Export and copy buttons work with visual feedback
- View-only mode prevents generation
- Loading state shows during generation

---

### Task Group 17: Chat Tab Implementation ✅ COMPLETED
**Dependencies:** Task Group 14

- [x] 17.0 Build Chat tab features
  - [x] 17.1 Create ChatTab component (integrated in SavedItemModal)
    - Spec reference: Lines 83-91 (Chat Tab Features)
    - Props: `savedItem`, `source` ('upload' or 'extension')
    - Layout: Suggested questions top, message list middle, input area bottom
    - Two modes: Interactive (upload) vs View-only (extension)
  - [x] 17.2 Implement suggested questions (upload mode only)
    - Spec reference: Line 83 (Suggested questions: 3 purple pill buttons)
    - Load questions via `getSuggestedQuestions(videoId)` on tab mount
    - Display 3 purple pill buttons
    - Clicking pill sends question automatically
    - Only show for `source='upload'` items
    - Pill design: Purple gradient (#a855f7 to #7c3aed), rounded pill (20px radius)
  - [x] 17.3 Build message list display
    - Spec reference: Line 84 (Message list: User messages right-aligned, Assistant left-aligned)
    - User messages: Purple gradient bubble, right-aligned, white text
    - Assistant messages: Gray bubble (#404040), left-aligned, white text
    - Message bubbles: Rounded corners (12px), 10-14px padding
    - Auto-scroll to latest message on new message (using refs)
  - [x] 17.4 Implement chat input area
    - Spec reference: Line 85 (Input area: Textarea with Send button)
    - Textarea: Multi-line input (max 4 rows), fixed height
    - Send button: Green gradient, disabled when empty or loading
    - Input design: Dark background, white text, rounded corners
    - Enter key sends message, Shift+Enter adds line break
  - [x] 17.5 Implement interactive chat (upload mode)
    - Spec reference: Line 86 (Interactive mode: source='upload' can send messages)
    - Send button calls `sendChatMessage(videoId, message, chatHistory)`
    - Update message list with user message immediately
    - Show loading indicator while assistant responds
    - Append assistant response to message list
    - Handle errors with error message in chat
  - [x] 17.6 Implement view-only mode (extension items)
    - Spec reference: Line 87 (View-only mode: source='extension' shows existing chat only)
    - Show existing chat history only
    - Disable textarea and send button
    - Display message below input: "Chat only available for uploaded videos"
    - Message design: Gray background, centered text
  - [x] 17.7 Implement empty state
    - Spec reference: Line 88 (Empty state: Chat bubble icon with message)
    - Show when no chat history exists
    - Center-aligned chat bubble icon (💬)
    - Message: "Ask questions about this video"
    - Only show in interactive mode

**Acceptance Criteria:**
- Suggested questions load and send messages correctly
- Message list displays user/assistant messages with proper styling
- Auto-scroll works when new messages added (using refs)
- Input area works with send button and Enter key
- Interactive mode sends messages successfully
- View-only mode disables input with message
- Empty state shows when no messages exist
- Layout matches modal specifications

---

## Phase 4: Polish & Testing (Week 4) - SIMPLIFIED

### 🔄 Task Group 18: Animations & Transitions - DEPRIORITIZED TO V2
**Dependencies:** All previous task groups
**Status:** Basic hover effects only, advanced animations moved to V2

---

### Task Group 19: Error Handling & Edge Cases
**Dependencies:** Task Group 18

- [ ] 19.0 Implement comprehensive error handling
  - [ ] 19.1 Add API error handling
  - [ ] 19.2 Implement extraction error states
  - [ ] 19.3 Add modal error handling
  - [ ] 19.4 Implement loading states
  - [ ] 19.5 Add validation feedback

---

### ❌ Task Group 20: Responsive Design Implementation - DEPRIORITIZED TO V2
**Dependencies:** Task Group 19
**Reason:** Desktop-only approach (1024px+)

---

### ❌ Task Group 21: Test Coverage & Quality Assurance - DEPRIORITIZED TO V2
**Dependencies:** Task Group 20
**Reason:** Manual QA only for MVP, add automated tests in V2

---

## Execution Order (REVISED Feb 2026)

**Recommended implementation sequence:**

1. **Phase 1: Foundation (Week 1)** - Task Groups 1-4 ✅ COMPLETED
   - Set up project, routing, authentication, landing page

2. **Phase 2: Dashboard (Week 2)** - Task Groups 5-8 (MODIFIED) ✅ COMPLETED
   - API service, type definitions, dashboard layout, video grid with pagination, basic filters

3. **Phase 3: Modal (Week 3)** - Task Groups 14-17 (MODIFIED) ✅ COMPLETED
   - Modal foundation, transcript tab, summary tab, chat tab
   - **Modified**: Export MD only (no PDF/TXT)

4. **Phase 4: Polish (Week 4)** - Task Groups 18-19 (SIMPLIFIED) ⏳ IN PROGRESS
   - Basic error handling, loading states, hover effects
   - **Removed**: Advanced animations, mobile responsiveness, automated tests

---

## DEPRIORITIZED TASK GROUPS (Moved to V2)

The following task groups are **NOT in V1 scope** and have been deprioritized:

### ❌ Task Group 9: Filter Bar Implementation
### ❌ Task Group 10: Library Page Layout
### ❌ Task Group 11: Library Table Implementation
### ❌ Task Group 12: Library Card View (Mobile)
### ❌ Task Group 13: Export Functionality (PDF/TXT)
### ❌ Task Group 18: Animations & Transitions
### ❌ Task Group 20: Responsive Design Implementation
### ❌ Task Group 21: Test Coverage & Quality Assurance

---

## Implementation Summary

### ✅ COMPLETED - Task Groups 1-8, 14-17
**Total Completed:** 17 task groups covering:
- Project setup and configuration
- Routing and navigation
- Authentication implementation
- Landing page
- Dashboard with URL extraction
- Video grid with pagination
- Modal foundation (slide-out, 600px × 800px)
- Transcript tab (search, copy, export MD)
- Summary tab (format selector, generate, copy, export MD)
- Chat tab (suggested questions, interactive mode, auto-scroll)

### ⏳ IN PROGRESS - Task Groups 18-19
**Remaining Work:**
- Error handling improvements
- Loading states
- Basic hover effects

### ❌ DEPRIORITIZED - Task Groups 9-13, 18, 20-21
**Moved to V2:**
- Advanced filters
- Library table view
- PDF/TXT export
- Advanced animations
- Mobile responsiveness
- Automated tests

---

## Final Scope Reminder (REVISED Feb 2026)

### IN SCOPE - V1 Implementation ✅
- ✅ Google OAuth authentication
- ✅ Single URL extraction with auto-save
- ✅ Dashboard with 9-card grid + pagination
- ✅ Modal with 3 tabs (Transcript, Summary, Chat)
- ✅ Interactive mode for upload items (generate summary, chat)
- ✅ View-only mode for extension items
- ✅ Markdown export only (no PDF/TXT)
- ✅ Desktop-only (1024px+)
- ✅ Copy to clipboard functionality
- ✅ Search with highlight in transcript
- ✅ Auto-scroll for chat messages
- ✅ Source-based interactivity (upload vs extension)

### OUT OF SCOPE - V1 (Moved to V2)
These features are **NOT included in V1** to prevent scope creep:

- Batch URL processing UI (completely hidden)
- Email/password authentication (Google OAuth only)
- Library table view (Dashboard pagination sufficient)
- PDF/TXT export (Markdown export only)
- Advanced animations (Basic hover effects only)
- Mobile responsiveness (Desktop-only 1024px+)
- Automated tests (Manual QA only)

---

## Deployment Guide

**Deployment Documentation:** See [BACKEND.md](../../../BACKEND.md) for complete deployment instructions.

### Quick Reference: Production URLs

When deploying to Railway, update these URLs in `extension/src/config.ts`:

```typescript
const defaultBackendUrl = isDevelopment
  ? 'http://localhost:8000'
  : 'https://mintclip-api-production.up.railway.app'; // Replace with actual backend URL

const defaultWebAppUrl = isDevelopment
  ? 'http://127.0.0.1:5173'
  : 'https://mintclip-webapp-production.up.railway.app'; // Replace with actual web app URL
```

### Deployment Steps

1. **Backend (Railway)**
   - Deploy from GitHub with root directory `backend`
   - Add environment variables from `backend/.env.example`
   - Configure Supabase connection
   - Set up Google OAuth redirect URIs

2. **Extension (Chrome Web Store)**
   - Update `extension/src/config.ts` with production URLs
   - Run `npm run build` in extension directory
   - Package and submit to Chrome Web Store

3. **Web App (Railway)**
   - Deploy from GitHub with root directory `web-app`
   - Add `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID` env vars
   - Update backend CORS settings

4. **Post-Deployment**
   - Test health checks: `curl https://[backend-url]/api/health`
   - Verify OAuth flow works
   - Test extension Dashboard button opens web app
   - Monitor logs in Railway dashboard

### Environment Variables Checklist

**Backend:**
- [ ] `GEMINI_API_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `GOOGLE_OAUTH_CLIENT_ID`
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET`
- [ ] `FRONTEND_URL` (web app URL)

**Extension:**
- [ ] `VITE_BACKEND_URL` (production backend URL)
- [ ] `VITE_WEBAPP_URL` (production web app URL)

**Web App:**
- [ ] `VITE_API_BASE_URL` (production backend URL)
- [ ] `VITE_GOOGLE_CLIENT_ID`

For detailed instructions, see [BACKEND.md](../../../BACKEND.md).
