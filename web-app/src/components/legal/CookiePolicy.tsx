import React, { useEffect } from 'react';
import { Header } from '../Header';

export default function CookiePolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#171717', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      <Header backText="← Back to Home" backUrl="/" />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Cookie Policy</h1>

        <p style={{ color: '#a3a3a3', fontSize: '1.125rem', marginBottom: '3rem' }}>Last Updated: February 11, 2026</p>

        <div style={{ color: '#ffffff', lineHeight: 1.7, fontSize: '1.0625rem' }}>
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>1. What Are Cookies?</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Cookies are small text files stored on your device when you visit websites. We use minimal cookies and browser storage (localStorage) to provide essential functionality.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>2. Cookies We Use</h2>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.1 Essential (Always Active)</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>mintclip_access_token:</strong> JWT authentication token (localStorage, 1 hour expiry)</li>
              <li><strong>mintclip_refresh_token:</strong> Token refresh (localStorage, 30-90 days)</li>
              <li><strong>mintclip_user:</strong> User profile data (localStorage, session)</li>
            </ul>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.2 Functional (Optional)</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>theme_preference:</strong> Dark/light mode setting</li>
              <li><strong>language_preference:</strong> UI language selection</li>
              <li><strong>filter_state:</strong> Saved filter settings in Dashboard/Library</li>
            </ul>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.3 Analytics (Opt-Out Available)</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>_ga:</strong> Google Analytics (if enabled)</li>
              <li><strong>_gid:</strong> Session tracking (if enabled)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>3. Managing Cookies</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>You can control cookies via:</p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Browser Settings:</strong> Block or delete cookies (may affect functionality)</li>
              <li><strong>Analytics Opt-Out:</strong> Settings → Privacy → Disable Analytics</li>
              <li><strong>Clear Data:</strong> Settings → Account → Clear All Data</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>4. Third-Party Cookies</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>We do NOT use third-party advertising cookies. The only third-party services are:</p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Google OAuth:</strong> Authentication (session cookies)</li>
              <li><strong>Supabase:</strong> Database authentication (session cookies)</li>
              <li><strong>Google Analytics:</strong> Optional analytics (can be disabled)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>5. Contact Us</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>Questions about cookies? Contact: <a href="mailto:getmintclip@gmail.com" style={{ color: '#22c55e', textDecoration: 'underline' }}>getmintclip@gmail.com</a></p>
          </section>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '3rem 2rem', background: '#1f1f1f' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <p style={{ color: '#737373', fontSize: '0.9375rem' }}>© 2026 Mintclip. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <a href="/legal/privacy-policy" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem' }}>Privacy Policy</a>
            <a href="/legal/terms-of-service" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem' }}>Terms of Service</a>
            <a href="/legal/cookie-policy" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem' }}>Cookie Policy</a>
            <a href="/legal/gdpr-compliance" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem' }}>GDPR</a>
            <a href="/legal/data-processing-agreement" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem' }}>DPA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
