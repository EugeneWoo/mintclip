# Mintclip Web App Implementation Plan

## Executive Summary

Modern web application that matches provided design references exactly. Users sign in with Google OAuth, extract YouTube transcripts via single URL input, and manage their saved content in a library with table view. Design follows `landing-page-framer.html`, `dashboard-framer.html`, `library.html`, and `modal-mockup.html` pixel-perfect.

---

## V1 Scope (REVISED Feb 2026)

### Core Features
1. **Google OAuth Authentication** - Sign in with Google, JWT token storage ✅
2. **Single URL Processing** - Extract transcript from one YouTube URL at a time
3. **Dashboard with Pagination** - 9 cards visible, "Load More" button for next 10
4. **Interactive Modal** - Slide-out modal with 3 tabs (Transcript, Summary, Chat)
5. **Markdown Export Only** - MD export for all content types

### Source-Based Modes
- **`source='upload'`** (from web app URL extraction): Interactive - can generate summaries, chat
- **`source='extension'`** (from Chrome extension): View-only - cannot generate or chat

### What's NOT in V1
- ❌ **Library screen/table view** - Removed, use Dashboard only
- ❌ **Mobile responsiveness** - Desktop only (1024px+)
- ❌ **PDF & Text export** - Markdown export only
- ❌ **Batch URL processing** (hidden from UI per requirements)
- ❌ **Extension ↔ Webapp auth bridge** (not needed with Google OAuth)
- ❌ **Email/password authentication** (Google OAuth only)
- ❌ **Animations & transitions** (minimal hover effects only)
- ❌ **Automated tests** (manual QA only)

### V2 Candidates (Deprioritized)
- 🔄 Library table view with advanced filters
- Batch URL processing
- 🔄 Mobile responsive design
- 🔄 PDF export functionality
- 🔄 Advanced animations and transitions
- 🔄 Automated test coverage

---

## Design System

### Visual Design
- **Design References**: 3 HTML mockups (library.html removed)
  1. `landing-page-framer.html` - Hero, features, CTA
  2. `dashboard-framer.html` - Single URL input, video grid (9 cards + pagination)
  3. `modal-mockup.html` - Slide-out panel design

### Color Palette
```css
--bg-dark: #171717
--bg-elevated: #1f1f1f
--bg-card: #262626
--accent: #22c55e
--accent-light: #4ade80
--accent-hover: #16a34a
--text-primary: #ffffff
--text-secondary: #a3a3a3
--text-muted: #737373
--border: rgba(255, 255, 255, 0.08)
```

### Typography
- **Headings**: Plus Jakarta Sans (700-800 weight)
- **Body**: Inter (400-600 weight)
- **Code/Timestamps**: Inter monospace

### Component Patterns
- **Navigation**: Fixed, rounded pill (100px radius), blur backdrop
- **Buttons**: Primary (100px radius, green), Secondary (8-12px radius, border)
- **Cards**: 20px radius, subtle border, hover lift (-4px)
- **Modal**: Slide-out right, 600px width, 800px height, dark theme

---

## Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Routing**: React Router DOM v7
- **Styling**: Inline styles matching design references exactly
- **State**: React useState/useEffect (no complex state management needed)
- **HTTP Client**: Fetch API

### Backend Integration
- **Existing API**: Reuse all current FastAPI endpoints
- **Auth**: `/api/auth/google/code` - OAuth code exchange
- **Transcripts**: `/api/transcript/extract` - YouTube extraction
- **Summaries**: `/api/summary/generate` - AI summaries
- **Chat**: `/api/chat/message` + `/api/chat/suggested-questions`
- **Saved Items**: `/api/saved-items/*` - CRUD operations

### Database
- **Supabase**: Existing `saved_items` table (NO new tables)
- **Auth**: Supabase Auth (Google OAuth provider)
- **Storage**: JSONB content field for flexibility

---

## Pages & Routes

### 1. Landing Page (`/`)
**Component**: `Landing.tsx`
**Design**: `landing-page-framer.html`

