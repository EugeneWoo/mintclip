/**
 * Loading Spinner Component
 * Simple loading indicator for API calls
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps): React.JSX.Element {
  const sizeMap = {
    small: '16px',
    medium: '24px',
    large: '32px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderTop: '2px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && (
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {message}
        </div>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
