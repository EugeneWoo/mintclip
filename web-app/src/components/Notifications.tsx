/**
 * Notifications Component
 * Manages user notification preferences including marketing consent
 * GDPR compliant - allows users to opt-in/opt-out of marketing communications
 */

import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../utils/auth';
import { Header } from './Header';
import { BACKEND_URL } from '../config';

export function Notifications(): React.JSX.Element {
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load current marketing consent state on mount
  useEffect(() => {
    loadMarketingPreference();
  }, []);

  const loadMarketingPreference = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMarketingConsent(data.marketing_consent || false);
      }
    } catch (error) {
      console.error('Failed to load marketing preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMarketingConsent = async (newValue: boolean) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/gdpr/marketing-consent?consent=${newValue}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMarketingConsent(newValue);
        setSaveMessage(newValue ? '✓ Opted in to marketing communications' : '✓ Opted out of marketing communications');
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Failed to update preference: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update marketing consent:', error);
      setSaveMessage('Failed to update preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171717',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <Header backText="← Back to Dashboard" backUrl="/dashboard" />

      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '8rem 2rem 4rem',
      }}>
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(2rem, 5vw, 2.5rem)',
          color: '#ffffff',
          marginBottom: '3rem',
        }}>
          Notification Preferences
        </h1>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: '#737373' }}>
            Loading preferences...
          </div>
        ) : (
          <>
            {/* Marketing Communications Section */}
            <div style={{
              background: '#1f1f1f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '2rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '2rem',
              }}>
                {/* Left side - Text */}
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: '#ffffff',
                    marginBottom: '0.5rem',
                  }}>
                    Marketing Communications
                  </h2>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#a3a3a3',
                    lineHeight: '1.6',
                    marginBottom: '1rem',
                  }}>
                    I want to receive marketing communications and product updates.
                  </p>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#737373',
                    lineHeight: '1.5',
                  }}>
                    Receive occasional emails about new features, product updates, and special offers.
                    You can opt out at any time. This does not affect essential service emails like
                    password resets or account notifications.
                  </p>
                </div>

                {/* Right side - Toggle */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <button
                    onClick={() => !isSaving && handleToggleMarketingConsent(!marketingConsent)}
                    disabled={isSaving}
                    style={{
                      position: 'relative',
                      width: '56px',
                      height: '32px',
                      background: marketingConsent ? '#22c55e' : '#404040',
                      borderRadius: '16px',
                      border: 'none',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: marketingConsent ? '28px' : '4px',
                      width: '24px',
                      height: '24px',
                      background: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }} />
                  </button>
                  <span style={{
                    fontSize: '0.75rem',
                    color: marketingConsent ? '#22c55e' : '#737373',
                    fontWeight: 500,
                  }}>
                    {marketingConsent ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Save Message */}
              {saveMessage && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: saveMessage.includes('✓') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${saveMessage.includes('✓') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: saveMessage.includes('✓') ? '#22c55e' : '#ef4444',
                }}>
                  {saveMessage}
                </div>
              )}
            </div>

            {/* GDPR Information */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'rgba(34, 197, 94, 0.05)',
              border: '1px solid rgba(34, 197, 94, 0.15)',
              borderRadius: '12px',
            }}>
              <h3 style={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#22c55e',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span>🛡️</span>
                Your Privacy Rights
              </h3>
              <p style={{
                fontSize: '0.8125rem',
                color: '#a3a3a3',
                lineHeight: '1.6',
              }}>
                Under GDPR regulations, you have full control over your marketing preferences.
                Your consent is voluntary and you can change it at any time without affecting
                your access to Mintclip services. For more information, see our{' '}
                <a
                  href="/legal/privacy-policy"
                  style={{
                    color: '#22c55e',
                    textDecoration: 'underline',
                  }}
                >
                  Privacy Policy
                </a>.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