**Sections**:
- Hero with logo, headline, Google OAuth button
- Feature cards: Transcripts, Summaries, Chat
- Footer with copyright

**Auth Flow**:
1. Click "Sign In with Google"
2. Redirect to Google OAuth consent
3. Return to `/auth/callback?code=...`
4. Exchange code for JWT tokens
5. Store in localStorage
6. Redirect to `/dashboard`

**Protected**: No (public landing page)

---

### 2. Auth Callback (`/auth/callback`)
**Component**: `AuthCallback.tsx`
**Design**: Loading spinner

**Flow**:
1. Extract `code` from URL params
2. POST to `/api/auth/google/code` with code
3. Receive JWT tokens + user info
4. Store in localStorage:
   - `mintclip_access_token`
   - `mintclip_refresh_token`
   - `mintclip_user` (JSON)
5. Navigate to `/dashboard`

**Error Handling**:
- Show error message if code exchange fails
- Auto-redirect to `/` after 3 seconds

**Protected**: No

---

### 3. Dashboard (`/dashboard`)
**Component**: `Dashboard.tsx`
**Design**: `dashboard-framer.html`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Navigation (fixed)                      │
├─────────────────────────────────────────┤
│ Page Header: "Welcome back, [Name]"    │
├─────────────────────────────────────────┤
│ URL Input Section                       │
│ ┌─────────────────────────────────────┐ │
│ │ [Paste YouTube URL...] [Extract]   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Filter Bar: [All][With Summary][Chat]  │
├─────────────────────────────────────────┤
│ Video Grid (4 columns, 9 cards)         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ │Card│ │Card│ │Card│ │Card│           │
│ └────┘ └────┘ └────┘ └────┘           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ │Card│ │Card│ │Card│ │Card│           │
│ └────┘ └────┘ └────┘ └────┘           │
│ ┌────┐ ┌────┐ ┌────┐                  │
│ │Card│ │Card│ │Card│                   │
│ └────┘ └────┘ └────┘                  │
│ [Load More Videos...]                  │
└─────────────────────────────────────────┘
```

**Features**:
- **Single URL Input** (batch UI hidden)
  - Validation: YouTube URL format
  - Extract button: Disabled when empty
  - Loading: "Extracting..." spinner
  - Error: Red text below input
  - **Duplicate Detection**: Checks if video_id already exists before extracting
    - If duplicate found: Shows confirmation dialog with video title and source (Extension/Uploaded)
    - Options: "OK" (delete existing + upload) or "Cancel" (keep existing, abort upload)
    - Prevents data conflicts from mixed sources

- **Video Cards** (9 visible, pagination for more)
  - Thumbnail (YouTube CDN)
  - Title (2-line ellipsis, tooltip on hover)
  - Badges: Transcript/Summary/Chat
  - Export MD button (hover)
  - Actions: View, Delete (on hover)
  - Created date

- **Filters**
  - All, With Summary, With Chat, Recent
  - Active: Green background
  - Search: Right-aligned

- **Pagination**
  - Show 9 cards initially (3 rows × 3 columns)
  - "Load More" button reveals next 10
  - Client-side pagination (all items loaded)

**Data Flow**:
```
User pastes URL
  ↓
Validate format
  ↓
Check if video_id already exists
  ↓ (if duplicate)
Show confirmation dialog:
"This video was already [Extension/Uploaded]:
[Video Title]

Do you want to replace it with a new upload?"
  ↓ (if confirmed)
DELETE /api/saved-items/video/{video_id}
  ↓ (always)
POST /api/transcript/extract
  ↓
Backend extracts + auto-translates
  ↓
POST /api/saved-items/save (source='upload')
  ↓
Card appears in grid
  ↓
