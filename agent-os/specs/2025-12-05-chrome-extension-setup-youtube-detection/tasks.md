# Task Breakdown: Chrome Extension Setup & YouTube Page Detection

## Overview
Total Tasks: 6 task groups

## Task List

### Extension Foundation

#### Task Group 1: Manifest & Basic Structure
**Dependencies:** None

- [x] 1.0 Complete extension foundation
  - [x] 1.1 Write 2-8 focused tests for manifest and permissions validation
    - Test manifest V3 structure
    - Test required permissions are declared
    - Test extension loads without errors
    - Limit to 2-8 highly focused tests maximum
  - [x] 1.2 Create manifest.json with Manifest V3 structure
    - Version, name, description, icons
    - Permissions: `activeTab`, `storage`, `identity`
    - Host permissions: `*://*.youtube.com/*`
    - Content scripts configuration
    - Background service worker configuration
    - Action (toolbar icon) configuration
  - [x] 1.3 Set up extension project structure
    - Create folders: `content`, `background`, `popup`, `assets`
    - Set up TypeScript configuration
    - Configure build tools (webpack/vite for extension bundling)
    - Set up React build pipeline for content scripts
  - [x] 1.4 Configure extension icons and assets
    - Create icon assets (16x16, 48x48, 128x128)
    - Set up icon paths in manifest
  - [x] 1.5 Ensure extension foundation tests pass
    - Run ONLY the 2-8 tests written in 1.1
    - Verify manifest validates correctly
    - Verify extension loads in Chrome
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 1.1 pass
- Manifest V3 structure is valid
- Extension loads in Chrome without errors
- All required permissions are declared
- Project structure is organized

### Content Scripts & YouTube Detection

#### Task Group 2: Page Detection & UI Injection
**Dependencies:** Task Group 1

