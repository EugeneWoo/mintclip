# Auto-Scroll Sync Implementation Plan

## Overview
Add automatic transcript scrolling that syncs with YouTube video playback. The transcript will highlight and scroll to the segment matching the current video time, pause when users manually scroll, and provide a resume button to re-enable sync.

## User Requirements
- **Sync Behavior**: Auto-scroll transcript to highlight/scroll segment matching video playback time
- **Manual Scroll**: Pause auto-scroll when user manually scrolls; show resume button
- **Visual Highlight**: Highlight current segment with background color

## Implementation

### File to Modify
- [extension/src/content/components/TranscriptTab.tsx](extension/src/content/components/TranscriptTab.tsx)

### Key Changes

#### 1. Add State Variables
```typescript
const [isSyncEnabled, setIsSyncEnabled] = useState(true);
const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);
const [isVideoPlaying, setIsVideoPlaying] = useState(false);
const [userScrolled, setUserScrolled] = useState(false);
const [lastAutoScrollTime, setLastAutoScrollTime] = useState(0);
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

#### 2. Add Segment Finding Algorithm
```typescript
const findSegmentByTime = (currentTime: number, segments: GroupedSegment[]): number | null => {
  if (segments.length === 0) return null;

  let left = 0;
  let right = segments.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const segment = segments[mid];
    const segmentEnd = segment.startSeconds + 30;

    if (currentTime >= segment.startSeconds && currentTime < segmentEnd) {
      return mid;
    } else if (currentTime < segment.startSeconds) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return left < segments.length ? left : segments.length - 1;
};
```

#### 3. Add Video Time Polling
```typescript
useEffect(() => {
  if (!transcript || !isSyncEnabled) return;

  const videoElement = document.querySelector(
    '#movie_player video, .html5-main-video'
  ) as HTMLVideoElement;

  if (!videoElement) return;

  const pollInterval = setInterval(() => {
    const currentTime = videoElement.currentTime;
    const segmentIndex = findSegmentByTime(currentTime, groupedTranscript || []);

    if (segmentIndex !== null && segmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(segmentIndex);

      if (isSyncEnabled && !userScrolled && isVideoPlaying) {
        scrollToSegment(segmentIndex);
      }
    }
  }, 300);

  return () => clearInterval(pollInterval);
}, [transcript, isSyncEnabled, userScrolled, groupedTranscript, isVideoPlaying]);
```

#### 4. Add Video Event Listeners
```typescript
useEffect(() => {
  const videoElement = document.querySelector(
    '#movie_player video, .html5-main-video'
  ) as HTMLVideoElement;

  if (!videoElement) return;

  const handlePlay = () => setIsVideoPlaying(true);
  const handlePause = () => setIsVideoPlaying(false);
  const handleSeek = () => setUserScrolled(false);

  videoElement.addEventListener('play', handlePlay);
  videoElement.addEventListener('pause', handlePause);
  videoElement.addEventListener('seeked', handleSeek);

  return () => {
    videoElement.removeEventListener('play', handlePlay);
    videoElement.removeEventListener('pause', handlePause);
    videoElement.removeEventListener('seeked', handleSeek);
  };
}, []);
```

#### 5. Add Scroll-to-View Function
```typescript
const scrollToSegment = (segmentIndex: number) => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const segmentElements = container.querySelectorAll('[data-segment-index]');
  const targetElement = segmentElements[segmentIndex] as HTMLElement;
  if (!targetElement) return;

  const now = Date.now();
  if (now - lastAutoScrollTime < 500) return;
  setLastAutoScrollTime(now);

  const containerRect = container.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const scrollTop = targetElement.offsetTop - containerRect.height / 2 + targetRect.height / 2;

  container.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  });
};
```

#### 6. Add User Scroll Detection
```typescript
useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const handleScroll = () => {
    if (!isSyncEnabled) return;
    const now = Date.now();
    if (now - lastAutoScrollTime > 1000) {
      setUserScrolled(true);
    }
  };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, [isSyncEnabled, lastAutoScrollTime]);
