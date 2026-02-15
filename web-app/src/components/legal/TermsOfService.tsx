import React, { useEffect } from 'react';
import { Header } from '../Header';

export default function TermsOfService() {
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
        }}>Terms of Service</h1>

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
            }}>1. Acceptance of Terms</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              By accessing or using Mintclip ("Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>2. Service Description</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Mintclip provides:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>YouTube transcript extraction from public videos</li>
              <li>AI-powered translation for non-English transcripts</li>
              <li>AI-generated summaries (short, topic-based, Q&A formats)</li>
              <li>Interactive chat with video transcripts</li>
              <li>Cloud storage for saved transcripts, summaries, and chats</li>
              <li>Chrome extension and web application interfaces</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>3. Account Registration</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>3.1 Eligibility</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You must be at least 13 years old to use this Service. By creating an account, you represent
              that you meet this age requirement and have the authority to agree to these Terms.
            </p>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>3.2 Account Security</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You are responsible for:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>4. Acceptable Use Policy</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>4.1 Permitted Use</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You may use Mintclip for:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Personal research and learning</li>
              <li>Educational purposes</li>
              <li>Content analysis and summarization</li>
              <li>Accessibility (transcript access for hearing impaired)</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>4.2 Prohibited Use</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You may NOT:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Violate any laws or third-party rights</li>
              <li>Access private or age-restricted YouTube videos without authorization</li>
              <li>Scrape, crawl, or automated bulk extraction (rate limits apply)</li>
              <li>Redistribute extracted transcripts for commercial purposes</li>
              <li>Attempt to reverse engineer, hack, or compromise the Service</li>
              <li>Use the Service to infringe copyright or intellectual property</li>
              <li>Share your account credentials with others</li>
              <li>Create multiple accounts to bypass quota limits</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>5. Subscription Plans and Payment</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>5.1 Free Tier</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Quota:</strong> 25 saved items maximum</li>
              <li><strong>Expiration:</strong> Items expire after 30 days</li>
              <li><strong>Features:</strong> Full access to extraction, summaries, chat</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>5.2 Premium Tier</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Quota:</strong> Unlimited saved items</li>
              <li><strong>Expiration:</strong> No expiration</li>
              <li><strong>Billing:</strong> Monthly or annual subscription</li>
              <li><strong>Cancellation:</strong> Cancel anytime (no refunds for partial months)</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>5.3 Payment Terms</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Payments processed via Stripe</li>
              <li>Automatic renewal unless cancelled</li>
              <li>Refunds available within 14 days of initial purchase</li>
              <li>Price changes: 30-day notice for existing subscribers</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>6. Intellectual Property</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>6.1 Service Content</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Mintclip and its original content (excluding user data) are protected by copyright, trademark,
              and other intellectual property laws. You may not copy, modify, or distribute our Service
              without permission.
            </p>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>6.2 User Content</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You retain ownership of your saved transcripts, summaries, and chat data. By using our Service,
              you grant us a limited license to store and process this data to provide the Service.
            </p>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>6.3 YouTube Content</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Extracted transcripts are derived from public YouTube videos. You must comply with YouTube's
              Terms of Service and respect copyright holders' rights when using extracted content.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>7. Disclaimers and Limitations</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>7.1 Service Availability</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We strive for 99.9% uptime but do not guarantee uninterrupted access. The Service may be
              unavailable due to maintenance, updates, or third-party API issues.
            </p>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>7.2 AI-Generated Content</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              AI summaries and translations are generated by Google Gemini. While we strive for accuracy,
              AI-generated content may contain errors or inaccuracies. You should verify critical information.
            </p>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>7.3 Limitation of Liability</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MINTCLIP SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>8. Termination</h2>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>8.1 Your Right to Terminate</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You may delete your account at any time via the Settings page. Upon deletion:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>All saved items are permanently deleted</li>
              <li>Active subscriptions are cancelled (no pro-rated refunds)</li>
              <li>Personal data is removed within 30 days</li>
            </ul>

            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              marginTop: '1.5rem',
              color: '#ffffff'
            }}>8.2 Our Right to Terminate</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We may suspend or terminate your account if you:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Violate these Terms of Service</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Abuse the Service (rate limit violations, hacking attempts)</li>
              <li>Fail to pay subscription fees (Premium accounts)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>9. Changes to Terms</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We may update these Terms periodically. Material changes will be notified via:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Email notification (for significant changes)</li>
              <li>In-app banner notification</li>
              <li>Updated "Last Updated" date</li>
            </ul>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Continued use after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>10. Governing Law</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved
              in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#22c55e'
            }}>11. Contact Information</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              For questions about these Terms:
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