- [x] 2.0 Complete content scripts and detection
  - [x] 2.1 Write 2-8 focused tests for YouTube page detection
    - Test URL pattern matching (watch, shorts, @, channel)
    - Test SPA navigation detection
    - Test content script injection triggers
    - Limit to 2-8 highly focused tests maximum
  - [x] 2.2 Create YouTube page detection logic
    - URL pattern matcher for: `youtube.com/watch*`, `youtube.com/shorts/*`, `youtube.com/@*`, `youtube.com/channel/*`
    - SPA navigation listener (handle YouTube's client-side routing)
    - Detection state management
  - [x] 2.3 Implement content script entry point
    - Content script that runs on YouTube pages
    - Detection trigger logic
    - Cleanup on navigation
  - [x] 2.4 Create shadow DOM container setup
    - Shadow root creation and mounting
    - Style isolation from YouTube CSS
    - Container positioning (right side, overlay)
  - [x] 2.5 Implement floating button component
    - Floating button UI (minimal MVP design)
    - Toggle on/off functionality
    - Position on right side of page
    - Avoid interfering with YouTube controls
  - [x] 2.6 Ensure content scripts tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify detection works on all URL patterns
    - Verify shadow DOM isolation
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 2.1 pass
- All YouTube URL patterns are detected correctly
- SPA navigation is handled
- Shadow DOM isolates styles properly
- Floating button appears and toggles correctly

### Background Service Worker

#### Task Group 3: Service Worker & API Communication
**Dependencies:** Task Group 1

- [x] 3.0 Complete background service worker
  - [x] 3.1 Write 2-8 focused tests for service worker functionality
    - Test API communication with backend
    - Test message passing with content scripts
    - Test state management
    - Limit to 2-8 highly focused tests maximum
  - [x] 3.2 Create background service worker entry point
    - Service worker setup and lifecycle
    - Event listeners for extension events
  - [x] 3.3 Implement API communication layer
    - Backend API client (fetch/axios)
    - Transcript fetching endpoint integration
    - Gemini API proxy calls (via backend)
    - Error handling and retries
  - [x] 3.4 Implement message passing system
    - Chrome runtime message API setup
    - Communication between content scripts and service worker
    - Message types and handlers
  - [x] 3.5 Create state management
    - Extension state storage (chrome.storage)
    - User preferences management
    - Lightweight transcript caching
    - Authentication state persistence
  - [x] 3.6 Implement streaming transcript support
    - Stream handling for real-time transcript display
    - Data chunk processing
  - [x] 3.7 Ensure service worker tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify API communication works
    - Verify message passing functions correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 3.1 pass
- Service worker handles API calls correctly
- Message passing works between components
- State is persisted correctly
- Streaming transcript data flows properly

### UI Components

#### Task Group 4: React UI Components
**Dependencies:** Task Groups 2, 3

- [ ] 4.0 Complete UI components
  - [ ] 4.1 Write 2-8 focused tests for UI components
    - Test tab switching
    - Test component rendering in shadow DOM
    - Test user interactions
    - Limit to 2-8 highly focused tests maximum
  - [ ] 4.2 Set up React in shadow DOM
    - React app mounting in shadow root
    - React Router or tab state management
    - Styling setup (Tailwind CSS or CSS modules)
  - [ ] 4.3 Create side panel container component
    - Panel layout and structure
    - Toggle open/close functionality
    - Responsive sizing
  - [ ] 4.4 Implement tab navigation component
    - Tab bar with Transcript, Summary, Chat tabs
    - Tab switching logic
    - Active tab indicator
  - [ ] 4.5 Create Transcript tab component
    - Streaming transcript display with timestamps
    - Scrollable transcript view
    - Search functionality within transcript
    - Copy button for transcript text
  - [ ] 4.6 Create Summary tab component
    - Summary display area
    - Format selector (Q&A / Listicle toggle)
    - Detail level selector (Short / Detailed toggle)
    - Focus options (Insightful / Actionable / Funny buttons)
    - Share button with dropdown menu:
      - Copy section: "Copy Link", "Copy Text"
      - Export section: "Export as Text", "Export as Doc", "Export as PDF", "Export as Markdown"
    - Copy button for quick text copying
  - [ ] 4.7 Create Chat tab component
    - Chat interface layout
    - Message input field
    - Message display with timestamp references
    - Chat history
  - [ ] 4.8 Implement loading and error states
    - Loading indicators for API calls
    - Error toast notifications
    - Graceful error handling UI
  - [ ] 4.9 Apply minimal MVP styling
    - Follow shadcn/ui component patterns
    - Use Tailwind CSS for styling
    - Dark theme to match YouTube
    - Minimal polish (focus on functionality)
  - [ ] 4.10 Ensure UI component tests pass
    - Run ONLY the 2-8 tests written in 4.1
    - Verify all tabs render correctly
    - Verify user interactions work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 4.1 pass
- All three tabs (Transcript, Summary, Chat) render correctly
- Tab switching works smoothly
- Transcript displays with timestamps
- Summary tab has all configuration options
- Share and Copy buttons function correctly
- Chat interface is interactive
- Styling is isolated and doesn't conflict with YouTube

### Authentication Flow

#### Task Group 5: Sign Up & Authentication
**Dependencies:** Task Groups 1, 3

- [ ] 5.0 Complete authentication flow
  - [ ] 5.1 Write 2-8 focused tests for authentication
    - Test sign up page rendering
    - Test Google OAuth flow
    - Test authentication state persistence
    - Limit to 2-8 highly focused tests maximum
  - [ ] 5.2 Create popup/sign up page component
    - Sign up page UI (opens when extension icon clicked)
    - Google Auth button
    - Other auth options (if applicable)
    - Login/registration form
  - [ ] 5.3 Implement Google OAuth integration
    - Chrome identity API setup
    - OAuth flow implementation
    - Token handling and storage
  - [ ] 5.4 Create authentication state management
    - Check authentication status on extension load
    - Persist auth state
    - Handle auth state changes
  - [ ] 5.5 Implement extension icon click handler
    - Open sign up page if not authenticated
    - Open settings/preferences if authenticated
    - Badge indicator when on processable YouTube page
  - [ ] 5.6 Add authentication gating
    - Require authentication before full functionality
    - Show appropriate UI states for unauthenticated users
  - [ ] 5.7 Ensure authentication tests pass
    - Run ONLY the 2-8 tests written in 5.1
    - Verify OAuth flow works
    - Verify auth state persists
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 5.1 pass
- Sign up page opens when icon clicked (if not authenticated)
- Google OAuth flow completes successfully
- Authentication state persists across sessions
- Extension functionality is gated by authentication
- Badge shows on processable pages

### Testing

#### Task Group 6: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review existing tests and fill critical gaps only
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review the 2-8 tests written by extension-foundation (Task 1.1)
    - Review the 2-8 tests written by content-scripts (Task 2.1)
    - Review the 2-8 tests written by service-worker (Task 3.1)
    - Review the 2-8 tests written by ui-components (Task 4.1)
    - Review the 2-8 tests written by authentication (Task 5.1)
    - Total existing tests: approximately 10-40 tests
  - [x] 6.2 Analyze test coverage gaps for THIS feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
    - Consider: full extension flow from detection to UI display, authentication to transcript viewing
  - [x] 6.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new tests to fill identified critical gaps
    - Focus on integration points and end-to-end workflows
    - Test complete user flows: YouTube page → detection → UI injection → transcript fetch → display
    - Do NOT write comprehensive coverage for all scenarios
    - Skip edge cases, performance tests, and accessibility tests unless business-critical
  - [x] 6.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature (tests from 1.1, 2.1, 3.1, 4.1, 5.1, and 6.3)
    - Expected total: approximately 20-50 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 20-50 tests total)
