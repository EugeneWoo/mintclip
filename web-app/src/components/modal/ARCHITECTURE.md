# SavedItemModal - Architecture Overview

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTION                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard Card (hover)          OR           Library Table Row      │
│  ┌──────────────────┐                           ┌─────────────────┐ │
│  │  Video Thumbnail │                           │ Video | T | S |C│ │
│  │  Title           │                           │ Type | Actions  │ │
│  │  [View] [Export] │                           │      [View]     │ │
│  └──────────────────┘                           └─────────────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SavedItemModal                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  HEADER: Video Title + [Close]                                 │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  TABS: [Transcript] [Summary] [Chat]                           │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────┤│
│  │  │  Reused Extension Components:                              ││
│  │  │                                                            ││
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          ││
│  │  │  │TranscriptTab│ │ SummaryTab  │ │  ChatTab    │          ││
│  │  │  │(if !batch)  │ │(3 formats)  │ │(interactive)│          ││
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘          ││
│  │  │                                                            ││
│  │  └────────────────────────────────────────────────────────────┘│ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
DashboardPage / LibraryPage
  │
  ├── VideoCard (Dashboard) ──────────┐
  │                                    │
  ├── LibraryTable (Library) ─────────┤
  │                                    │
  └── SavedItemModal ◄────────────────┘
        │
        ├── Modal Header (title, close button)
        │
        ├── Tab Navigation (Transcript/Summary/Chat)
        │
        └── Tab Content (conditional render)
              │
              ├── TranscriptTab (extension/src/content/components/TranscriptTab.tsx)
              │     ├── Search input
              │     ├── Language selector
              │     ├── Copy button
              │     ├── Save button
              │     └── Transcript paragraphs with clickable timestamps
              │
              ├── SummaryTab (extension/src/content/components/SummaryTab.tsx)
              │     ├── Format selector (Short/Topics/Q&A)
              │     ├── Copy button
              │     ├── Save button
              │     ├── Export dropdown (Text/PDF/Markdown)
              │     └── Summary content with clickable timestamps
              │
              └── ChatTab (extension/src/content/components/ChatTab.tsx)
                    ├── Suggested questions (when no messages)
                    ├── Message history
                    ├── Text input
                    ├── Send button
                    └── Save button
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE                                   │
│                                                                  │
│  Supabase 'saved_items' table                                    │
│  ├─ user_id                                                      │
│  ├─ video_id                                                     │
│  ├─ item_type (transcript|summary|chat|batch)                    │
│  └─ content (JSONB)                                              │
│      ├─ transcript: TranscriptSegment[]                          │
│      ├─ summaries: {short, topic, qa, *_is_structured}          │
│      └─ chat_history: ChatMessage[]                              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WEB APP                                       │
│                                                                  │
│  API Endpoint: GET /api/saved-items/list                        │
│       │                                                         │
│       ├── Response: SavedItemData[]                             │
│       │                                                         │
│       ▼                                                         │
│  Dashboard / Library renders items                              │
│       │                                                         │
│       ├── VideoCard component                                   │
│       └── LibraryTable component                                │
│             │                                                   │
│             │ User clicks "View"                                │
│             ▼                                                   │
│       SavedItemModal.isOpen = true                              │
│       SavedItemModal.item = selectedItem                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MODAL INTERNAL STATE                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Props (from parent)                                     │   │
│  │  • isOpen: boolean                                      │   │
│  │  • onClose: () => void                                  │   │
│  │  • item: SavedItemData                                  │   │
│  │  • isAuthenticated: boolean                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Local State                                              │   │
│  │  • activeTab: 'transcript' | 'summary' | 'chat'         │   │
│  │  • currentFormat: 'short' | 'topic' | 'qa'              │   │
│  │  • chatInput: string                                     │   │
│  │  • chatMessages: ChatMessage[]                           │   │
│  │  • isLoading*: boolean                                   │   │
│  │  • availableLanguages: Language[]                        │   │
│  │  • currentLanguage: string                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Derived State                                            │   │
│  │  • hasTranscript: boolean                                │   │
│  │  • hasSummary: boolean                                   │   │
│  │  • hasChat: boolean                                      │   │
│  │  • showTranscriptTab: hasTranscript && !item.is_batch   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

### Modal Lifecycle

```
1. MOUNT (isOpen=false, item=null)
   │
   │ User clicks "View" → setSelectedItem(item) → setIsModalOpen(true)
   ▼
2. OPEN (isOpen=true, item=SavedItemData)
   │
   │ useEffect runs:
   │  • Auto-select best tab (chat → summary → transcript)
   │  • Initialize local state from item.content
   │  • Add escape key listener
   │  • Prevent body scroll
   ▼
3. INTERACT (user explores content)
   │
   │ • Switch tabs → setActiveTab()
   │ • Change summary format → setCurrentFormat()
   │ • Send chat message → handleSendMessage()
   │ • Change transcript language → handleLanguageChange()
   ▼
4. CLOSE (onClose())
   │
   │ • Remove escape key listener
   │ • Restore body scroll
   │ • setIsModalOpen(false)
   ▼
5. UNMOUNT (cleanup)
```

### Batch vs Individual Handling

