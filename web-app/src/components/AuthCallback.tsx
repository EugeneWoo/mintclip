/**
 * Auth Callback Component
 * Handles Google OAuth redirect and exchanges code for JWT token
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      // Exchange code for JWT token via backend
      const response = await fetch('http://localhost:8000/api/auth/google/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: window.location.origin + '/auth/callback',
        }),
      });

      const data = await response.json();

      if (!data.tokens || !data.tokens.access_token) {
        setError(data.message || 'Failed to authenticate');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      // Store JWT token in localStorage with expiration time
      const expiresAt = Date.now() + (data.tokens.expires_in * 1000);
      localStorage.setItem('mintclip_access_token', data.tokens.access_token);
      localStorage.setItem('mintclip_refresh_token', data.tokens.refresh_token);
      localStorage.setItem('mintclip_token_expires_at', expiresAt.toString());
      if (data.user) {
        localStorage.setItem('mintclip_user', JSON.stringify(data.user));
      }

      // Redirect to dashboard directly (forces page reload to update auth state)
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Auth callback error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      setTimeout(() => navigate('/'), 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171717',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
      }}>
        {error ? (
          <>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
            }}>❌</div>
            <h1 style={{
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}>
              Authentication Failed
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              {error}
            </p>
            <p style={{
              marginTop: '1rem',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '0.9rem',
            }}>
              Redirecting to home...
            </p>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              animation: 'spin 1s linear infinite',
            }}>⚙️</div>
            <h1 style={{
              fontSize: '1.5rem',
              marginBottom: '1rem',
            }}>
              Signing you in...
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              Please wait while we complete authentication
            </p>
          </>
        )}
      </div>
    </div>
  );
}
