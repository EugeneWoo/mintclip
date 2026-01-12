/**
 * Transcript Tab Component
 * Displays video transcript with timestamps, search, and copy functionality
 */

import React, { useState, useMemo, useEffect } from 'react';

interface TranscriptSegment {
  timestamp: string;
  start_seconds?: number;
  duration?: number;
  text: string;
}

interface GroupedSegment {
  timestamp: string;
  startSeconds: number;
  text: string;
}

interface ClickableTimestampProps {
  timestamp: string;
  startSeconds: number;
  videoId: string;
}

interface Language {
  code: string;
  name: string;
  is_generated?: boolean;
  is_ai_translated?: boolean;
}

interface TranscriptTabProps {
  transcript?: TranscriptSegment[];
  isLoading?: boolean;
  onFetchTranscript?: () => void;
  videoId?: string;
  currentLanguage?: string;
  availableLanguages?: Language[];
  onLanguageChange?: (languageCode: string) => void;
  onFetchLanguages?: () => void;
}

// ClickableTimestamp component
const ClickableTimestamp: React.FC<ClickableTimestampProps> = ({ timestamp, startSeconds, videoId }) => {
  const handleClick = () => {
    seekToTimestamp(videoId, startSeconds);
  };

  return (
    <span
      className="mintclip-timestamp"
      onClick={handleClick}
      title={`Jump to ${timestamp}`}
      style={{
        cursor: 'pointer',
        color: '#3ea6ff',
        transition: 'all 0.2s ease',
        borderRadius: '2px',
        padding: '1px 3px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(62, 166, 255, 0.1)';
        e.currentTarget.style.color = '#1a73e8';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#3ea6ff';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {timestamp}
    </span>
  );
};

// YouTube player API integration
const seekToTimestamp = (videoId: string, seconds: number) => {
  const videoElement = document.querySelector(
    '#movie_player video, .html5-main-video'
  ) as HTMLVideoElement;

  if (videoElement && videoElement.currentTime !== undefined) {
    videoElement.currentTime = seconds;
    videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    console.warn('YouTube video element not found');
  }
};

export function TranscriptTab({
  transcript,
  isLoading = false,
  onFetchTranscript,
  videoId,
  currentLanguage = 'en',
  availableLanguages = [],
  onLanguageChange,
  onFetchLanguages,
}: TranscriptTabProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Fetch available languages when videoId changes or transcript loads
  useEffect(() => {
    if (videoId && transcript && onFetchLanguages && availableLanguages.length === 0) {
      onFetchLanguages();
    }
  }, [videoId, transcript, onFetchLanguages, availableLanguages.length]);

  // Smart paragraph grouping based on pauses, punctuation, and length constraints
  const groupedTranscript = useMemo(() => {
    if (!transcript) return undefined;

    // Helper to format seconds as MM:SS
    const formatTimestamp = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Smart paragraph grouping algorithm
    const groups: GroupedSegment[] = [];
    let currentGroup: { start: number; texts: string[] } = { start: 0, texts: [] };

    transcript.forEach((segment, index) => {
      const startSeconds = segment.start_seconds ?? 0;
      const duration = segment.duration ?? 2.0;
      let text = segment.text.trim();

      // Capitalize the very first word of the entire transcript
      if (index === 0 && text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }

      // Calculate gap between this segment and previous
      const gap = index > 0
        ? startSeconds - (transcript[index - 1].start_seconds ?? 0) - (transcript[index - 1].duration ?? 0)
        : 0;

      // Heuristics for paragraph breaks
      const isLongGap = gap > 2.0;  // >2s silence = paragraph break
      const endsWithPunctuation = /[.!?]$/.test(currentGroup.texts.join(' '));
      const currentGroupTooLong = currentGroup.texts.length >= 8;  // Max 8 segments per paragraph
      const hasShortFiller = duration < 0.5 && text.split(' ').length <= 2;

      // Decide: continue current paragraph or start new one?
      const shouldBreak = currentGroup.texts.length > 0 && (
        isLongGap ||  // Long pause detected
        (endsWithPunctuation && gap > 1.0) ||  // Sentence ended + pause
        currentGroupTooLong  // Prevent walls of text
      );

      if (shouldBreak && !hasShortFiller) {
        // Finalize current paragraph
        groups.push({
          timestamp: formatTimestamp(currentGroup.start),
          startSeconds: currentGroup.start,
          text: currentGroup.texts.join(' ')
        });
        // Start new paragraph - capitalize first letter if previous ended with punctuation
        let newText = text;
        if (endsWithPunctuation && text.length > 0) {
          newText = text.charAt(0).toUpperCase() + text.slice(1);
        }
        currentGroup = { start: startSeconds, texts: [newText] };
      } else {
        // Continue current paragraph
        if (currentGroup.texts.length === 0) {
          currentGroup.start = startSeconds;
        }
        currentGroup.texts.push(text);
      }
    });

    // Add final paragraph
    if (currentGroup.texts.length > 0) {
      groups.push({
        timestamp: formatTimestamp(currentGroup.start),
        startSeconds: currentGroup.start,
        text: currentGroup.texts.join(' ')
      });
    }

    return groups;
  }, [transcript]);

  const filteredTranscript = groupedTranscript?.filter((segment) =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    if (!groupedTranscript) return;
    const text = groupedTranscript.map((seg) => seg.text).join('\n\n');
    navigator.clipboard.writeText(text);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 1000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        backgroundColor: '#212121',
      }}
    >
      {/* Empty State */}
      {!transcript && !isLoading && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <button
            onClick={() => onFetchTranscript?.()}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
            }}
          >
            Get Transcript
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <div style={{ fontSize: '14px' }}>Loading transcript...</div>
        </div>
      )}

      {/* Transcript Display */}
      {transcript && !isLoading && (
        <>
          {/* Search, Language, and Copy Controls */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />

            {/* Language Selector */}
            {availableLanguages.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                  }}
                  title="Select language"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M2 8h12M8 2a8 8 0 0 0 0 12M8 2a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>

                {/* Language Dropdown */}
                {showLanguageDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#1a1a2e',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      zIndex: 1000,
                      minWidth: '200px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    {availableLanguages.map((lang) => {
                      // Check if this is a translating option
                      const isTranslating = lang.name.includes('(translating...)');

                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            // Don't allow clicking if translation is in progress
                            if (isTranslating) return;

                            if (onLanguageChange) {
                              onLanguageChange(lang.code);
                            }
                            setShowLanguageDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            backgroundColor: currentLanguage === lang.code
                              ? 'rgba(102, 126, 234, 0.1)'
                              : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            color: isTranslating
                              ? 'rgba(255, 255, 255, 0.4)'
                              : currentLanguage === lang.code
                                ? '#667eea'
                                : 'rgba(255, 255, 255, 0.8)',
                            textAlign: 'left',
                            cursor: isTranslating ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: isTranslating ? 0.6 : 1,
                          }}
                        >
                          <span>{lang.name}</span>
                          {currentLanguage === lang.code && (
                            <span style={{ color: '#667eea' }}>✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCopy}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: showCopyFeedback
                  ? '1px solid #667eea'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border 0.2s',
                boxShadow: showCopyFeedback ? '0 0 0 0.5px #667eea' : 'none',
                width: '36px',
                height: '36px',
              }}
              title="Copy transcript"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M3 10V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
          </div>

          {/* Transcript Content */}
          <div
            className="transcript-scrollable"
            style={{
              flex: 1,
              overflowY: 'scroll',
              padding: '16px',
            }}
          >
            {filteredTranscript && filteredTranscript.length > 0 ? (
              filteredTranscript.map((segment, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <ClickableTimestamp
                    timestamp={segment.timestamp}
                    startSeconds={segment.startSeconds}
                    videoId={videoId || ''}
                  />
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontFamily: 'Roboto, Arial, sans-serif',
                    }}
                  >
                    {segment.text}
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '13px',
                  padding: '32px 16px',
                }}
              >
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
