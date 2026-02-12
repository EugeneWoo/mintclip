# SavedItemModal Component

A reusable modal component for displaying saved video content (transcripts, summaries, and chats) in the Mintclip web application.

## Overview

The `SavedItemModal` component reuses the existing tab components from the Chrome extension (`ChatTab`, `SummaryTab`, `TranscriptTab`) to provide a consistent viewing experience across platforms. It supports both individual and batch video items, with automatic handling of available content types.

## Chat Behavior Modes

The modal supports two distinct chat modes:

### 1. Static Chat Mode (Default - `isChatInteractive: false`)
- Used for **saved items from the extension**
- Chat messages are displayed as read-only static content
- No input field or send button shown
- Empty state shows: "No chat messages saved" with message to use extension
- Export functionality remains available for existing chat history

### 2. Interactive Chat Mode (`isChatInteractive: true`)
- Used for **URL uploads directly in the dashboard**
- Full interactive chat with input field and send button
- Suggested questions displayed as clickable pills
- Real-time AI responses via backend API
- New chat sessions can be started
- Empty state shows: "Ask questions about the video"

## Features

- **Tabbed Interface**: Switch between Transcript, Summary, and Chat views
- **Batch URL Support**: Automatically hides transcript tab for batch items
- **Responsive Design**: Full-screen modal with proper overflow handling
- **Keyboard Support**: Close modal with Escape key
- **Component Reuse**: Directly imports and uses extension tab components
- **State Management**: Handles loading states, user input, and data persistence
- **Authentication Aware**: Respects user authentication status

## Architecture

### Component Structure

```
SavedItemModal/
├── SavedItemModal.tsx          # Main modal component
├── SavedItemModalExample.tsx   # Usage examples and integration
└── README.md                   # This file
```

### Data Flow

1. **User Action** → Click "View" button on dashboard card or library table
2. **Modal Opens** → Receives `SavedItemData` prop with all content
3. **Tab Selection** → Automatically determines best initial tab based on available content
4. **Content Display** → Renders appropriate tab component with data
5. **User Interaction** → Chat, export, save actions (API integration required)

## Props Interface

### SavedItemModalProps

```typescript
interface SavedItemModalProps {
  isOpen: boolean;              // Controls modal visibility
  onClose: () => void;          // Callback when modal is closed
  item: SavedItemData | null;   // Item data to display
  isAuthenticated?: boolean;    // User auth status (default: true)
  isChatInteractive?: boolean;  // Enable interactive chat (default: false)
}
```

### SavedItemData Structure

```typescript
interface SavedItemData {
  video_id: string;
  video_title: string;
  video_thumbnail?: string;
  item_type: 'transcript' | 'summary' | 'chat' | 'batch';
  content: {
    transcript?: TranscriptSegment[];
    transcript_language?: string;
    available_languages?: Language[];
    summaries?: {
      short?: string;
      topic?: string;
      qa?: string;
      short_is_structured?: boolean;
      topic_is_structured?: boolean;
      qa_is_structured?: boolean;
    };
    chat_history?: ChatMessage[];
    suggested_questions?: string[];
  };
  created_at: string;
  is_batch?: boolean;
  // Source: 'extension' (saved from extension) or 'upload' (URL upload in dashboard)
  // Auto-detects chat mode: 'upload' → interactive, 'extension' → static
  source?: 'extension' | 'upload';
}
```

## Usage

### Basic Example

```tsx
import { SavedItemModal } from './components/modal/SavedItemModal';
import { useState } from 'react';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SavedItemData | null>(null);

  const handleView = (item: SavedItemData) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // Example 1: Item from extension (auto-detected as static chat)
  const extensionItem: SavedItemData = {
    video_id: 'abc123',
    video_title: 'My Saved Video',
    item_type: 'chat',
    source: 'extension',  // Tells modal: use static chat
    content: {
      chat_history: [
        { id: '1', role: 'user', content: 'What is this about?' },
        { id: '2', role: 'assistant', content: 'This video explains...' }
      ]
    },
    created_at: '2025-01-15T10:00:00Z'
  };

  // Example 2: Item from URL upload (auto-detected as interactive chat)
  const uploadItem: SavedItemData = {
    video_id: 'xyz789',
    video_title: 'Uploaded URL Video',
    item_type: 'transcript',
    source: 'upload',  // Tells modal: use interactive chat
    content: {
      transcript: [ /* transcript segments */ ]
    },
    created_at: new Date().toISOString()
  };

  return (
    <>
      <button onClick={() => handleView(extensionItem)}>View Saved Chat</button>
      <button onClick={() => handleView(uploadItem)}>Chat with Upload</button>

      {/* No need to specify isChatInteractive - it's auto-detected from source! */}
      <SavedItemModal
        isOpen={isModalOpen}
        item={selectedItem}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
```

### Dashboard Integration

```tsx
import { VideoCard, DashboardPage } from './components/modal/SavedItemModalExample';

function Dashboard() {
  const savedItems: SavedItemData[] = [...]; // Fetch from API

  return (
    <DashboardPage
      savedItems={savedItems}
      onExport={(item, format) => {
        // Handle export logic
      }}
      onDelete={(item) => {
        // Handle delete logic
      }}
    />
  );
}
```

### Library Integration

```tsx
import { LibraryTable } from './components/modal/SavedItemModalExample';

function Library() {
  const savedItems: SavedItemData[] = [...]; // Fetch from API

  return (
    <LibraryTable
      items={savedItems}
      onView={(item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
      }}
      onExport={(item, format) => {
        // Handle export
      }}
      onDelete={(item) => {
        // Handle delete
      }}
    />
  );
}
```

## Tab Behavior

