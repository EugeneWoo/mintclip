/**
 * Popup UI
 * Sign up/authentication page that opens when extension icon is clicked
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, getAuthState } from './auth';

type AuthMode = 'signin' | 'signup';

function Popup(): React.JSX.Element {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check if already authenticated
  useEffect(() => {
    getAuthState().then((state) => {
      if (state.isAuthenticated) {
        setIsAuthenticated(true);
      }
    });
  }, []);

  const handleSignInWithGoogle = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await signInWithGoogle();

      if (result.success) {
        // Close popup immediately after successful auth
        window.close();
      } else {
        setError(result.error || 'Failed to sign in');
        setIsAuthenticating(false);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred');
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = authMode === 'signup'
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (result.success) {
        // Close popup immediately after successful auth
        window.close();
      } else {
        setError(result.error || 'Failed to authenticate');
        setIsAuthenticating(false);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred');
      setIsAuthenticating(false);
    }
  };

  // No success screen needed - popup closes immediately after auth
  return (
    <div
      style={{
        width: '400px',
        padding: '40px 20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}
        >
          ✨
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600 }}>Mintclip</h1>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          AI-powered YouTube learning
        </p>
      </div>

      {/* Benefits */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px' }}>📝</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              Instant Transcripts
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Get video transcripts with one click
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px' }}>✨</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              AI Summaries
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Generate intelligent summaries and key insights
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>💬</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              Chat with Videos
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Ask questions and get timestamp-referenced answers
            </div>
          </div>
        </div>
      </div>

      {/* Email Form */}
      <form onSubmit={handleEmailAuth} style={{ marginBottom: '16px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isAuthenticating}
          required
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isAuthenticating}
          required
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={isAuthenticating}
          style={{
            width: '100%',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
            opacity: isAuthenticating ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          }}
        >
          {isAuthenticating ? 'Please wait...' : (authMode === 'signup' ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      {/* Toggle Sign In / Sign Up */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => {
            setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          disabled={isAuthenticating}
          style={{
            background: 'none',
            border: 'none',
            color: '#667eea',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
        <span style={{ fontSize: '12px', color: '#999' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
      </div>

      {/* Google Sign In Button */}
      <button
        onClick={handleSignInWithGoogle}
        disabled={isAuthenticating}
        style={{
          width: '100%',
          padding: '12px 24px',
          fontSize: '15px',
          fontWeight: 600,
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isAuthenticating ? 'not-allowed' : 'pointer',
          opacity: isAuthenticating ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(66, 133, 244, 0.3)',
        }}
      >
        {isAuthenticating ? (
          <>
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c33',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {/* Footer */}
      <p
        style={{
          fontSize: '12px',
          color: '#999',
          textAlign: 'center',
          marginTop: '24px',
          lineHeight: '1.5',
        }}
      >
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