User clicks "View" → Modal opens
```

**Protected**: Yes (redirects to `/` if not authenticated)

---

### 4. SavedItemModal (Slide-out)
**Component**: `SavedItemModal.tsx`
**Design**: `modal-mockup.html`

**Design Specs**:
- Width: 600px max
- Height: 800px (full screen)
- Position: Right side
- Animation: `translateX(100%)` → `translateX(0)` (0.3s)
- Background: #212121
- Overlay: rgba(0, 0, 0, 0.5)
- Close: ESC key or X button

**Header**:
- Video title (18px, bold, ellipsis)
- Close button (36x36)

**Tabs**:

**1. Transcript**
- Controls: Search, Language (read-only), Export MD
- Content: Paragraphs with timestamps
- Timestamps: Blue (#3ea6ff), clickable
- Grouping: 8 lines or punctuation breaks

**2. Summary**
- Controls: Format selector (Short/Topics/Q&A), Export MD
- Generate: Button (upload items only)
- Display: Markdown with headers, bold, lists
- Loading: "Generating..." spinner

**3. Chat**
- Suggested: 3 question pills (upload only)
- Messages: User (purple gradient), Assistant (gray)
- Input: Textarea + Send button
- Empty: 💬 icon + message
- Disabled: Extension items show "Chat only available for uploaded videos"

**Modes**:
- **Extension** (`source='extension'`): View-only
- **Upload** (`source='upload'`): Interactive (generate/chat)

**Triggered From**:
- Dashboard: "View" button on video card

---

## Data Schema

### Supabase saved_items Table (Existing)
```sql
CREATE TABLE public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    video_id TEXT NOT NULL,
    item_type TEXT NOT NULL,  -- 'transcript', 'summary', 'chat'
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    source TEXT DEFAULT 'extension',  -- 'extension' or 'upload'
    CONSTRAINT unique_user_video_type UNIQUE(user_id, video_id, item_type)
);
```

### Content JSONB Examples

**Transcript**:
```json
{
  "videoTitle": "Video Title",
  "videoThumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "savedAt": "2026-02-11T10:30:00Z",
  "language": "en",
  "text": "Full transcript text...",
  "segments": [
    {"timestamp": "0:00", "start_seconds": 0, "duration": 3.5, "text": "..."}
  ]
}
```

**Summary**:
```json
{
  "videoTitle": "Video Title",
  "videoThumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "savedAt": "2026-02-11T10:30:00Z",
  "format": "short",
  "summary": "Summary text...",
  "is_structured": true
}
```

**Chat**:
```json
{
  "videoTitle": "Video Title",
  "videoThumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "savedAt": "2026-02-11T10:30:00Z",
  "chat_history": [
    {"id": "1", "role": "user", "content": "Question?"},
    {"id": "2", "role": "assistant", "content": "Answer."}
  ],
  "suggested_questions": ["Q1?", "Q2?", "Q3?"]
}
```

---

## Implementation Phases (REVISED Feb 2026)

### Phase 1: Foundation (Week 1)
**Goal**: User can sign in and see dashboard

**Tasks**:
1. Setup Vite + React + TypeScript project
2. Install dependencies (react-router-dom only)
3. Create Landing page with Google OAuth button
4. Create AuthCallback handler
5. Setup routing with route protection
6. Test OAuth flow end-to-end

**Deliverables**:
- Landing page matches `landing-page-framer.html`
- OAuth flow completes successfully
- User redirects to Dashboard after sign-in

---

### Phase 2: Dashboard (Week 2)
**Goal**: User can extract YouTube videos and see paginated grid

**Tasks**:
1. Create Dashboard component matching `dashboard-framer.html`
2. Build URL input with validation
3. Integrate `/api/transcript/extract` endpoint
4. Auto-save extracted transcript to Supabase
5. Display video cards in 4-column grid
6. Add filter bar (All, With Summary, With Chat, Recent)
7. Implement search functionality
8. Add pagination (9 cards + "Load More" button)
9. Add Export MD button to each card
10. Add tooltip on hover for full video title

**Deliverables**:
- Single URL input (NO batch UI)
- Video cards display correctly (9 visible, pagination)
- Export MD button on each card
- Tooltip shows full title on hover
- Filters work in real-time
- Data loads from Supabase

---

### Phase 3: Modal (Week 3)
**Goal**: User can view and interact with saved items

**Tasks**:
1. Create SavedItemModal matching `modal-mockup.html`
2. Implement slide-out animation
3. Build Transcript tab with search + Export MD
4. Build Summary tab with format selector + Generate button
5. Build Chat tab with suggested questions
6. Add generate functionality (upload items only)
7. Implement view-only mode (extension items)
8. Add ESC key and overlay click to close

**Deliverables**:
- Modal slides in from right (0.3s)
- All 3 tabs work correctly
- Generate summary works for upload items
- Chat works for upload items
- Export MD available on all tabs
- Extension items are view-only

---

### Phase 4: Polish (Week 4)
**Goal**: Production-ready MVP (desktop only)

**Tasks**:
1. Add navigation component with blur effect
2. Implement basic hover effects on cards
3. Add loading states
4. Improve error messages
5. Add empty states
6. Fix any styling inconsistencies

**Deliverables**:
- Match to design references
- Basic hover effects
- No visual bugs or inconsistencies
- Desktop-only (1024px+)

---

## File Structure

```
web-app/
├── src/
│   ├── components/
│   │   ├── Landing.tsx              # Landing page (landing-page-framer.html)
│   │   ├── Dashboard.tsx            # Dashboard (dashboard-framer.html, single URL, pagination)
│   │   ├── VideoCard.tsx            # Card component for grid (with Export MD button)
│   │   ├── AuthCallback.tsx         # OAuth callback handler
│   │   └── modal/
│   │       └── SavedItemModal.tsx   # Slide-out modal (modal-mockup.html)
│   ├── utils/
│   │   ├── auth.ts                  # Token storage/retrieval (localStorage)
│   │   ├── api.ts                   # Backend API client (fetch)
│   │   └── youtube.ts               # URL validation, thumbnail helpers
│   ├── App.tsx                      # Router + auth protection
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Global styles (dark theme)
├── public/
│   └── icon-48.png                  # Logo for navigation
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Dependencies

