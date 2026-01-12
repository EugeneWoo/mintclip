/**
 * Background Authentication State Management
 * Handles auth state synchronization and checks
 */

import { getAuthState as getStorageAuthState, setAuthState } from './storage';

/**
 * Initialize authentication state on extension load
 */
export async function initializeAuth(): Promise<void> {
  const authState = await getStorageAuthState();
  console.log('[YT Coach] Auth state initialized:', authState.isAuthenticated);

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
