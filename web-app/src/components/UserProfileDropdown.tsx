/**
 * UserProfileDropdown Component
 * Displays user's initial with dropdown menu for account management
 * GDPR compliant with Sign Out, Delete Account, and Privacy options
 */

import React, { useState, useEffect, useRef } from 'react';
import { signOut, getAuthToken } from '../utils/auth';
import { BACKEND_URL } from '../config';

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
}

interface UserProfileDropdownProps {
  onDeleteAccount?: () => void;
}

export function UserProfileDropdown({ onDeleteAccount }: UserProfileDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        // Store user data in localStorage for fallback
        localStorage.setItem('mintclip_user', JSON.stringify(data));
      } else {
        // Fallback to localStorage if API fails
        const storedUser = localStorage.getItem('mintclip_user');
        if (storedUser) {
          setUserProfile(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Fallback to localStorage
      const storedUser = localStorage.getItem('mintclip_user');
      if (storedUser) {
        setUserProfile(JSON.parse(storedUser));
      }
    }
  };

  const getUserInitial = (): string => {
    if (userProfile?.display_name) {
      return userProfile.display_name.charAt(0).toUpperCase();
    }
    if (userProfile?.email) {
      return userProfile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleSignOut = async () => {
    try {
      const token = await getAuthToken();

      // Call backend logout endpoint
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and redirect
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account?\n\n' +
      'This will permanently delete:\n' +
      '• All your saved videos and content\n' +
      '• Your account data and preferences\n' +
      '• Your usage history\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    // Double confirmation for destructive action
    const doubleConfirm = window.confirm(
      'FINAL CONFIRMATION\n\n' +
      'Are you absolutely sure? This will permanently delete all your data and cannot be recovered.'
    );

    if (!doubleConfirm) return;

    try {
      const token = await getAuthToken();

      const response = await fetch(`${BACKEND_URL}/api/auth/gdpr/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Your account deletion request has been submitted. You will be signed out now.');
        await signOut();
      } else {
        const data = await response.json();
        alert(`Failed to delete account: ${data.detail || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert('Failed to delete account. Please try again.');
    }

    if (onDeleteAccount) {
      onDeleteAccount();
    }
  };

  const handleExportData = async () => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${BACKEND_URL}/api/auth/gdpr/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Convert JSON data to downloadable file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mintclip-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(`Failed to export data: ${errorData.detail || errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Export data error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Avatar Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem 0.5rem 0.5rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '100px',
          background: '#262626',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
          e.currentTarget.style.background = '#1f1f1f';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.background = '#262626';
        }}
      >
        {/* Avatar Circle */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.8125rem',
          letterSpacing: '-0.02em',
        }}>
          {getUserInitial()}
        </div>

        {/* User Name (desktop only) */}
        <span style={{
          fontWeight: 500,
          fontSize: '0.875rem',
          color: '#ffffff',
          display: window.innerWidth < 768 ? 'none' : 'block',
        }}>
          {userProfile?.display_name || userProfile?.email?.split('@')[0] || 'User'}
        </span>

        {/* Dropdown Arrow */}
        <span style={{
          color: '#737373',
          fontSize: '0.625rem',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          background: '#1f1f1f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
          minWidth: '280px',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#ffffff',
              marginBottom: '0.25rem',
            }}>
              {userProfile?.display_name || 'User'}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#737373',
            }}>
              {userProfile?.email || 'user@example.com'}
            </div>
          </div>

          {/* Account Section */}
          <div style={{ padding: '0.5rem' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#737373',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.75rem 0.875rem 0.375rem',
            }}>
              Account
            </div>

            <a
              href="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.875rem',
                color: '#a3a3a3',
                textDecoration: 'none',
                fontSize: '0.875rem',
                borderRadius: '8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#262626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a3a3a3';
              }}
            >
              <span style={{ width: '18px', textAlign: 'center', opacity: 0.7, fontSize: '1rem' }}>🔔</span>
              Notifications
            </a>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0' }} />

          {/* Data & Privacy Section */}
          <div style={{ padding: '0.5rem' }}>
            <div style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#737373',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.75rem 0.875rem 0.375rem',
            }}>
              Data & Privacy
            </div>

            <button
              onClick={handleExportData}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.875rem',
                color: '#a3a3a3',
                fontSize: '0.875rem',
                border: 'none',
                background: 'transparent',
                borderRadius: '8px',
                transition: 'all 0.15s',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#262626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a3a3a3';
              }}
            >
              <span style={{ width: '18px', textAlign: 'center', opacity: 0.7, fontSize: '1rem' }}>📊</span>
              Export My Data
            </button>

            <button
              onClick={handleDeleteAccount}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.875rem',
                color: '#ef4444',
                fontSize: '0.875rem',
                border: 'none',
                background: 'transparent',
                borderRadius: '8px',
                transition: 'all 0.15s',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ width: '18px', textAlign: 'center', opacity: 0.7, fontSize: '1rem' }}>🗑️</span>
              Delete Account
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0' }} />

          {/* Sign Out */}
          <div style={{ padding: '0.5rem' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.875rem',
                color: '#a3a3a3',
                fontSize: '0.875rem',
                border: 'none',
                background: 'transparent',
                borderRadius: '8px',
                transition: 'all 0.15s',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#262626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a3a3a3';
              }}
            >
              <span style={{ width: '18px', textAlign: 'center', opacity: 0.7, fontSize: '1rem' }}>→</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
