# Mintclip Web App Implementation Plan

## Executive Summary

Create a standalone web application that reuses 95% of existing frontend components and backend services from the Chrome extension. The architecture prioritizes minimal changes to existing code while adding web-specific features (authentication, storage, batch processing).

---

## V1 Features

### Core Functionality
1. **Single URL Processing** - Accept YouTube video URL, generate transcript/summary
2. **Batch URL Processing** - Accept up to 10 URLs at once for bulk processing
3. **All Extension Features** - Transcript, Summary (3 formats), Chat, Translation
4. **Storage Management** - Save, delete, download transcripts/summaries (native storage)
5. **Viewing Experience** - Slide-out modal (Dropbox-style) for viewing transcripts

### What's NOT in V1
- Multi-video chat (deferred to V2)
- Cloud storage integration (Dropbox/Google Drive) - use native storage instead
- Collections/folders organization
- Advanced search across videos

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Web App Frontend (New)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Home       │  │   Dashboard  │  │   Viewer     │      │
│  │  (URL Input) │  │ (Video List) │  │ (Modal View) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                ┌───────────▼───────────┐                     │
│                │  Shared Components    │                     │
│                │ (Reused from          │                     │
│                │  extension/src/)      │                     │
│                └───────────┬───────────┘                     │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│              Backend API (Enhanced Existing)                │
│  Existing Routes: /api/transcript, /api/summary, /api/chat│
│  New Routes: /api/auth/*, /api/videos/*, /api/batch/*      │
└────────────────────────────────────────────────────────────┘
```

---

## Component Reuse Strategy

### Frontend - Direct Reuse (0 modifications)
- [TranscriptTab.tsx](extension/src/content/components/TranscriptTab.tsx) - Full transcript display with search
- [SummaryTab.tsx](extension/src/content/components/SummaryTab.tsx) - All 3 summary formats + export
- [ChatTab.tsx](extension/src/content/components/ChatTab.tsx) - Chat interface
- [TabNavigation.tsx](extension/src/content/components/TabNavigation.tsx) - Tab switching
- [LoadingSpinner.tsx](extension/src/content/components/LoadingSpinner.tsx) - Loading states
- [ErrorToast.tsx](extension/src/content/components/ErrorToast.tsx) - Error handling

### Frontend - New Wrapper Components
- **VideoModal.tsx** - Slide-out modal wrapper (Dropbox-style)
- **VideoCard.tsx** - Thumbnail + metadata display
- **URLInput.tsx** - Single URL input
- **BatchURLInput.tsx** - Multi-URL input (max 10)
- **DashboardPage.tsx** - Grid of saved videos
- **VideoGrid.tsx** - Responsive grid layout

### Backend - Direct Reuse (0 modifications)
- [transcript_extractor.py](backend/app/services/transcript_extractor.py) - Works as-is
- [gemini_client.py](backend/app/services/gemini_client.py) - Works as-is
- [cache.py](backend/app/services/cache.py) - Enhance with Redis
- [/api/transcript](backend/app/routes/transcript.py) - No changes
- [/api/summary](backend/app/routes/summary.py) - No changes
- [/api/chat](backend/app/routes/chat.py) - No changes

### Backend - New Services
- **auth_service.py** - JWT authentication
- **user_service.py** - User management
- **video_service.py** - Video CRUD operations
- **storage_service.py** - File export/download management
- **batch_service.py** - Async batch processing

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### Backend Tasks
1. **Database Setup**
   - Install PostgreSQL + create `mintclip` database
   - Set up SQLAlchemy models (`backend/app/models/`)
   - Create Alembic migrations
   - Files to create:
     - `backend/app/models/user.py`
     - `backend/app/models/video.py`
     - `backend/app/database/connection.py`

2. **Authentication**
   - Implement JWT auth service
   - Create auth routes (`/api/auth/register`, `/api/auth/login`)
   - Add auth middleware to protect routes
   - Files to create:
     - `backend/app/services/auth_service.py`
     - `backend/app/routes/auth.py`

3. **CORS Update**
   - Update [main.py:32](backend/app/main.py#L32) to allow web app origins
   - Change from `chrome-extension://*` to specific web domains

#### Frontend Tasks
1. **Project Setup**
   - Initialize Vite + React project in `/web-app/`
   - Install dependencies (React Router, TanStack Query, axios)
   - Set up Tailwind CSS
   - Create folder structure

2. **Shared Components**
   - Copy components from `/extension/src/content/components/`
   - Create `/web-app/src/components/shared/` directory
   - Copy files: TranscriptTab, SummaryTab, ChatTab, TabNavigation, LoadingSpinner, ErrorToast

3. **Core Pages**
   - Create HomePage with URL input
   - Create VideoModal wrapper component
   - Set up React Router
   - Files to create:
     - `web-app/src/pages/HomePage.tsx`
     - `web-app/src/components/layout/VideoModal.tsx`
     - `web-app/src/App.tsx`

**Deliverable:** User can sign up/login, paste YouTube URL, see video in modal with transcript

---

### Phase 2: Core Features (Week 3-4)

#### Backend Tasks
1. **Video Management**
   - Create video CRUD routes
   - Implement save/delete/list endpoints
   - Files to create:
     - `backend/app/services/video_service.py`
     - `backend/app/routes/videos.py`

2. **Batch Processing**
   - Create batch processing endpoint
   - Implement async task queue (Celery or asyncio)
   - Add progress tracking
   - Files to create:
     - `backend/app/services/batch_service.py`
     - `backend/app/routes/batch.py`

3. **Storage Service**
   - Implement file export (TXT, PDF, MD)
   - Add download endpoints
   - Set up local file storage
   - Files to create:
     - `backend/app/services/storage_service.py`
     - `backend/app/routes/storage.py`

#### Frontend Tasks
1. **Dashboard**
   - Create DashboardPage with video grid
   - Implement VideoCard component
   - Add search/filter functionality
   - Files to create:
     - `web-app/src/pages/DashboardPage.tsx`
     - `web-app/src/components/video/VideoCard.tsx`
     - `web-app/src/components/video/VideoGrid.tsx`

2. **Batch Processing UI**
   - Create BatchURLInput component (max 10 URLs)
   - Add progress tracking for batch jobs
   - Show results grid
   - Files to create:
     - `web-app/src/components/input/BatchURLInput.tsx`
     - `web-app/src/components/input/BatchProgress.tsx`

3. **Export Functionality**
   - Add export buttons (reuse from SummaryTab)
   - Implement download handler
   - Support TXT, PDF, Markdown formats

**Deliverable:** User can save videos, view dashboard, process multiple URLs, export files

---

### Phase 3: Polish (Week 5)

#### UI/UX Improvements
1. Responsive design (mobile support)
2. Dark/light mode toggle
3. Keyboard shortcuts
4. Better empty states
5. Loading skeletons
6. Error boundaries

#### Testing
1. End-to-end testing with Playwright
2. Unit tests for critical services
3. Load testing for batch processing

**Deliverable:** Production-ready V1

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Videos Table
```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id VARCHAR(20) NOT NULL,  -- YouTube video ID
    title VARCHAR(500),
    thumbnail_url TEXT,
    duration INTEGER,  -- Seconds
    transcript_language VARCHAR(10),
    has_summary BOOLEAN DEFAULT FALSE,
    has_chat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
```

### Video Files Table (for exports)
```sql
CREATE TABLE video_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL,  -- 'transcript', 'summary', 'pdf', 'txt', 'md'
    file_path TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Critical Implementation Details

### VideoModal Component Pattern
```typescript
// Reuse existing YouTubeSidebar component
import { YouTubeSidebar } from './shared/YouTubeSidebar';

export function VideoModal({ videoId, isOpen, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white">
        <YouTubeSidebar videoId={videoId} />
      </div>
    </div>
  );
}
```

### Batch Processing Cap
**Recommendation:** 10 URLs per batch for V1

**Rationale:**
- Low complexity (loop existing API calls)
- High user value (playlist processing)
- Free tier monetization potential
- Easy to implement with asyncio

### Storage Strategy
**V1: Native Storage** (Local filesystem or S3)
- Zero third-party dependencies
- Full control over data
- Simple implementation
- GDPR compliant

**V2: Cloud Storage Integration** (Dropbox/Google Drive)
- Add based on user feedback
- OAuth complexity not worth it for MVP

---

## Open Questions & Recommendations

### Q1: Should batch URL processing be V1 or V2?

**Recommendation: V1 with cap of 10 URLs**

**Rationale:**
- **Technical:** Low complexity - just loop existing `extract_transcript()` endpoint
- **User Value:** High - users want to process playlists
- **Cost:** Low - reuse all existing services
- **Implementation:** 3-4 days total
  - Batch URL input component: 1 day
  - Batch processing endpoint: 1 day
  - Progress tracking UI: 1-2 days

### Q2: Should chat function be V1 or future phase?

**Recommendation: V1 for single-video, V2 for multi-video**

**Rationale:**

**Single-Video Chat (V1):**
- **Implementation:** Zero work - ChatTab component already exists
- **User Value:** Medium-High
- **Verdict:** Include in V1 (it's free functionality)

**Multi-Video/Channel Chat (V2):**
- **Use Case:** "What do all these videos say about [topic]?"
- **Technical:** Requires RAG across multiple transcripts
- **Codebase:** You already have `pinecone_embeddings.py` and `hybrid_retrieval.py` - use them in V2!
- **Verdict:** Defer to V2 (requires collection concept, batch embedding, multi-document RAG)

---

## Dependencies

### Backend Additions
```txt
# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.13.0

# Authentication
pyjwt==2.8.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Cache (upgrade from in-memory)
redis==5.0.1

# Task Queue (for batch processing)
celery==5.3.4
```

### Frontend Additions
```json
{
  "dependencies": {
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.12.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  }
}
```

---

## File Structure

### New Backend Files
```
backend/app/
├── models/
│   ├── user.py          # NEW
│   ├── video.py         # NEW
│   └── storage.py       # NEW
├── routes/
│   ├── auth.py          # NEW
│   ├── videos.py        # NEW
│   ├── batch.py         # NEW
│   └── storage.py       # NEW
├── services/
│   ├── auth_service.py          # NEW
│   ├── user_service.py          # NEW
│   ├── video_service.py         # NEW
│   ├── storage_service.py       # NEW
│   └── batch_service.py         # NEW
└── database/
    ├── connection.py    # NEW
    └── migrations/      # NEW
```

### New Frontend Files
```
web-app/src/
├── components/
│   ├── shared/              # Reused from extension
│   │   ├── TranscriptTab.tsx
│   │   ├── SummaryTab.tsx
│   │   ├── ChatTab.tsx
│   │   └── TabNavigation.tsx
│   ├── layout/
│   │   └── VideoModal.tsx   # NEW - Slide-out wrapper
│   ├── video/
│   │   ├── VideoCard.tsx    # NEW
│   │   └── VideoGrid.tsx    # NEW
│   └── input/
│       ├── URLInput.tsx     # NEW
│       └── BatchURLInput.tsx # NEW
├── pages/
│   ├── HomePage.tsx         # NEW
│   ├── DashboardPage.tsx    # NEW
│   └── SettingsPage.tsx     # NEW
├── hooks/
│   ├── useVideoData.ts      # NEW
│   └── useAuth.ts           # NEW
└── services/
    └── api.ts               # NEW
```

---

## Verification & Testing

### End-to-End Testing Checklist
1. User can sign up with email/password
2. User can paste single YouTube URL
3. Video modal opens with transcript loaded
4. User can generate summary (all 3 formats)
5. User can chat with video content
6. User can save video to library
7. User can view all saved videos on dashboard
8. User can delete saved video
9. User can export transcript as TXT/PDF/MD
10. User can paste 10 URLs and process in batch
11. Batch processing shows progress
12. User can download batch results

### Manual Testing Commands
```bash
# Start backend
cd backend
uvicorn main:app --reload --port 8000

# Start frontend
cd web-app
npm run dev

# Run tests
npm run test
```

---

## Timeline Estimate

- **Week 1-2:** Foundation (auth, database, basic frontend)
- **Week 3-4:** Core features (save videos, dashboard, exports, batch)
- **Week 5:** Polish (UI/UX, testing, bug fixes)

**Total for V1:** 5 weeks to production-ready MVP

---

## Future Phases (V2+)

### V2 Features
- Multi-video chat across collections
- Dropbox/Google Drive integration
- Collections/folders organization
- Advanced search across videos
- Export entire collection as ZIP
- Scheduled exports
- Custom export templates

### V3 Features
- Mobile apps (iOS/Android)
- Collaboration features (share videos)
- AI-powered video recommendations
- Integration with video editors
- API for third-party integrations