```

#### 7. Update seekToTimestamp Function
Modify existing function (line 80-91) to reset user scroll state:
```typescript
const seekToTimestamp = (videoId: string, seconds: number) => {
  const videoElement = document.querySelector(
    '#movie_player video, .html5-main-video'
  ) as HTMLVideoElement;

  if (videoElement && videoElement.currentTime !== undefined) {
    videoElement.currentTime = seconds;
    videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setUserScrolled(false); // Reset user scroll state
    setIsSyncEnabled(true); // Re-enable sync
  }
};
```

#### 8. Add Segment Highlighting in JSX
Update the segment div (line 416-424):
```typescript
<div
  key={index}
  data-segment-index={index}
  style={{
    marginBottom: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    backgroundColor: currentSegmentIndex === index ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
    borderRadius: currentSegmentIndex === index ? '6px' : '0',
    padding: currentSegmentIndex === index ? '8px' : '0',
    borderLeft: currentSegmentIndex === index ? '3px solid rgba(102, 126, 234, 0.6)' : '3px solid transparent',
    transition: 'all 0.2s ease',
  }}
>
```

#### 9. Add Ref to Scrollable Container
Update the transcript scrollable div (line 406-413):
```typescript
<div
  ref={scrollContainerRef}
  className="transcript-scrollable"
  style={{
    flex: 1,
    overflowY: 'scroll',
    padding: '16px',
  }}
>
```

#### 10. Add Resume Button to Controls
Add after language selector (after line 374, before copy button at line 376):
```typescript
{userScrolled && (
  <button
    onClick={() => {
      setUserScrolled(false);
      setIsSyncEnabled(true);
    }}
    style={{
      padding: '8px 16px',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      border: '1px solid rgba(102, 126, 234, 0.5)',
      borderRadius: '6px',
      color: '#667eea',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s ease',
    }}
    title="Resume auto-scroll sync with video"
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M5 3l10 5-10 5V3z" fill="currentColor"/>
    </svg>
    Resume Sync
  </button>
)}
```

#### 11. Disable Sync During Search
Add effect to handle search state:
```typescript
useEffect(() => {
  if (searchQuery.length > 0) {
    setIsSyncEnabled(false);
  } else if (!userScrolled) {
    setIsSyncEnabled(true);
  }
}, [searchQuery, userScrolled]);
```

#### 12. Handle Language Changes
Reset sync state when language changes:
```typescript
useEffect(() => {
  setCurrentSegmentIndex(null);
  setUserScrolled(false);
  setIsSyncEnabled(true);
}, [currentLanguage]);
```

## Edge Cases Handled
- Video paused: Continue highlighting but don't auto-scroll
- End of transcript: Return last segment index
- Video seeking: Clear user scroll state and force update
- No transcript: Early return in all effects
- Search filter active: Disable auto-scroll
- Language change: Reset all sync state
- Component unmount: Clean up all event listeners

## Performance Optimizations
- Binary search (O(log n)) for segment finding
- Debounce scroll operations (500ms minimum between auto-scrolls)
- 300ms polling interval (balance responsiveness and performance)
- Memoized segment finding can be added if needed

## Testing Checklist
- [ ] Auto-scroll highlights correct segment during playback
- [ ] Manual scroll pauses auto-scroll and shows resume button
- [ ] Resume button re-enables sync
- [ ] Clicking timestamp resets user scroll state
- [ ] Video seeking updates highlight immediately
- [ ] Pausing video stops auto-scroll (but continues highlighting)
- [ ] Search filter disables auto-scroll
- [ ] Language switching resets sync state
- [ ] Works with long transcripts (1000+ segments)
- [ ] No performance issues during video playback

## Verification
To test the implementation:
1. Load a YouTube video with transcript
2. Play the video and observe auto-scrolling
3. Manually scroll the transcript and verify sync pauses
4. Click "Resume Sync" button to verify sync resumes
5. Click a timestamp to verify it seeks and re-enables sync
6. Test with various video lengths and transcript sizes
