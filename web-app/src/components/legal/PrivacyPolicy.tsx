import React, { useEffect } from 'react';
import { Header } from '../Header';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171717',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Navigation */}
      <Header backText="← Back to Home" backUrl="/" />

      {/* Main Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '8rem 2rem 4rem'
      }}>
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Privacy Policy</h1>

        <p style={{ color: '#a3a3a3', fontSize: '1.125rem', marginBottom: '3rem' }}>
          Last Updated: February 11, 2026
        </p>

        <div style={{
          color: '#ffffff',
          lineHeight: 1.7,
          fontSize: '1.0625rem'
        }}>
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>1. Introduction</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Welcome to Mintclip. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our
              YouTube transcript extraction and AI summarization services.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>2. Information We Collect</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>2.1 Account Information</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              When you sign in with Google OAuth, we collect:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your Google profile picture</li>
              <li>Google user ID</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>2.2 Usage Data</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We collect information about how you use our service:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>YouTube URLs you process</li>
              <li>Transcripts, summaries, and chat conversations you save</li>
              <li>Timestamps of saved items</li>
              <li>Browser type and version</li>
              <li>IP address (anonymized)</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>2.3 Third-Party Data</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We access publicly available YouTube video data via the YouTube Transcript API, including:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Video titles and thumbnails</li>
              <li>Public transcripts and captions</li>
              <li>Video metadata (channel, duration)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>3. How We Use Your Information</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We use your information to:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Authenticate your account and maintain your session</li>
              <li>Extract and translate YouTube transcripts</li>
              <li>Generate AI-powered summaries using commercial large language models</li>
              <li>Provide interactive chat functionality</li>
              <li>Store your saved transcripts, summaries, and chat history</li>
              <li>Enforce quota limits (25 items free, unlimited premium)</li>
              <li>Improve our service quality and user experience</li>
              <li>Send important service updates (account, security)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>4. Data Storage and Security</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>4.1 Data Storage</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Your data is stored securely using:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Supabase:</strong> User accounts and saved items (encrypted at rest)</li>
              <li><strong>In-Memory Cache:</strong> Temporary transcript/summary caching (auto-expires)</li>
              <li><strong>JWT Tokens:</strong> Stored in your browser's localStorage (client-side only)</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>4.2 Data Retention</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Free Tier:</strong> Saved items expire after 30 days</li>
              <li><strong>Premium Tier:</strong> No expiration, unlimited storage</li>
              <li><strong>Cache:</strong> Transcripts (30 days), Summaries (7 days), Translations (7 days)</li>
              <li><strong>Account Data:</strong> Retained until you delete your account</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>4.3 Security Measures</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>JWT token-based authentication with automatic refresh</li>
              <li>Secure password hashing (bcrypt) for internal accounts</li>
              <li>Regular security audits and vulnerability scanning</li>
              <li>Row-level security policies in Supabase</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>5. Third-Party Services</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We integrate with the following third-party services:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Google OAuth:</strong> Authentication (see <a href="https://policies.google.com/privacy" style={{ color: '#22c55e', textDecoration: 'underline' }}>Google Privacy Policy</a>)</li>
              <li><strong>Google Gemini AI:</strong> AI summaries and translations (see <a href="https://ai.google/responsibility/principles/" style={{ color: '#22c55e', textDecoration: 'underline' }}>Google AI Principles</a>)</li>
              <li><strong>YouTube Transcript API:</strong> Public transcript extraction</li>
              <li><strong>Supabase:</strong> Database and authentication (see <a href="https://supabase.com/privacy" style={{ color: '#22c55e', textDecoration: 'underline' }}>Supabase Privacy</a>)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>6. Your Rights (GDPR)</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Under GDPR, you have the right to:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Delete your account and all associated data</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Portability:</strong> Export your data in machine-readable format</li>
              <li><strong>Object:</strong> Opt-out of certain data processing activities</li>
            </ul>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              To exercise these rights, contact us at <a href="mailto:getmintclip@gmail.com" style={{ color: '#22c55e', textDecoration: 'underline' }}>getmintclip@gmail.com</a>
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>7. Cookies and Tracking</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We use minimal cookies and local storage:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Essential:</strong> JWT tokens for authentication (localStorage)</li>
              <li><strong>Functional:</strong> User preferences (theme, language)</li>
              <li><strong>Analytics:</strong> Anonymized usage statistics (optional, opt-out available)</li>
            </ul>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              See our <a href="/legal/cookie-policy" style={{ color: '#22c55e', textDecoration: 'underline' }}>Cookie Policy</a> for details.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>8. Children's Privacy</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Mintclip is not intended for users under 13 years old. We do not knowingly collect data
              from children. If you believe a child has provided us with personal information, please
              contact us immediately.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>9. Changes to This Policy</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We may update this Privacy Policy periodically. We will notify you of significant changes via:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Email notification (for material changes)</li>
              <li>In-app banner notification</li>
              <li>Updated "Last Updated" date at the top of this page</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>10. Contact Us</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              For privacy-related questions or requests:
            </p>
            <div style={{
              background: '#1f1f1f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginTop: '1rem'
            }}>
              <p style={{ color: '#e5e5e5', marginBottom: '0' }}><strong>Email:</strong> <a href="mailto:getmintclip@gmail.com" style={{ color: '#22c55e', textDecoration: 'underline' }}>getmintclip@gmail.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '3rem 2rem',
        background: '#1f1f1f'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <p style={{ color: '#737373', fontSize: '0.9375rem' }}>
            © 2026 Mintclip. All rights reserved.
          </p>
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
