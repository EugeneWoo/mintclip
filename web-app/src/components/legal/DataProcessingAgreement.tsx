import React from 'react';

export default function DataProcessingAgreement() {
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
          Data Processing Agreement
        </h1>
        <p style={{ color: '#a3a3a3', fontSize: '1.125rem', marginBottom: '3rem' }}>Last Updated: February 11, 2026</p>

        <div style={{ color: '#ffffff', lineHeight: 1.7, fontSize: '1.0625rem' }}>
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>1. Parties</h2>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Data Controller:</strong> You (the Mintclip user)</li>
              <li><strong>Data Processor:</strong> Mintclip (providing transcript extraction services)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>2. Scope of Processing</h2>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.1 Subject Matter</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Processing of YouTube video transcripts, AI-generated summaries, and chat data.
            </p>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.2 Nature and Purpose</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Extract public YouTube transcripts</li>
              <li>Translate non-English transcripts using AI</li>
              <li>Generate summaries in multiple formats</li>
              <li>Provide interactive chat with transcript context</li>
              <li>Store data in Supabase database</li>
            </ul>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.3 Duration</h3>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              Processing continues for the duration of your Mintclip subscription, plus 30 days post-termination for backup retention.
            </p>

            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#ffffff' }}>2.4 Types of Personal Data</h3>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Account information (name, email)</li>
              <li>YouTube URLs you process</li>
              <li>Saved transcripts, summaries, chat history</li>
              <li>Usage metadata (timestamps, actions)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>3. Processor Obligations</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>Mintclip shall:</p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Process data only on your instructions (via the Service)</li>
              <li>Ensure confidentiality of personnel</li>
              <li>Implement appropriate technical and organizational measures (encryption, access controls)</li>
              <li>Assist with GDPR rights requests (access, erasure, portability)</li>
              <li>Notify you of data breaches within 72 hours</li>
              <li>Delete or return data upon termination (unless legally required to retain)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>4. Sub-Processors</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>Mintclip uses the following sub-processors:</p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Supabase (USA):</strong> Database hosting and authentication</li>
              <li><strong>Google Cloud (USA):</strong> Gemini AI for summaries and translations</li>
              <li><strong>Railway (USA):</strong> Backend application hosting</li>
            </ul>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We will notify you of any changes to sub-processors via email (30-day notice).
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>5. Security Measures</h2>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Encryption:</strong> TLS 1.3 for data in transit, AES-256 at rest</li>
              <li><strong>Access Control:</strong> Role-based access, multi-factor authentication</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring and logging</li>
              <li><strong>Backups:</strong> Daily encrypted backups with 30-day retention</li>
              <li><strong>Audits:</strong> Annual third-party security audits</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>6. Data Subject Rights</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              To assist with GDPR rights requests, contact: <a href="mailto:dpo@mintclip.ai" style={{ color: '#22c55e', textDecoration: 'underline' }}>dpo@mintclip.ai</a>
            </p>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              We will respond within 30 days and provide necessary data exports in JSON format.
            </p>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>7. Data Breach Notification</h2>
            <p style={{ color: '#e5e5e5', marginBottom: '1rem' }}>
              In the event of a personal data breach, Mintclip will notify you within 72 hours via email,
              including:
            </p>
            <ul style={{ color: '#e5e5e5', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Nature of the breach</li>
              <li>Categories and number of affected data subjects</li>
              <li>Likely consequences</li>
              <li>Measures taken or proposed to address the breach</li>
            </ul>
          </section>

          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#22c55e' }}>8. Contact</h2>
            <div style={{ background: '#1f1f1f', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem' }}>
              <p style={{ color: '#e5e5e5', marginBottom: '0.5rem' }}><strong>Email:</strong> <a href="mailto:dpo@mintclip.ai" style={{ color: '#22c55e', textDecoration: 'underline' }}>dpo@mintclip.ai</a></p>
              <p style={{ color: '#e5e5e5', marginBottom: '0' }}><strong>Subject Line:</strong> "DPA Request - [Your Company Name]"</p>
            </div>
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