```
┌────────────────────────────────────────────────────────────┐
│                    ITEM TYPE CHECK                          │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ item.is_batch? │
                  └────┬───────┬───┘
                       │       │
                  YES  │       │  NO
                       │       │
                       ▼       ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ TABS:            │  │ TABS:            │
        │ • Summary ✓      │  │ • Transcript ✓   │
        │ • Chat ✓         │  │ • Summary ✓      │
        │ • Transcript ✗   │  │ • Chat ✓         │
        │                  │  │                  │
        │ HEADER BADGE:    │  │ HEADER BADGE:    │
        │ "Batch"          │  │ (none)           │
        └──────────────────┘  └──────────────────┘
```

## Props Mapping

### SavedItemModal → Extension Components

```
SavedItemModal State                    →  Extension Component Props
═════════════════════════════════════════════════════════════════════
item.content.transcript                 →  TranscriptTab.transcript
item.content.available_languages        →  TranscriptTab.availableLanguages
item.content.transcript_language        →  TranscriptTab.currentLanguage
isAuthenticated                          →  TranscriptTab.isAuthenticated

item.content.summaries                  →  SummaryTab.summaries
currentFormat                           →  SummaryTab.currentFormat
item.video_title                        →  SummaryTab.videoTitle
item.video_id                           →  SummaryTab.videoId

item.content.chat_history               →  ChatTab.messages
item.content.suggested_questions        →  ChatTab.suggestedQuestions
chatInput                               →  ChatTab.inputValue
isLoadingChat                           →  ChatTab.isLoading
```

## Integration Points

### Required API Endpoints

```typescript
// Chat
POST /api/chat/message
Request: { video_id: string, message: string, chat_history: ChatMessage[] }
Response: { response: string }

// Transcript (already exists in backend)
POST /api/transcript/extract
POST /api/transcript/translate

// Summary (already exists in backend)
POST /api/summary/generate

// Saved Items (already exists in backend)
GET /api/saved-items/list
DELETE /api/saved-items/{video_id}/{item_type}
```

### Event Handlers

```typescript
// Modal triggers → Parent component
onClose()                          // User closes modal

// Parent component → Modal
<View item={item} />              // Open modal with item

// Modal → Extension components
<TranscriptTab
  onFetchTranscript={() => {...}}     // Placeholder: fetch transcript
  onLanguageChange={(lang) => {...}}  // Placeholder: change language
  onFetchLanguages={() => {...}}      // Load available languages
  onSaveTranscript={() => {...}}      // Placeholder: save action
/>

<SummaryTab
  onGenerateSummary={(format) => {...}}  // Placeholder: generate summary
  onFormatChange={(format) => {...}}      // Change summary format
  onSaveSummary={() => {...}}             // Placeholder: save action
/>

<ChatTab
  onSendMessage={(msg) => {...}           // Placeholder: send message
  onFetchSuggestedQuestions={() => {...}} // Load suggested questions
  onSaveChat={() => {...}}                // Placeholder: save action
/>
```

## Styling Architecture

```
Theme Tokens (used throughout)
═════════════════════════════════════════════════════════════════════
Colors:
  --bg-primary: #212121
  --bg-secondary: #1a1a1a
  --bg-hover: rgba(255, 255, 255, 0.05)
  --border: rgba(255, 255, 255, 0.1)
  --text-primary: #fff
  --text-secondary: rgba(255, 255, 255, 0.7)
  --text-muted: rgba(255, 255, 255, 0.5)
  --accent: #667eea
  --accent-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  --success: #22c55e
  --error: #ef4444

Spacing:
  --xs: 4px
  --sm: 8px
  --md: 12px
  --lg: 16px
  --xl: 20px
  --2xl: 24px

Radius:
  --sm: 4px
  --md: 6px
  --lg: 8px
  --xl: 12px

Shadows:
  --sm: 0 2px 8px rgba(0, 0, 0, 0.3)
  --md: 0 4px 12px rgba(0, 0, 0, 0.3)
  --lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5)
```

## File Organization

```
web-app/
├── src/
│   ├── components/
│   │   └── modal/
│   │       ├── SavedItemModal.tsx           # Main modal component
│   │       ├── SavedItemModalExample.tsx    # Usage examples
│   │       ├── README.md                    # Documentation
│   │       └── ARCHITECTURE.md              # This file
│   │
│   └── pages/
│       ├── Dashboard.tsx                    # Uses DashboardPage
│       └── Library.tsx                      # Uses LibraryTable
│
└── extension/ (existing)
    └── src/
        └── content/
            └── components/
                ├── ChatTab.tsx              # Imported by modal
                ├── SummaryTab.tsx           # Imported by modal
                └── TranscriptTab.tsx        # Imported by modal
```

## Accessibility Features

```
Keyboard Navigation:
═════════════════════════════════════════════════════════════════════
✓ Escape key closes modal
✓ Tab key focuses through interactive elements
TODO: Add ARIA labels
TODO: Add focus trap
TODO: Add arrow key navigation for tabs

Visual Accessibility:
═════════════════════════════════════════════════════════════════════
✓ High contrast colors (WCAG AA compliant)
✓ Clear focus states
✓ Loading indicators
✓ Disabled state styling
TODO: Add screen reader announcements
TODO: Add reduced-motion support
```

## Performance Considerations

```
Optimization Strategies:
═════════════════════════════════════════════════════════════════════
✓ Conditional rendering (only show active tab)
✓ useEffect for initialization (not on every render)
✓ Event listener cleanup
✓ Inline styles (no CSS-in-JS overhead)
TODO: Lazy load tab components
TODO: Virtualize long lists (chat history, transcript)
TODO: Add React.memo for tab components
```