### package.json
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.13.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.2",
    "vite": "^6.0.1"
  }
}
```

**Note**: Intentionally minimal dependencies. No state management, UI libraries, or CSS frameworks needed.

---

## Testing Plan

### Manual Testing Checklist

**Landing Page**:
- [ ] Logo and headline display correctly
- [ ] Google OAuth button works
- [ ] Redirects to Google consent screen
- [ ] Returns to /auth/callback with code

**Auth Callback**:
- [ ] Exchanges code for JWT tokens
- [ ] Stores tokens in localStorage
- [ ] Redirects to /dashboard
- [ ] Handles errors gracefully

**Dashboard**:
- [ ] Single URL input displays
- [ ] Validates YouTube URL format
- [ ] Extract button disabled when empty
- [ ] Extraction shows loading state
- [ ] Card appears after extraction
- [ ] Duplicate video detection shows confirmation dialog
- [ ] Duplicate upload cancels correctly when user clicks "Cancel"
- [ ] Duplicate upload replaces existing video when user clicks "OK"
- [ ] Filters work (All, With Summary, etc.)
- [ ] Search filters cards in real-time
- [ ] "View" button opens modal
- [ ] "Delete" button removes card

**Library**:
- [ ] Table displays all saved items
- [ ] Thumbnails load correctly
- [ ] Content badges show correctly (T/S/C)
- [ ] Type filter works (All, Individual, Batch)
- [ ] Content filter works (All, Transcript, etc.)
- [ ] Sort works (Recent, Oldest, A-Z)
- [ ] Search filters table in real-time
- [ ] Export dropdown shows formats
- [ ] Batch items show 2x2 grid
- [ ] Export disabled for batch (with tooltip)
- [ ] Mobile switches to card layout

**Modal**:
- [ ] Slides in from right (smooth animation)
- [ ] Transcript tab shows paragraphs
- [ ] Timestamps are clickable (blue)
- [ ] Summary tab shows format selector
- [ ] Generate button (upload items only)
- [ ] Chat tab shows suggested questions (upload)
- [ ] Chat input works (upload items)
- [ ] Extension items are view-only
- [ ] ESC key closes modal
- [ ] Overlay click closes modal
- [ ] X button closes modal

---

## Timeline

- **Week 1**: Foundation (OAuth, routing, landing page)
- **Week 2**: Dashboard (single URL input, video grid)
- **Week 3**: Library (table view, filters)
- **Week 4**: Modal (slide-out, tabs, interactions)
- **Week 5**: Polish (animations, responsive, testing)

**Total**: 5 weeks to production-ready V1

---

## Out of Scope for V1

### Features NOT Included (Removed for V1 Scope Reduction)
- ❌ **Library table view** - Use Dashboard only
- ❌ **Mobile responsiveness** - Desktop only (1024px+)
- ❌ **PDF & Text export** - Markdown export only
- ❌ **Advanced animations** - Basic hover effects only
- ❌ **Automated tests** - Manual QA only

### V2 Candidates (Deprioritized from Original Spec)
- 🔄 Library table view with advanced filters (Task Groups 10-13)
- 🔄 Mobile responsive design (Task Group 20)
- 🔄 PDF export functionality (Task Group 13)
- 🔄 Advanced animations and transitions (Task Group 18)
- 🔄 Automated test coverage (Task Group 21)

### Why These Are Out
- **Library screen**: Dashboard pagination sufficient for MVP
- **Mobile**: Desktop-first approach, add mobile in V2 based on usage
- **PDF export**: MD export sufficient for LLM pasting (primary use case)
- **Animations**: Nice-to-have, not essential for MVP
- **Tests**: Manual QA faster for small team, add tests as codebase grows

---

## Success Criteria

### V1 Launch Requirements
✅ Landing page matches `landing-page-framer.html` exactly
✅ Dashboard matches `dashboard-framer.html` exactly (single URL only)
✅ Library matches `library.html` exactly (table view)
✅ Modal matches `modal-mockup.html` exactly (slide-out)
✅ Google OAuth works end-to-end
✅ Single URL extraction works
✅ Saved items load from Supabase
✅ Filters and search work correctly
✅ Generate summary works (upload items)
✅ Chat works (upload items)
✅ Extension items are view-only
✅ Responsive design works on mobile

### Performance Targets
- Page load: < 2 seconds
- OAuth flow: < 5 seconds
- Transcript extraction: < 5 seconds
- Modal open: < 0.3 seconds
- Filter response: Instant

### Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions

---

## Authentication Behavior (Final)

### User Experience
- **Login Flow**: User clicks "Sign In with Google" → Redirects to Google OAuth → Lands on Dashboard
- **Session Duration**: User stays logged in for **30 days** without manual re-authentication
- **Seamless Token Refresh**: Access tokens automatically refresh in background every hour
- **Session Expiration**: After 30 days, user must sign in again with Google
- **Sign Out**: User can manually sign out, clearing all authentication state

### Expected Behavior
✅ **Google OAuth Works End-to-End**:
  - User redirects to Google consent screen
  - Backend exchanges authorization code for JWT tokens
  - Tokens stored securely with expiration timestamps
  - User redirected to Dashboard automatically

✅ **Automatic Token Refresh**:
  - Access tokens expire after 1 hour
  - System detects expiring tokens (1 minute buffer before expiry)
  - Automatically refreshes using refresh token
  - User experiences no interruption during active session

✅ **Persistent Sessions**:
  - Refresh tokens valid for 30 days
  - User stays logged in across browser sessions
  - Closing and reopening browser maintains authentication
  - No repeated login prompts during session lifetime

✅ **Graceful Session Expiration**:
  - When refresh token expires (30 days), user prompted to sign in again
  - Clear messaging: "Session expired. Please sign in again."
  - All authentication state cleared on sign out or expiration

✅ **Backend Always Available**:
  - Backend server running on port 8000
  - Health check endpoint responds: `http://localhost:8000/health`
  - All authentication endpoints accessible
  - CORS configured for web app origin

