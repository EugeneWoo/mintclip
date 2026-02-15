/**
 * VideoCard Component
 * Displays a single saved item as a card
 */

import React from 'react';
import { getYouTubeThumbnail } from '../utils/youtube';

interface VideoCardProps {
  item: {
    id: string;
    video_id: string;
    item_type: 'transcript' | 'summary' | 'chat';
    content: any;
    created_at: string;
    source: 'extension' | 'upload';
  };
  onView: (item: any) => void;
  onExport?: (item: any) => void;
  onDelete?: (item: any) => void;
}

export function VideoCard({ item, onView, onExport, onDelete }: VideoCardProps): React.JSX.Element {
  const [thumbnailError, setThumbnailError] = React.useState(false);

  const videoId = item.video_id;
  const videoTitle = item.content?.videoTitle || `Video ${videoId}`;
  const videoThumbnail = thumbnailError
    ? getYouTubeThumbnail(videoId, 'mq') // Fallback to medium quality
    : (item.content?.videoThumbnail || getYouTubeThumbnail(videoId, 'hq'));
  const createdAt = new Date(item.created_at).toLocaleDateString();

  // Determine which badges to show
  const hasTranscript = item.content?.segments && item.content.segments.length > 0;

  // Check for summary in multiple formats:
  // 1. Direct summary field (simple format)
  // 2. Summaries object (legacy format)
  // 3. Formats object (Extension's nested structure: formats.short.summary, etc.)
  const hasSummary = !!(
    item.content?.summary ||
    (item.content?.summaries && (
      item.content.summaries.short || item.content.summaries.topic || item.content.summaries.qa
    )) ||
    (item.content?.formats && (
      item.content.formats.short?.summary ||
      item.content.formats.topic?.summary ||
      item.content.formats.qa?.summary
    ))
  );

  // Debug log to see what's in content
  console.log(`[VideoCard] ${item.video_id}:`, {
    item_type: item.item_type,
    has_segments: !!item.content?.segments,
    has_summary: !!item.content?.summary,
    has_summaries: !!item.content?.summaries,
    has_chat_history: !!item.content?.chat_history,
    content_keys: Object.keys(item.content || {}),
  });

  return (
    <div
      style={{
        background: '#262626',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.2s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative' }}>
        <img
          src={videoThumbnail}
          alt={videoTitle}
          onError={() => setThumbnailError(true)}
          style={{
            width: '100%',
            height: '180px',
            objectFit: 'cover',
            backgroundColor: '#1a1a1a',
          }}
        />

        {/* Badges */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}>
          {hasTranscript && (
            <span style={{
              padding: '4px 10px',
              background: 'rgba(34, 197, 94, 0.9)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              backdropFilter: 'blur(10px)',
            }}>
              Transcript
            </span>
          )}
          {hasSummary && (
            <span style={{
              padding: '4px 10px',
              background: 'rgba(59, 130, 246, 0.9)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              backdropFilter: 'blur(10px)',
            }}>
              Summary
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem', paddingTop: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          title={videoTitle}
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            flexShrink: 0,
          }}
        >
          {videoTitle}
        </h3>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '0.75rem',
          flexShrink: 0,
        }}>
          <span>{createdAt}</span>
          {item.source === 'upload' && (
            <span style={{
              padding: "5px 8px",
              background: "rgba(34, 197, 94, 0.2)",
              borderRadius: "4px",
              color: "#22c55e",
              fontSize: "11px",
              fontWeight: 500,
              display: "inline-block",
            }}>
              Uploaded
            </span>
          )}
        </div>

        {/* Actions with Export MD */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
          minHeight: '48px',
        }}>
          <button
            onClick={() => onView(item)}
            style={{
              flex: 1,
              padding: '0.625rem',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            View
          </button>
          {item.item_type && onExport && (
            <button
              onClick={(e) => {
                console.log('[VideoCard] Export button clicked, item_type:', item.item_type);
                e.stopPropagation();
                onExport(item);
              }}
              title="Export as Markdown"
              style={{
                flex: 1,
                padding: '0.625rem',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#ffffff',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
              }}
            >
              Export
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              title="Delete all items for this video"
              style={{
                padding: '0.625rem 1rem',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
