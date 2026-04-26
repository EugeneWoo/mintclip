import React, { useState } from 'react';

interface BatchVideo {
  video_id: string;
  title: string;
}

interface BatchCardProps {
  item: {
    id: string;
    video_id: string;
    item_type: 'batch';
    content: {
      groupTitle?: string;
      videos?: BatchVideo[];
      video_ids?: string[];
      text?: string;
      segments?: any[];
    };
    created_at: string;
    source: 'batch';
  };
  onView?: (item: any) => void;
  onDelete?: (item: any) => void;
  isSelected?: boolean;
  onSelectToggle?: (videoId: string) => void;
}

function BatchThumbnailGrid({ videos }: { videos: BatchVideo[] }): React.JSX.Element {
  const count = videos.length;
  let rows: number[];
  if (count === 1) rows = [1];
  else if (count === 2) rows = [2];
  else if (count === 3) rows = [3];
  else if (count === 4) rows = [2, 2];
  else rows = [3, 2];

  let idx = 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {rows.map((cols, rowIdx) => (
        <div
          key={rowIdx}
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px' }}
        >
          {Array.from({ length: cols }, () => {
            const v = videos[idx++];
            if (!v) return null;
            return (
              <img
                key={v.video_id}
                src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`}
                alt={v.title}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  display: 'block',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BatchCard({
  item,
  onView,
  onDelete,
  isSelected,
  onSelectToggle,
}: BatchCardProps): React.JSX.Element {
  const [showVideos, setShowVideos] = useState(false);
  const hasTranscript = !!(item.content?.text || (item.content?.segments && item.content.segments.length > 0));
  const videos = item.content?.videos || [];
  const groupTitle = item.content?.groupTitle || 'Batch Import';
  const createdAt = new Date(item.created_at).toLocaleDateString();

  return (
    <div
      style={{
        background: '#262626',
        border: `1px solid ${isSelected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      {/* Thumbnail grid area */}
      <div style={{ position: 'relative', padding: '8px 8px 0' }}>
        {onSelectToggle && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectToggle(item.video_id);
            }}
            style={{
              position: 'absolute',
              top: '18px',
              left: '18px',
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              border: `2px solid ${isSelected ? '#ef4444' : 'rgba(255,255,255,0.7)'}`,
              background: isSelected ? '#ef4444' : 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              zIndex: 2,
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

        {videos.length > 0 ? (
          <BatchThumbnailGrid videos={videos} />
        ) : (
          <div style={{ height: '120px', background: '#404040', borderRadius: '8px' }} />
        )}

        {/* Batch badge */}
        <div style={{ position: 'absolute', top: '18px', right: '18px' }}>
          <span style={{
            padding: '4px 10px',
            background: 'rgba(168, 85, 247, 0.9)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            backdropFilter: 'blur(10px)',
          }}>
            Batch · {videos.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem', paddingTop: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          title={groupTitle}
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            flexShrink: 0,
          }}
        >
          {groupTitle}
        </h3>

        <div style={{
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '0.75rem',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>{createdAt}</span>
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
        </div>

        {/* Video list (collapsible) */}
        {showVideos && videos.length > 0 && (
          <div style={{
            marginBottom: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {videos.map((v) => (
              <a
                key={v.video_id}
                href={`https://youtube.com/watch?v=${v.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#a855f7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                {v.title || v.video_id}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
          <button
            onClick={() => {
              if (hasTranscript && onView) {
                onView(item);
              } else {
                setShowVideos(v => !v);
              }
            }}
            style={{
              flex: 1,
              padding: '0.625rem',
              background: showVideos ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              border: `1px solid ${showVideos ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'; }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showVideos
                ? 'rgba(168, 85, 247, 0.2)'
                : 'rgba(255, 255, 255, 0.05)';
            }}
          >
            {hasTranscript ? 'View' : (showVideos ? 'Hide' : 'Videos')}
          </button>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