- Critical user workflows for this feature are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on this spec's feature requirements
- End-to-end extension flow is tested

---

## Clickable Timestamps Feature Tasks (Added December 30, 2025)

### Overview
**Total Tasks:** 10 major tasks grouped into 3 phases

### Phase 1: Backend (Timestamp Injection in Summaries)

#### Task 1: Update Backend Prompt Instructions
**File:** `backend/app/prompts/summary.py`

**Subtasks:**
- [ ] 1.1 Remove "DO NOT include timestamps" instruction from line 17
- [ ] 1.2 Add instruction to include timestamps in `(MM:SS)` format
- [ ] 1.3 Add guideline to only timestamp substantial topics
- [ ] 1.4 Add examples showing proper timestamp usage
- [ ] 1.5 Update system instructions capitalization rule

**Acceptance Criteria:**
- [ ] `SYSTEM_INSTRUCTIONS` explicitly tells Gemini to include timestamps
- [ ] Format specified as `(MM:SS)` - e.g., "The speaker discusses authentication (05:23)"
- [ ] Clear guideline to only timestamp substantial topics
- [ ] Examples included in instructions showing proper format
- [ ] "Start immediately with content" rule preserved
- [ ] "Always capitalize first letter" rule preserved

**Testing Checklist:**
- [ ] Verify prompt compiles without syntax errors
- [ ] Confirm instructions are clear and unambiguous
- [ ] Test prompt with example transcript to verify timestamp format

#### Task 2: (Optional) Format Transcript with Timestamps for Gemini
**File:** `backend/app/routes/summary.py`

**Subtasks:**
- [ ] 2.1 Check if `request.transcript` is a list of segments or plain text
- [ ] 2.2 If list format, format each segment with timestamp prefix
- [ ] 2.3 Ensure formatting doesn't break existing functionality

**Acceptance Criteria:**
- [ ] Transcript formatted with `[MM:SS] ` prefix when segment data available
- [ ] Fallback to plain text if segment data unavailable
- [ ] Format maintains readability for Gemini
- [ ] Existing summary generation still works
- [ ] No breaking changes to current behavior

**Testing Checklist:**
- [ ] Test with array format transcript
- [ ] Test with plain text transcript
- [ ] Verify summary generation works with both formats
- [ ] Check that timestamps appear in generated summaries

### Phase 2: Frontend (Timestamp Parsing & Rendering)

#### Task 3: Add Timestamp Parsing Function
**File:** `extension/src/content/components/SummaryTab.tsx`

