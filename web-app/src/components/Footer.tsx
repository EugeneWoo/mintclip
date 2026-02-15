/**
 * Footer Component
 * Reusable footer with legal links and copyright
 */

import React from 'react';
import { Link } from 'react-router-dom';

export function Footer(): React.JSX.Element {
  return (
    <footer style={{
      background: '#1f1f1f',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '3rem 2rem',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        {/* Left side - Logo and Copyright */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
        }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <img
              src="/icon-48.png"
              alt="Mintclip"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
              }}
            />
            Mintclip
          </Link>
          <span style={{
            fontSize: '0.875rem',
            color: '#737373',
          }}>
            &copy; 2026 Mintclip. All rights reserved.
          </span>
        </div>

        {/* Right side - Legal Links */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          <Link
            to="/legal/privacy-policy"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            Privacy Policy
          </Link>
          <Link
            to="/legal/terms-of-service"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            Terms of Service
          </Link>
          <Link
            to="/legal/cookie-policy"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            Cookie Policy
          </Link>
          <Link
            to="/legal/gdpr-compliance"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            GDPR
          </Link>
          <Link
            to="/legal/data-processing-agreement"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            DPA
          </Link>
          <a
            href="mailto:getmintclip@gmail.com"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#22c55e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#737373';
            }}
          >
            Support
          </a>
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          footer > div {
            flex-direction: column;
            text-align: center;
          }

          footer > div > div:first-child {
            flex-direction: column;
            gap: 1rem;
          }

          footer > div > div:last-child {
            justify-content: center;
            gap: 1rem 1.5rem;
          }
        }
      `}</style>
    </footer>
  );
}