---

## Implementation Status (Updated)

### ✅ Completed Features
- React Router v7 setup with route protection
- Landing page with Google OAuth button matching `landing-page-framer.html`
- AuthCallback for OAuth code exchange with automatic token storage
- Automatic token refresh system (access token refreshed every hour)
- Token storage in localStorage with expiration timestamps
- Dashboard with single URL input matching `dashboard-framer.html`
- SavedItemModal matching `modal-mockup.html` design (slide-out, 600px width, 800px height)
- Library table view with filters matching `library.html`
- API client for backend integration (`web-app/src/utils/api.ts`)
- VideoCard component for dashboard grid
- YouTube URL validation helper

### 🚧 In Progress / Polish Needed
- Navigation component with blur effect (`backdrop-filter: blur(20px)`)
- Video card hover animations (`translateY(-4px)`)
- Modal slide-out animation refinement (0.3s ease-out)
- Export dropdown functionality (PDF, MD, TXT formats)
- Real-time search functionality in Library table
- Loading skeletons for cards and table
- Empty states for dashboard and library

### 📂 File Structure (Actual)
```
web-app/
├── src/
│   ├── components/
│   │   ├── Landing.tsx              ✅ Implemented
│   │   ├── Dashboard.tsx            ✅ Implemented (single URL only)
│   │   ├── Library.tsx              ✅ Implemented (table view)
│   │   ├── VideoCard.tsx            ✅ Implemented
│   │   ├── AuthCallback.tsx         ✅ Implemented (with auto-refresh)
│   │   └── modal/
│   │       └── SavedItemModal.tsx   ✅ Implemented
│   ├── utils/
│   │   ├── auth.ts                  ✅ Implemented (with auto-refresh)
│   │   ├── api.ts                   ✅ Implemented
│   │   └── youtube.ts               ✅ Implemented
│   ├── App.tsx                      ✅ Implemented
│   ├── main.tsx                     ✅ Implemented
│   └── index.css                    ✅ Implemented
├── public/
│   └── icon-48.png                  ✅ Added
├── package.json                     ✅ Configured
├── vite.config.ts                   ✅ Configured
└── tsconfig.json                    ✅ Configured
```

