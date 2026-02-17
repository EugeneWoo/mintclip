/**
 * Footer Component
 * Reusable footer with legal links and copyright
 * Mobile-responsive layout
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Footer(): React.JSX.Element {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <footer style={{
      background: '#1f1f1f',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'center' : 'space-between',
        alignItems: 'center',
        gap: isMobile ? '2rem' : '1.5rem',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        {/* Left side - Logo and Copyright */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? '1rem' : '2rem',
        }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: isMobile ? '1.125rem' : '1.25rem',
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

        {/* Right side - Legal Links - Stacked Grid on Mobile */}
        <div style={{
          display: isMobile ? 'grid' : 'flex',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : undefined,
          flexDirection: isMobile ? undefined : 'row',
          flexWrap: isMobile ? undefined : 'wrap',
          justifyContent: isMobile ? undefined : 'flex-end',
          gap: isMobile ? '1rem' : '2rem',
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? '400px' : 'none',
        }}>
          <Link
            to="/legal/privacy-policy"
            style={{
              color: '#737373',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'color 0.2s',
              padding: isMobile ? '0.5rem' : '0',
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
              padding: isMobile ? '0.5rem' : '0',
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
              padding: isMobile ? '0.5rem' : '0',
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
              padding: isMobile ? '0.5rem' : '0',
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
              padding: isMobile ? '0.5rem' : '0',
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
              padding: isMobile ? '0.5rem' : '0',
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
    </footer>
  );
}