**Subtasks:**
- [ ] 3.1 Create `parseTimestamps(text: string)` function
- [ ] 3.2 Implement regex pattern `/\((\d{1,2}):(\d{2})\)/g`
- [ ] 3.3 Parse minutes and seconds from regex matches
- [ ] 3.4 Calculate totalSeconds for video seeking
- [ ] 3.5 Return array of typed parts (text or timestamp)
- [ ] 3.6 Export function for use in renderSummary

**Acceptance Criteria:**
- [ ] `parseTimestamps` function correctly identifies `(MM:SS)` patterns
- [ ] Extracts minutes and seconds accurately
- [ ] Calculates `totalSeconds = minutes * 60 + seconds`
- [ ] Returns array of objects with structure:
  ```typescript
  { type: 'text' | 'timestamp', text: string, seconds?: number }
  ```
- [ ] Handles edge cases:
  - No timestamps in text
  - Multiple timestamps in one line
  - Malformed timestamps (gracefully ignored)
- [ ] Preserves original text order and spacing

**Testing Checklist:**
- [ ] Test with single timestamp: "Discussion (05:23) about AI"
- [ ] Test with multiple timestamps: "Topic A (02:15), Topic B (07:30)"
- [ ] Test with no timestamps: "This is plain text"
- [ ] Test malformed: "This is (99:99) invalid"
- [ ] Verify regex doesn't match non-timestamp parentheses

#### Task 4: Update renderSummary to Render Clickable Timestamps
**File:** `extension/src/content/components/SummaryTab.tsx`

