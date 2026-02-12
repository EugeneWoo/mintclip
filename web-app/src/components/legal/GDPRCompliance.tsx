import React from 'react';

export default function GDPRCompliance() {
  return (
    <div style={{ minHeight: '100vh', background: '#171717', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '1200px', padding: '0 2rem', zIndex: 1000 }}>
        <div style={{ background: 'rgba(23, 23, 23, 0.8)', backdropFilter: 'blur(20px)', borderRadius: '100px', padding: '1rem 1.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: '40px', height: '40px', background: '#22c55e', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📹</div>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>Mintclip</span>
          </a>
          <a href="/" style={{ color: '#a3a3a3', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>← Back to Home</a>
        </div>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '8rem 2rem 4rem' }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem', background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          GDPR Compliance
        </h1>
        <p style={{ color: '#a3a3a3', fontSize: '1.125rem', marginBottom: '3rem' }}>Last Updated: February 11, 2026</p>

        <div style={{ color: '#ffffff', lineHeight: 1.7, fontSize: '1.0625rem' }}>
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>1. Your GDPR Rights</h2>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Delete your account and data</li>
              <li><strong>Right to Restriction:</strong> Limit how we process your data</li>
              <li><strong>Right to Data Portability:</strong> Export your data in JSON format</li>
              <li><strong>Right to Object:</strong> Opt-out of certain processing activities</li>
              <li><strong>Right to Withdraw Consent:</strong> Revoke consent at any time</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>2. Legal Basis for Processing</h2>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Contract Performance:</strong> Account management, service delivery</li>
              <li><strong>Legitimate Interest:</strong> Fraud prevention, security</li>
              <li><strong>Consent:</strong> Analytics, marketing (opt-in)</li>
              <li><strong>Legal Obligation:</strong> Tax, anti-money laundering</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>3. Data Transfers</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Data may be transferred outside the EU/EEA to:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>United States:</strong> Supabase (Standard Contractual Clauses + Privacy Shield successor)</li>
              <li><strong>United States:</strong> Google Cloud (Gemini AI) - Standard Contractual Clauses</li>
            </ul>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              All transfers comply with GDPR Chapter V requirements.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>4. Data Protection Officer</h2>
            <div style={{ background: '#1f1f1f', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem' }}>
              <p style={{ color: '#e5e5e5', marginBottom: '0.5rem' }}><strong>Email:</strong> <a href="mailto:dpo@mintclip.ai" style={{ color: '#22c55e', textDecoration: 'underline' }}>dpo@mintclip.ai</a></p>
              <p style={{ color: '#e5e5e5', marginBottom: '0' }}><strong>Response Time:</strong> 30 days (can be extended to 60 days for complex requests)</p>
            </div>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>5. Supervisory Authority</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              You have the right to lodge a complaint with your local data protection authority if you believe
              your GDPR rights have been violated. Contact information for EU data protection authorities:
              <a href="https://edpb.europa.eu/about-edpb/board/members_en" style={{ color: '#22c55e', textDecoration: 'underline' }}> EDPB Member List</a>
            </p>
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
