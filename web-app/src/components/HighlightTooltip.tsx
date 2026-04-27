/**
 * HighlightTooltip Component
 * Floating tooltip shown on text selection within the transcript/summary modal.
 * Pure presentational component — no API calls, no external dependencies.
 *
 * mode='new'      — shown when user selects text that is not yet highlighted
 * mode='existing' — shown when user selects text that is already highlighted
 */

import React from 'react';

interface HighlightTooltipProps {
  mode: 'new' | 'existing';
  /** px coordinates relative to the modal container */
  position: { top: number; left: number };
  /** mode='new': called when user confirms the highlight */
  onHighlight?: () => void;
  /** mode='new': called when user dismisses without highlighting */
  onDismiss?: () => void;
  /** mode='existing': called when user removes the highlight */
  onRemove?: () => void;
  /** show "Saving..." state on the Highlight button */
  saving?: boolean;
  /** show "Removing..." state on the Remove button */
  removing?: boolean;
}

export function HighlightTooltip({
  mode,
  position,
  onHighlight,
  onDismiss,
  onRemove,
  saving = false,
  removing = false,
}: HighlightTooltipProps): React.JSX.Element {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    // Float above the selection by 44px so the tooltip clears the text line
    top: position.top - 44,
    left: position.left,
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#1f1f1f',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '100px',
    padding: '5px 8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
    whiteSpace: 'nowrap',
    // Prevent the tooltip itself from triggering a mousedown that would
    // collapse the selection before the click handler fires
    userSelect: 'none',
  };

  // Shared button base styles
  const baseBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '100px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    lineHeight: '1',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  if (mode === 'new') {
    return (
      <div style={containerStyle}>
        {/* Highlight button */}
        <button
          disabled={saving}
          onMouseDown={(e) => e.preventDefault()} // keep selection alive
          onClick={onHighlight}
          style={{
            ...baseBtnStyle,
            color: saving ? '#a3a3a3' : '#fbbf24',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* ✦ spark icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 0 L6.8 4.5 L11 6 L6.8 7.5 L6 12 L5.2 7.5 L1 6 L5.2 4.5 Z" />
          </svg>
          {saving ? 'Saving...' : 'Highlight'}
        </button>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '16px',
            background: 'rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        />

        {/* Dismiss button */}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onDismiss}
          style={{
            ...baseBtnStyle,
            color: '#a3a3a3',
            padding: '4px 8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#a3a3a3';
          }}
          aria-label="Dismiss"
        >
          {/* × close icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
    );
  }

  // mode === 'existing'
  return (
    <div style={containerStyle}>
      <button
        disabled={removing}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
        style={{
          ...baseBtnStyle,
          color: removing ? '#a3a3a3' : '#f87171',
          opacity: removing ? 0.7 : 1,
          cursor: removing ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!removing) {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Trash icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="1,3 13,3" />
          <path d="M4 3V2a1 1 0 011-1h4a1 1 0 011 1v1" />
          <path d="M5 6v5M9 6v5" />
          <path d="M2 3l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
        </svg>
        {removing ? 'Removing...' : 'Remove'}
      </button>
    </div>
  );
}