### 🧪 Testing Instructions

#### Local Setup
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd web-app
npm install
npm run dev  # Opens on http://localhost:5173
```

#### Test Flow
1. **Landing → Auth → Dashboard**
   - Visit http://localhost:5173
   - Click "Sign In with Google"
   - Complete OAuth (redirects to Google)
   - Returns to `/auth/callback?code=...`
   - Auto-redirects to `/dashboard`

2. **Test Automatic Token Refresh**
   - Use application for 1+ hours
   - Verify no "authentication failed" errors
   - Check browser console for "[Auth] Token refreshed successfully"
   - Access token should refresh seamlessly in background

3. **Extract Single URL**
   - Paste: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Click "Extract" → Loading spinner
   - Wait ~2-5 seconds
   - Card appears in grid with thumbnail, title, badges

4. **Modal Interaction (Upload Items)**
   - Click "View" on any card
   - Modal slides in from right (0.3s)
   - **Transcript tab**: View full text with timestamps
   - **Summary tab**: Click "Generate" → Loading → Markdown summary
   - **Chat tab**: Click suggested question OR type custom → Get AI response
   - Close: X button, ESC key, or overlay click

5. **Library View**
   - Navigate to `/library` via navigation
   - See table with all saved items
   - Filter by Type (Individual/Batch) and Content (Transcript/Summary/Chat)
   - Sort by Recent/Oldest/A-Z
   - Click "View" → Modal opens
   - Click "Delete" → Confirm → Item removed

### 📊 API Integration (Existing Backend)

All routes already implemented in FastAPI backend (`backend/app/routes/`):

**Auth Routes** (`auth.py`):
- `POST /api/auth/google/code` - Exchange OAuth code → JWT tokens
- `POST /api/auth/refresh` - Refresh access token (1hr expiry)
- `POST /api/auth/logout` - Invalidate tokens

**Transcript Routes** (`transcript.py`):
- `POST /api/transcript/extract` - Extract + auto-translate YouTube transcript

**Summary Routes** (`summary.py`):
- `POST /api/summary/generate` - Generate AI summary (short/topic/qa)

**Chat Routes** (`chat.py`):
- `POST /api/chat/message` - Send message, get AI response
- `POST /api/chat/suggested-questions` - Generate 3 suggested questions

**Saved Items Routes** (`saved_items.py`):
- `POST /api/saved-items/save` - Save/upsert item (quota checked)
- `GET /api/saved-items/list` - List all user's items
- `GET /api/saved-items/{video_id}/{item_type}` - Get specific item
- `DELETE /api/saved-items/{video_id}/{item_type}` - Delete item

### 🎨 Design System Implementation

#### Typography (Actual Fonts)
- **Headings**: Plus Jakarta Sans (700-800 weight) - loaded from Google Fonts
- **Body**: Inter (400-600 weight) - loaded from Google Fonts
- **Monospace**: Inter monospace for timestamps/code

#### Colors (CSS Variables)
```css
--bg-dark: #171717
--bg-elevated: #1f1f1f
--bg-card: #262626
--accent: #22c55e (primary green)
--accent-light: #4ade80
--accent-hover: #16a34a
--text-primary: #ffffff
--text-secondary: #a3a3a3
--text-muted: #737373
--border: rgba(255, 255, 255, 0.08)
```

#### Component Styles (Implemented)
- **Navigation**: Fixed top, `border-radius: 100px`, `backdrop-filter: blur(20px)`
- **Buttons**:
  - Primary: `border-radius: 100px`, green gradient (`#22c55e` → `#16a34a`)
  - Secondary: `border-radius: 8-12px`, border only
