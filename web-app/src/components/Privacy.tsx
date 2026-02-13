export function Privacy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#171717',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '2rem 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 2rem',
        }}>
          <a href="/" style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#ffffff',
            textDecoration: 'none',
          }}>
            Mintclip
          </a>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '3rem 2rem',
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '600',
          marginBottom: '1rem',
        }}>
          Privacy Policy
        </h1>

        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '3rem',
        }}>
          Last Updated: January 23, 2026
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Overview
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem',
          }}>
            Mintclip is a Chrome extension that provides AI-powered transcripts, summaries, and chat functionality for YouTube videos. This privacy policy explains what data we collect, how we use it, and your rights regarding your information.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Data We Collect
          </h2>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Information You Provide
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>YouTube Video IDs:</strong> When you use Mintclip on a YouTube video, we process the video ID to fetch transcripts and generate summaries.</li>
            <li><strong>Chat Messages:</strong> Questions you ask in the chat feature are sent to our servers for AI processing.</li>
          </ul>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Information Collected Automatically
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>Video Transcripts:</strong> We fetch publicly available YouTube transcripts through official APIs.</li>
            <li><strong>Language Preferences:</strong> Your selected language for transcripts and translations.</li>
          </ul>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Information We Do NOT Collect
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li>Personal identification information (name, email, address)</li>
            <li>YouTube account credentials or login information</li>
            <li>Browsing history outside of Mintclip usage</li>
            <li>Payment or financial information</li>
            <li>Location data</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            How We Use Your Data
          </h2>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Primary Uses
          </h3>
          <ol style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>Transcript Extraction:</strong> Fetching video transcripts from YouTube to display in the extension.</li>
            <li><strong>AI Summarization:</strong> Generating concise summaries of video content using Google Gemini AI.</li>
            <li><strong>Translation:</strong> Translating transcripts to English when requested.</li>
            <li><strong>Chat Responses:</strong> Answering your questions about video content using AI.</li>
          </ol>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Data Processing
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li>All transcript and summary processing occurs on our secure backend servers.</li>
            <li>We use Google Gemini AI (gemini-2.0-flash-lite) for summarization and chat features.</li>
            <li>No data is sold to third parties.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Data Storage and Caching
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem',
          }}>
            To improve performance and reduce API calls, we cache certain data:
          </p>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)' }}>Data Type</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)' }}>Cache Duration</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'rgba(255, 255, 255, 0.9)' }}>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Transcripts</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>1 hour</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Reduce YouTube API calls</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Summaries</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>7 days</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Avoid redundant AI processing</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Translations</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>7 days</td>
                <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Improve response times</td>
              </tr>
            </tbody>
          </table>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
          }}>
            Cached data is stored on our servers and is automatically deleted after the specified duration.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Third-Party Services
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '1rem',
          }}>
            Mintclip uses the following third-party services:
          </p>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            YouTube Data API
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>Purpose:</strong> Fetching video transcripts and metadata</li>
            <li><strong>Data Shared:</strong> Video IDs</li>
            <li><strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" style={{ color: '#60a5fa' }}>Google Privacy Policy</a></li>
          </ul>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            marginTop: '1.5rem',
          }}>
            Google Gemini AI
          </h3>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>Purpose:</strong> Generating summaries and chat responses</li>
            <li><strong>Data Shared:</strong> Video transcripts, user questions</li>
            <li><strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" style={{ color: '#60a5fa' }}>Google AI Privacy</a></li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Data Security
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '0.5rem',
          }}>
            We implement appropriate security measures to protect your data:
          </p>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li>HTTPS encryption for all data transmission</li>
            <li>Secure server infrastructure</li>
            <li>No persistent storage of personal data</li>
            <li>Regular security updates</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Your Rights
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '0.5rem',
          }}>
            You have the right to:
          </p>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>Access:</strong> Request information about data we process</li>
            <li><strong>Deletion:</strong> Request deletion of cached data associated with specific videos</li>
            <li><strong>Opt-Out:</strong> Stop using the extension at any time</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Children's Privacy
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
          }}>
            Mintclip is not intended for children under 13 years of age. We do not knowingly collect data from children.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Changes to This Policy
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
          }}>
            We may update this privacy policy periodically. Changes will be posted on this page with an updated revision date.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Contact Us
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '0.5rem',
          }}>
            For privacy-related questions or concerns, please contact us:
          </p>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li><strong>GitHub Issues:</strong> <a href="https://github.com/mintclip/mintclip/issues" style={{ color: '#60a5fa' }}>Mintclip Repository</a></li>
            <li><strong>Email:</strong> privacy@mintclip.app</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
          }}>
            Compliance
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginBottom: '0.5rem',
          }}>
            This extension complies with:
          </p>
          <ul style={{
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.6',
            marginLeft: '1.5rem',
          }}>
            <li>Chrome Web Store Developer Program Policies</li>
            <li>Google API Services User Data Policy</li>
            <li>GDPR (General Data Protection Regulation)</li>
            <li>CCPA (California Consumer Privacy Act)</li>
          </ul>
        </section>

        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
          }}>
            By using Mintclip, you agree to this privacy policy.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '4rem',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 2rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '0.875rem',
        }}>
          © 2026 Mintclip. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
