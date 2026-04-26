/**
 * Background Authentication State Management
 * Handles auth state synchronization and checks
 */

import { getAuthState as getStorageAuthState, setAuthState } from './storage';
import { refreshAccessToken } from './apiClient';

/**
 * Initialize authentication state on extension load
 */
export async function initializeAuth(): Promise<void> {
  const authState = await getStorageAuthState();
  console.log('[Mintclip] Auth state initialized:', authState.isAuthenticated);

  // TODO: Verify token with backend if authenticated
  // For now, just log the state
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const authState = await getStorageAuthState();
  return authState.isAuthenticated;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const authState = await getStorageAuthState();
  return authState.userId || null;
}

// Deduplicates concurrent token refresh calls so only one refresh is in flight
// at a time. A second caller will await the same promise rather than firing a
// second refresh with an already-rotated refresh token.
let _refreshInFlight: Promise<string | null> | null = null;

/**
 * Get valid access token, refreshing if expired
 */
export async function getValidAccessToken(): Promise<string | null> {
  const authState = await getStorageAuthState();

  if (!authState.isAuthenticated || !authState.accessToken) {
    return null;
  }

  // Check if token is expired or will expire in the next minute
  const now = Date.now();
  const expiresAt = authState.expiresAt || 0;
  const isExpiringSoon = expiresAt - now < 60000; // 1 minute buffer

  if (isExpiringSoon && authState.refreshToken) {
    console.log('[Auth] Token expired or expiring soon, refreshing...');

    if (_refreshInFlight) {
      console.log('[Auth] Refresh already in flight, waiting...');
      return _refreshInFlight;
    }

    _refreshInFlight = (async () => {
      try {
        const result = await refreshAccessToken(authState.refreshToken!);
        if (result.success && result.tokens) {
          const newExpiresAt = Date.now() + (result.tokens.expiresIn * 1000);
          await setAuthState({
            ...authState,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresAt: newExpiresAt,
          });
          console.log('[Auth] Token refreshed successfully');
          return result.tokens.accessToken;
        } else {
          console.error('[Auth] Token refresh failed:', result.error);
          await setAuthState({ isAuthenticated: false });
          return null;
        }
      } finally {
        _refreshInFlight = null;
      }
    })();

    return _refreshInFlight;
  }

  return authState.accessToken;
}

/**
 * Middleware to check authentication before processing messages
 */
export async function requireAuth(handler: () => Promise<any>): Promise<any> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return {
      success: false,
      error: 'Authentication required. Please sign in to use this feature.',
      requiresAuth: true,
    };
  }

  return handler();
}
