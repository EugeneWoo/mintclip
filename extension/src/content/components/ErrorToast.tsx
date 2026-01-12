/**
 * Error Toast Component
 * Non-blocking error notifications
 */

import React, { useEffect } from 'react';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number; // milliseconds
}

export function ErrorToast({ message, onClose, duration = 5000 }: ErrorToastProps): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '320px',
        backgroundColor: '#2a2a2a',
        border: '1px solid rgba(255, 100, 100, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.4',
            marginBottom: '4px',
          }}
        >
          {message}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
