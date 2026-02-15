/**
 * Header Component
 * Standardized navigation header with Mintclip logo and back button
 * Used across Privacy, Notifications, and Legal pages
 */

import React from 'react';

interface HeaderProps {
  backText?: string;
  backUrl?: string;
}

export function Header({ backText = '← Back to Home', backUrl = '/' }: HeaderProps): React.JSX.Element {
  return (
    <nav style={{
      position: 'fixed',
      top: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '1200px',
      padding: '0 2rem',
      zIndex: 1000
    }}>
      <div style={{
        background: 'rgba(23, 23, 23, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '100px',
        padding: '1rem 1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img
            src="/icon-128.png"
            alt="Mintclip"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px'
            }}
          />
          <span style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff'
          }}>Mintclip</span>
        </a>
        <a href={backUrl} style={{
          color: '#a3a3a3',
          textDecoration: 'none',
          fontSize: '0.9375rem',
          fontWeight: 500,
          transition: 'color 0.2s'
        }}>{backText}</a>
      </div>
    </nav>
  );
}