### Chat Mode Selection

The chat tab behavior is determined by the `isChatInteractive` prop OR auto-detected from `item.source`:

**Auto-Detection (when `isChatInteractive` is not provided):**
- `item.source === 'upload'` → Interactive mode
- `item.source === 'extension'` or `undefined` → Static mode

**Manual Override (when `isChatInteractive` is provided):**
- **`isChatInteractive: false`**
  - Displays saved chat messages from extension
  - Read-only view with export functionality
  - No input field or suggested questions
  - Empty state: "No chat messages saved"

- **`isChatInteractive: true`**
  - Full interactive chat experience
  - Input field, send button, suggested questions
  - Real-time AI responses via `/api/chat/message`
  - Empty state: "Ask questions about the video"

### Automatic Tab Selection

The modal automatically selects the most appropriate initial tab based on available content:

1. **Chat** → If chat history exists, show chat first
2. **Summary** → If summaries exist, show summary (default)
3. **Transcript** → If only transcript exists

### Batch URL Handling

For batch items (`is_batch: true`):
- Transcript tab is **hidden**
- Only Summary and Chat tabs are shown
- Badge indicator shows "Batch" in header

### Content Availability

Each tab checks for content availability:
- **Transcript**: `content.transcript?.length > 0`
- **Summary**: Any of `content.summaries.{short,topic,qa}` defined
- **Chat**: `content.chat_history?.length > 0`

## API Integration Required

The following functions are placeholders and require backend integration:

### Chat
```typescript
const handleSendMessage = async (message: string) => {
  // TODO: POST to /api/chat/message
  // Send: { video_id, message, chat_history }
  // Receive: { response: string }
};
```

### Transcript
```typescript
const handleFetchTranscript = () => {
  // TODO: POST to /api/transcript/extract
  // Send: { video_id }
  // Receive: { transcript: TranscriptSegment[] }
};

const handleLanguageChange = (languageCode: string) => {
  // TODO: POST to /api/transcript/translate
  // Send: { video_id, target_language }
  // Receive: { transcript: TranscriptSegment[] }
};
```

### Summary
```typescript
const handleGenerateSummary = (format: SummaryFormat) => {
  // TODO: POST to /api/summary/generate
  // Send: { video_id, format }
  // Receive: { summary: string }
};
```

## Styling

The modal uses inline styles consistent with the extension's design system:

- **Background**: `#212121` (dark theme)
- **Border**: `rgba(255, 255, 255, 0.1)`
- **Accent**: `#667eea` (purple gradient)
- **Text**: `#fff` (primary), `rgba(255, 255, 255, 0.7)` (secondary)
- **Border Radius**: `12px` (modal), `8px` (buttons)
- **Shadows**: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`

## Accessibility

- **Keyboard**: Close modal with Escape key
- **Focus Management**: Click outside closes modal
- **Body Scroll**: Prevented when modal is open
- **ARIA**: Add appropriate ARIA labels for production use

## Dependencies

The modal imports from the extension:
```typescript
import { ChatTab } from '../../extension/src/content/components/ChatTab';
import { SummaryTab } from '../../extension/src/content/components/SummaryTab';
import { TranscriptTab } from '../../extension/src/content/components/TranscriptTab';
```

**Note**: Ensure these paths are correct for your project structure, or move components to a shared location.

## File Structure Recommendations

### Option 1: Direct Import (Current)
```
web-app/
└── src/
    └── components/
        └── modal/
            ├── SavedItemModal.tsx
            └── SavedItemModalExample.tsx

extension/
└── src/
    └── content/
        └── components/
            ├── ChatTab.tsx
            ├── SummaryTab.tsx
            └── TranscriptTab.tsx
```

### Option 2: Shared Components (Recommended)
```
shared/
└── components/
    ├── ChatTab.tsx
    ├── SummaryTab.tsx
    └── TranscriptTab.tsx

web-app/
└── src/
    └── components/
        └── modal/
            └── SavedItemModal.tsx

extension/
└── src/
    └── content/
        └── components/ (symlinks to shared)
```

## Testing

### Manual Testing Checklist

- [ ] Modal opens on "View" button click
- [ ] Modal closes on close button click
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Escape key press
- [ ] Body scroll is prevented when modal is open
- [ ] Correct tab is auto-selected based on content
- [ ] Transcript tab is hidden for batch items
- [ ] All tabs display content correctly
- [ ] Chat input sends messages (with API integration)
- [ ] Summary format switching works
- [ ] Transcript language switching works (with API integration)
- [ ] Save buttons show feedback

## Future Enhancements

1. **API Integration**: Connect to backend endpoints
2. **Error Handling**: Add error states and retry logic
3. **Loading States**: Improve loading indicators
4. **Offline Support**: Cache content for offline viewing
5. **Fullscreen Mode**: Add option to expand content
6. **Print Styles**: Optimize for printing
7. **Share Modal**: Add sharing functionality
8. **Edit Capabilities**: Allow editing saved items
9. **Keyboard Navigation**: Full keyboard support for tabs
10. **Animation**: Add smooth transitions between tabs

## Troubleshooting

### Import Errors

If you see import errors:
1. Check file paths in import statements
2. Ensure extension components are built
3. Consider moving components to shared directory

### Styling Issues

If modal styling appears broken:
1. Ensure parent container has `position: relative` or similar
2. Check z-index conflicts with other modals
3. Verify backdrop-filter support (add -webkit- prefix)

### Tab Content Not Showing

If tab content is empty:
1. Check `item.content` structure matches expected format
2. Verify data is passed correctly to tab components
3. Check console for errors from extension components

## License

Part of the Mintclip project. See main LICENSE file.
