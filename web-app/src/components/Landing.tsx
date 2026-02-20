/**
 * Landing Page Component
 * Homepage with Google OAuth sign-in
 * Mobile-responsive for Safari and Chrome
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from './Footer';

const CAROUSEL_SLIDES = [
  { src: '/screenshots/slide-1-timestamps.jpg', alt: 'Jump to Your Favorite Scenes with Clickable Timestamps' },
  { src: '/screenshots/slide-2-translate.jpg', alt: 'Watch in Any Language - Translate, Summarise, Chat in English' },
  { src: '/screenshots/slide-3-summary.jpg', alt: 'Stay Ahead of Long Videos - Select from 3 Summary Formats' },
  { src: '/screenshots/slide-4-chat.jpg', alt: 'Chat with Your Videos - AI-powered answers from the content' },
  { src: '/screenshots/slide-5-save-download.jpg', alt: 'Save & Download - Revisit your Video Content Anytime' },
];

export function Landing(): React.JSX.Element {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for auth error from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    if (error) {
      setAuthError('Oops your sign-in failed. Try again later!');
      // Clear the error from URL without page reload
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Auto-advance carousel every 4 seconds
  const startAutoPlay = useCallback(() => {
    autoPlayRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [startAutoPlay]);

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    // Reset autoplay timer on manual nav
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    startAutoPlay();
  };

  const handleSignIn = () => {
    // Clear any previous error
    setAuthError(null);

    // Redirect to Google OAuth
    const CLIENT_ID = '210145228416-krofb2li6a68ng13el76rs301e6tgmb2.apps.googleusercontent.com';
    const REDIRECT_URI = encodeURIComponent(window.location.origin + '/auth/callback');
    const SCOPES = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;

    window.location.href = authUrl;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#171717',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Navigation */}
      <nav
        className="nav-mobile"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div
          className="nav-content"
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(23, 23, 23, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
          }}
        >
          <div
            className="logo"
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src="/icon-48.png"
              alt="Mintclip"
              style={{ borderRadius: '10px' }}
            />
            {!isMobile && 'Mintclip'}
          </div>

          <button
            onClick={handleSignIn}
            style={{
              padding: isMobile ? '0.5rem 1rem' : '0.5rem 1.25rem',
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? 'Sign In' : 'Sign In with Google'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: isMobile ? '120px' : '100px',
          paddingBottom: isMobile ? '3rem' : '4rem',
          paddingLeft: isMobile ? '1.5rem' : '2rem',
          paddingRight: isMobile ? '1.5rem' : '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Logo/Icon + Brand Name */}
          <div
            style={{
              marginBottom: isMobile ? '1.5rem' : '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '1.25rem' : '2rem',
            }}
          >
            <img
              src="/icon-128.png"
              alt="Mintclip"
              style={{
                width: isMobile ? '80px' : '120px',
                height: isMobile ? '80px' : '120px',
                borderRadius: isMobile ? '20px' : '30px',
                boxShadow: '0 20px 60px rgba(34, 197, 94, 0.3)',
              }}
            />
            <span
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 800,
                fontSize: isMobile ? '2.5rem' : '4rem',
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              Mintclip
            </span>
          </div>

          {/* Headline */}
          <h1
            className="heading-xl"
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontSize: isMobile ? '1.6rem' : '2.4rem',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI-Powered YouTube Learning
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: isMobile ? '1rem' : '1.25rem',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: isMobile ? '2rem' : '3rem',
              lineHeight: '1.6',
            }}
          >
            Extract transcripts, generate summaries, and chat with any YouTube video.
            Save your insights and access them anywhere.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleSignIn}
            style={{
              padding: isMobile ? '0.875rem 2rem' : '1rem 2.5rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: isMobile ? '1rem' : '1.125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M19.6 10c0-.637-.057-1.251-.164-1.84H10v3.481h5.382c-.232 1.251-.937 2.311-1.995 3.019v2.476h3.233C18.377 15.548 19.6 13.018 19.6 10z"
                fill="#4285F4"
              />
              <path
                d="M10 20c2.7 0 4.964-.894 6.618-2.424l-3.233-2.476c-.894.6-2.038.954-3.385.954-2.605 0-4.81-1.76-5.596-4.123H1.13v2.554C2.78 17.738 6.118 20 10 20z"
                fill="#34A853"
              />
              <path
                d="M4.404 11.931c-.2-.6-.314-1.24-.314-1.905 0-.665.114-1.305.314-1.905V5.567H1.13C.41 6.987 0 8.443 0 10.026c0 1.583.41 3.039 1.13 4.459l3.274-2.554z"
                fill="#FBBC05"
              />
              <path
                d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.958.977 12.694 0 10 0 6.118 0 2.78 2.262 1.13 5.515l3.274 2.554C5.19 5.737 7.395 3.977 10 3.977z"
                fill="#EA4335"
              />
            </svg>
            Get Started with Google
          </button>

          {/* Error Message */}
          {authError && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem',
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {authError}
            </div>
          )}

          {/* Screenshot Carousel - 3D Curved Cards */}
          <div
            style={{
              marginTop: isMobile ? '3rem' : '4rem',
              position: 'relative',
            }}
          >
            {/* 3D Carousel Container */}
            <div
              style={{
                position: 'relative',
                height: isMobile ? '200px' : '280px',
                perspective: '1000px',
              }}
            >
              {CAROUSEL_SLIDES.map((slide, i) => {
                // Calculate distance from active slide (handles wrap-around)
                const distance = ((i - activeSlide + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
                const isPrev = distance === CAROUSEL_SLIDES.length - 1;
                const offset = isPrev ? -1 : distance;

                // Style based on position relative to active
                let transform = '';
                let zIndex = 10 - Math.abs(offset);
                let opacity = 1;

                if (offset === 0) {
                  // Active slide - center
                  transform = 'translateX(0) translateZ(0) rotateY(0deg)';
                  zIndex = 20;
                } else if (offset === 1 || offset === -1) {
                  // Adjacent slides
                  const xDir = offset > 0 ? 1 : -1;
                  transform = `translateX(${xDir * 55}%) translateZ(-150px) rotateY(${-xDir * 25}deg)`;
                  opacity = 0.7;
                } else if (offset === 2 || offset === -2) {
                  // Further slides
                  const xDir = offset > 0 ? 1 : -1;
                  transform = `translateX(${xDir * 85}%) translateZ(-250px) rotateY(${-xDir * 35}deg)`;
                  opacity = 0.4;
                } else {
                  // Far slides - hide
                  opacity = 0;
                }

                return (
                  <div
                    key={i}
                    onClick={() => goToSlide(i)}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: isMobile ? '60%' : '56%',
                      aspectRatio: '16/9',
                      marginLeft: isMobile ? '-30%' : '-28%',
                      marginTop: '-10%',
                      transformOrigin: 'center center',
                      transform,
                      zIndex,
                      opacity,
                      transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      cursor: 'pointer',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: offset === 0
                        ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                        : '0 10px 30px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: '0% 0%',
                        display: 'block',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
