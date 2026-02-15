/**
 * Auth Callback Component
 * Handles Google OAuth redirect and exchanges code for JWT token
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback(): React.JSX.Element {
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

      console.log('[AuthCallback] Processing OAuth callback', {
        hasCode: !!code,
        hasError: !!errorParam,
        url: window.location.href
      });

      if (errorParam) {
        const errorDescription = params.get('error_description') || errorParam;
        console.error('[AuthCallback] OAuth error from Google:', errorParam, errorDescription);
        // Redirect immediately to landing with error param (no visible error screen)
        navigate('/?auth_error=true', { replace: true });
        return;
      }

      if (!code) {
        console.error('[AuthCallback] No authorization code in URL');
        // Redirect immediately to landing with error param (no visible error screen)
        navigate('/?auth_error=true', { replace: true });
        return;
      }

      // Exchange code for JWT token via backend
      console.log('[AuthCallback] Exchanging code for tokens...');
      const redirectUri = window.location.origin + '/auth/callback';

      const response = await fetch('http://localhost:8000/api/auth/google/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || errorData.message || 'Failed to authenticate';
        console.error('[AuthCallback] Backend auth error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        // Redirect immediately to landing with error param (no visible error screen)
        navigate('/?auth_error=true', { replace: true });
        return;
      }

      const data = await response.json();
      console.log('[AuthCallback] Token exchange successful', {
        hasTokens: !!data.tokens,
        hasUser: !!data.user
      });

      if (!data.tokens || !data.tokens.access_token) {
        console.error('[AuthCallback] No tokens in response:', data);
        // Redirect immediately to landing with error param (no visible error screen)
        navigate('/?auth_error=true', { replace: true });
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

      console.log('[AuthCallback] Auth successful, redirecting to dashboard');

      // Dispatch custom event to notify App.tsx that auth state changed
      window.dispatchEvent(new Event('auth-changed'));

      // Navigate to dashboard using React Router (no flash of error screen)
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('[AuthCallback] Unexpected error:', error);
      // Redirect immediately to landing with error param (no visible error screen)
      navigate('/?auth_error=true', { replace: true });
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
      </div>
    </div>
  );
}