- **Cards**: `border-radius: 20px`, subtle border, hover: `transform: translateY(-4px)`
- **Modal**: Slide-out right, max-width 600px, height 800px, bg #212121

### 🔑 Key Requirements Verified

✅ **Design Fidelity**: All components match HTML mockups pixel-perfect
✅ **Single URL Only**: Batch processing UI completely hidden from dashboard
✅ **Google OAuth Primary**: Direct OAuth flow (no extension bridge needed)
✅ **Library Table View**: Desktop shows full table, mobile switches to cards
✅ **Modal Slide-out**: Matches `modal-mockup.html` exactly (600px × 800px)
✅ **Source Field Distinction**: `source='upload'` enables interactive features, `source='extension'` is view-only
✅ **Interactive Mode**: Upload items allow Generate Summary and Chat
✅ **View-Only Mode**: Extension items show disabled state with tooltips
✅ **Supabase Integration**: Loads actual data from `saved_items` table
✅ **Minimal Dependencies**: Only `react-router-dom` v7 (no UI libraries)

### ⚠️ Known Limitations & Future Work

**Not in V1 (By Design)**:
- ❌ Batch URL processing UI (hidden per requirements)
- ❌ Extension ↔ Webapp token sharing (not needed with Google OAuth)
- ❌ Email/password authentication (Google OAuth only)
- ❌ Multi-video chat across collections
- ❌ Cloud storage integration (Dropbox/Google Drive)
- ❌ Collections/folders organization
- ❌ Advanced search across videos

**Polish Needed (Before Production)**:
- ⚠️ Loading skeletons for cards and tables
- ⚠️ Empty state illustrations
- ⚠️ Error boundary for API failures
- ⚠️ Toast notifications for actions (save/delete)
- ⚠️ Keyboard shortcuts (Cmd+K for search)
- ⚠️ Export functionality (PDF/MD/TXT generation)

### 📝 Notes

- **Design Fidelity**: Match HTML mockups pixel-perfect
- **No Batch UI**: Completely hidden from dashboard
- **Minimal Dependencies**: Only React Router, no bloat
- **Existing Backend**: Reuse all current endpoints
- **Existing Database**: Use saved_items table as-is
- **Dark Theme**: Primary design throughout
- **Mobile First**: Responsive from the start
- **No Extension Bridge**: Web app uses Google OAuth directly, not token sharing with extension
- **Actual Data**: All components load from `saved_items` table in Supabase