**Subtasks:**
- [ ] 4.1 Import `parseTimestamps` function
- [ ] 4.2 Modify line rendering logic to call `parseTimestamps`
- [ ] 4.3 Map over parts and detect timestamp type
- [ ] 4.4 Render timestamps as `<span>` with onClick handler
- [ ] 4.5 Apply styling: purple (#667eea), underlined, pointer cursor
- [ ] 4.6 Add `title` attribute for hover tooltip
- [ ] 4.7 Render text parts as plain strings
- [ ] 4.8 Maintain existing heading and bold text rendering

**Acceptance Criteria:**
- [ ] Timestamps rendered as clickable spans with cursor: pointer
- [ ] Timestamps styled with:
  - Color: #667eea (purple)
  - Font weight: 600 (semi-bold)
  - Text decoration: underline
- [ ] Hover tooltip shows: "Jump to {timestamp}"
- [ ] Clicking timestamp triggers `handleTimestampClick(seconds)`
- [ ] Non-timestamp text rendered normally
- [ ] Existing markdown rendering (headings, bold) still works
- [ ] No console errors or warnings

**Testing Checklist:**
- [ ] Render summary with timestamps in plain text
- [ ] Render summary with timestamps in heading line
- [ ] Render summary with timestamps in bold text
- [ ] Verify styling appears correctly in shadow DOM
- [ ] Test hover behavior with tooltip
- [ ] Verify cursor changes to pointer on hover

#### Task 5: Implement handleTimestampClick Function
**File:** `extension/src/content/components/SummaryTab.tsx`

**Subtasks:**
- [ ] 5.1 Create `handleTimestampClick(seconds: number)` function
- [ ] 5.2 Check if `onSeekVideo` callback prop exists
- [ ] 5.3 Call `onSeekVideo(seconds)` if available
- [ ] 5.4 Add console log for debugging

**Acceptance Criteria:**
- [ ] Function accepts `seconds` parameter (number type)
- [ ] Safely checks for `onSeekVideo` before calling
- [ ] Delegates video seeking to parent component
- [ ] No errors if `onSeekVideo` not provided
- [ ] Function is pure (no side effects except callback)

**Testing Checklist:**
- [ ] Call function with valid seconds value
- [ ] Verify callback is invoked correctly
- [ ] Test when `onSeekVideo` is undefined

#### Task 6: Add onSeekVideo Prop to SummaryTab Interface
**File:** `extension/src/content/components/SummaryTab.tsx`

**Subtasks:**
- [ ] 6.1 Add `onSeekVideo?: (seconds: number) => void` to interface
- [ ] 6.2 Mark as optional (not required for basic functionality)
- [ ] 6.3 Add JSDoc comment explaining usage

**Acceptance Criteria:**
- [ ] Interface includes `onSeekVideo` as optional property
- [ ] Type signature correctly specified: `(seconds: number) => void`
- [ ] Property is optional (can be undefined)
- [ ] TypeScript compiles without errors

#### Task 7: Implement YouTube Player Seeking in YouTubeSidebar
**File:** `extension/src/content/components/YouTubeSidebar.tsx`

**Subtasks:**
- [ ] 7.1 Create `handleSeekVideo(seconds: number)` function
- [ ] 7.2 Access YouTube player via `document.querySelector('video')`
- [ ] 7.3 Check if player element exists
- [ ] 7.4 Try YouTube iframe API methods first (`seekTo`, `playVideo`)
- [ ] 7.5 Fallback to HTML5 video API (`currentTime`, `play`)
- [ ] 7.6 Add error handling for missing player
- [ ] 7.7 Pass `handleSeekVideo` to SummaryTab component prop

**Acceptance Criteria:**
- [ ] Function successfully accesses YouTube video player
- [ ] Video seeks to specified timestamp (±0.5s acceptable)
- [ ] Video resumes playback after seeking
- [ ] Works with both YouTube iframe API and HTML5 video element
- [ ] Graceful error handling if player not found
- [ ] Function accessible from SummaryTab via prop

**Testing Checklist:**
- [ ] Test with short video (< 5 minutes)
- [ ] Test with long video (> 20 minutes)
- [ ] Test seeking to beginning (0:00-1:00)
- [ ] Test seeking to middle of video
- [ ] Test seeking to end of video
- [ ] Verify video plays after seeking
- [ ] Test with YouTube iframe player
- [ ] Test error case (player not found)

### Phase 3: Testing & Documentation

#### Task 8: Testing & Edge Case Handling
**Files:** All modified files

**Subtasks:**
- [ ] 8.1 Backend Testing
  - [ ] 8.1.1 Test summary generation with short video (< 2 min)
  - [ ] 8.1.2 Test summary generation with medium video (5-10 min)
  - [ ] 8.1.3 Test summary generation with long video (>20 min)
  - [ ] 8.1.4 Test with single-topic videos
  - [ ] 8.1.5 Test with multi-topic videos
  - [ ] 8.1.6 Verify timestamp format consistency
  - [ ] 8.1.7 Check timestamps are only added for substantial topics
  - [ ] 8.1.8 Verify no timestamps in opening/closing lines

- [ ] 8.2 Frontend Testing
  - [ ] 8.2.1 Test timestamp parsing with valid `(MM:SS)` format
  - [ ] 8.2.2 Test parsing with multiple timestamps per line
  - [ ] 8.2.3 Test parsing with no timestamps
  - [ ] 8.2.4 Test rendering timestamps in plain text
  - [ ] 8.2.5 Test rendering timestamps in headings (`###`, `##`)
  - [ ] 8.2.6 Test rendering timestamps in bold text
  - [ ] 8.2.7 Verify styling applies correctly
  - [ ] 8.2.8 Test hover tooltip displays

- [ ] 8.3 Integration Testing
  - [ ] 8.3.1 Test full flow: generate summary → timestamps appear → click → video seeks
  - [ ] 8.3.2 Test with video that has native English transcript
  - [ ] 8.3.3 Test with video that has AI-translated English
  - [ ] 8.3.4 Test seeking to beginning (0-60 seconds)
  - [ ] 8.3.5 Test seeking to middle of video
  - [ ] 8.3.6 Test seeking to end of video
  - [ ] 8.3.7 Test rapid clicking of multiple timestamps
  - [ ] 8.3.8 Verify video plays after seeking

- [ ] 8.4 Edge Case Testing
  - [ ] 8.4.1 Test with malformed timestamp: `(99:99)`
  - [ ] 8.4.2 Test with timestamp at 0 seconds: `(00:00)`
  - [ ] 8.4.3 Test with summary that has no timestamps
  [  ] 8.4.4 Test with very long timestamps list (>10 timestamps)
  [  ] 8.4.5 Test when YouTube player is not found
  [ ] 8.4.6 Test when `onSeekVideo` callback is undefined
  [ ] 8.4.7 Test seeking beyond video duration

**Acceptance Criteria:**
- [ ] All test scenarios pass without crashes
- [ ] Timestamps format consistently as `(MM:SS)`
- [ ] Only substantial topics have timestamps
- [ ] Clicking timestamps successfully seeks video
- [ ] Video plays after seeking
- [ ] No console errors in production build
- [ ] Edge cases handled gracefully
- [ ] User experience is smooth and intuitive

#### Task 9: Documentation & Cleanup
**Files:** `CLAUDE.md`, code comments

**Subtasks:**
- [ ] 9.1 Update `CLAUDE.md` with timestamp feature documentation
- [ ] 9.2 Add feature to "Completed Features" section
- [ ] 9.3 Document technical approach (Option 1 - Gemini-based)
- [ ] 9.4 Add code references with line numbers
- [ ] 9.5 Update example output section
- [ ] 9.6 Add troubleshooting section for timestamp issues
- [ ] 9.7 Remove debug console.log statements (or keep as warnings)
- [ ] 9.8 Add inline comments for complex logic

**Acceptance Criteria:**
- [ ] CLAUDE.md updated with feature description
- [ ] Feature listed in "Completed Features" section
- [ ] Implementation approach documented
- [ ] Key file locations and line numbers referenced
- [ ] Before/after examples included
- [ ] Troubleshooting section added
- [ ] Code is clean and well-commented
- [ ] No debug console.logs in production code

#### Task 10: Build Verification & Final Testing
**Files:** Extension build output

**Subtasks:**
- [ ] 10.1 Run `npm run build` in extension directory
- [ ] 10.2 Verify no TypeScript errors
- [ ] 10.3 Verify no build warnings
- [ ] 10.4 Load extension in Chrome
- [ ] 10.5 Test with real YouTube video
- [ ] 10.6 Verify timestamps appear in generated summary
- [ ] 10.7 Test clicking timestamps
- [ ] 10.8 Verify video seeks correctly
- [ ] 10.9 Test all three summary formats (Short, Topics, Q&A)
- [ ] 10.10 Check responsive design in sidebar

**Acceptance Criteria:**
- [ ] Extension builds successfully with 0 errors, 0 warnings
- [ ] Extension loads without manifest errors
- [ ] Summary generation works with timestamp injection
- [ ] Timestamps appear and are clickable
- [ ] Video seeking works across all formats
- [ ] No runtime console errors
- [ ] All acceptance criteria from Tasks 1-9 met

**Implementation Approach:**
- Phase 1 (Tasks 1-2): Backend prompt updates
- Phase 2 (Tasks 3-7): Frontend implementation
- Phase 3 (Tasks 8-10): Testing and documentation

**Estimated Effort:** 2-3 hours total

**Final Acceptance Criteria Summary:**
- ✅ Must-Have: Backend prompts include timestamps, Frontend parses timestamps, Clicking seeks video, Extension builds without errors, Works across all formats
- ⚠️ Should-Have: Substantial topics only, Hover tooltips, Cursor styling, Error handling
- 💡 Nice-to-Have: Hour format support, Validation, Visual feedback, Keyboard navigation

## Execution Order

Recommended implementation sequence:
1. Extension Foundation (Task Group 1) - Base structure must be in place first
2. Content Scripts & YouTube Detection (Task Group 2) - Can start in parallel with Task Group 3
3. Background Service Worker (Task Group 3) - Can start in parallel with Task Group 2
4. UI Components (Task Group 4) - Requires Task Groups 2 and 3 to be complete
5. Authentication Flow (Task Group 5) - Can start after Task Groups 1 and 3, but should complete before full feature testing
6. Test Review & Gap Analysis (Task Group 6) - Final step after all implementation

## Notes

- This is a Chrome extension, so testing will require Chrome extension testing tools (e.g., Puppeteer with extension loading, or manual testing in Chrome)
- The extension uses React in a shadow DOM, which requires special consideration for testing
- API endpoints are assumed to exist on the backend - coordinate with backend team for endpoint availability
- Authentication flow may need backend API endpoints for OAuth callback handling
- Export functionality (PDF, Doc, Markdown) may require additional libraries or backend support

