/**
 * Auth utility for Mintclip webapp
 * Handles JWT token management with automatic refresh
 */

import { BACKEND_URL } from '../config';

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
  requiresAuth?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | undefined;
  user: any;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class ExtensionAuth {
  private extensionAvailable: boolean = false;
  private refreshingPromise: Promise<AuthResponse> | null = null;
  private authState: AuthState = {
    isAuthenticated: false,
    token: undefined,
    user: null,
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for bridge ready message
    window.addEventListener('message', (event) => {
      switch (event.data.type) {
        case 'MINTCLIP_BRIDGE_READY':
          console.log('[ExtensionAuth] Bridge ready');
          this.checkExtensionAvailable();
          break;

        case 'MINTCLIP_AUTH_TOKEN_RESPONSE':
          console.log('[ExtensionAuth] Google token received from extension');
          break;

        case 'MINTCLIP_EXTENSION_AVAILABLE':
          console.log('[ExtensionAuth] Extension available');
          this.extensionAvailable = event.data.data?.available ?? true;
          break;
      }
    });

    setTimeout(() => this.checkExtensionAvailable(), 100);
  }

  private checkExtensionAvailable() {
    window.postMessage({
      type: 'MINTCLIP_CHECK_EXTENSION',
    }, window.location.origin);

    setTimeout(() => {
      if (!this.extensionAvailable) {
        console.warn('[ExtensionAuth] Extension not available');
      }
    }, 1000);
  }

  /**
   * Get stored token data from localStorage
   */
  private getStoredTokenData(): TokenData | null {
    const accessToken = localStorage.getItem('mintclip_access_token');
    const refreshToken = localStorage.getItem('mintclip_refresh_token');
    const expiresAt = localStorage.getItem('mintclip_token_expires_at');

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt ? parseInt(expiresAt, 10) : 0,
    };
  }

  /**
   * Check if token is expired or expiring soon (within 1 minute)
   */
  private isTokenExpired(expiresAt: number): boolean {
    const now = Date.now();
    const bufferTime = 60000; // 1 minute buffer
    return expiresAt - now < bufferTime;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      console.log('[Auth] Refreshing access token...');

      const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('No access token in refresh response');
      }

      // Calculate new expiration time
      const expiresAt = Date.now() + (data.expires_in * 1000);

      // Update localStorage with new tokens
      localStorage.setItem('mintclip_access_token', data.access_token);
      localStorage.setItem('mintclip_refresh_token', data.refresh_token);
      localStorage.setItem('mintclip_token_expires_at', expiresAt.toString());

      console.log('[Auth] Token refreshed successfully');

      return {
        success: true,
        token: data.access_token,
        user: this.authState.user,
      };
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);

      // Clear auth state on refresh failure
      this.clearAuth();

      return {
        success: false,
        error: 'Session expired. Please sign in again.',
        requiresAuth: true,
      };
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuth() {
    localStorage.removeItem('mintclip_access_token');
    localStorage.removeItem('mintclip_refresh_token');
    localStorage.removeItem('mintclip_token_expires_at');
    localStorage.removeItem('mintclip_user');

    this.authState = {
      isAuthenticated: false,
      token: undefined,
      user: null,
    };

    // Dispatch event to notify App.tsx that auth state changed
    window.dispatchEvent(new Event('auth-changed'));
  }

  /**
   * Get valid JWT token for API calls
   * Automatically refreshes if expired
   */
  async getAuthToken(): Promise<AuthResponse> {
    // If already refreshing, wait for that to complete
    if (this.refreshingPromise) {
      return this.refreshingPromise;
    }

    const tokenData = this.getStoredTokenData();

    if (!tokenData) {
      // No stored tokens, try extension
      return this.getTokenFromExtension();
    }

    // Check if token is expired or expiring soon
    if (this.isTokenExpired(tokenData.expiresAt)) {
      console.log('[Auth] Token expired or expiring soon, refreshing...');

      // Prevent multiple refresh attempts
      this.refreshingPromise = this.refreshAccessToken(tokenData.refreshToken);
      const result = await this.refreshingPromise;
      this.refreshingPromise = null;

      return result;
    }

    // Token is still valid
    console.log('[Auth] Using valid stored token');

    const storedUser = localStorage.getItem('mintclip_user');
    this.authState = {
      isAuthenticated: true,
      token: tokenData.accessToken,
      user: storedUser ? JSON.parse(storedUser) : null,
    };

    return {
      success: true,
      token: tokenData.accessToken,
      user: storedUser ? JSON.parse(storedUser) : null,
    };
  }

  /**
   * Get JWT token from Chrome extension
   */
  private async getTokenFromExtension(): Promise<AuthResponse> {
    return new Promise((resolve) => {
      const handleResponse = (event: MessageEvent) => {
        if (event.data.type === 'MINTCLIP_AUTH_TOKEN_RESPONSE') {
          window.removeEventListener('message', handleResponse);
          if (event.data.data?.success && event.data.data?.token) {
            resolve({
              success: true,
              token: event.data.data.token,
              user: event.data.data.user,
            });
          } else {
            resolve({
              success: false,
              error: event.data.data?.error || 'Failed to get token from extension',
              requiresAuth: true,
            });
          }
        }
      };

      window.addEventListener('message', handleResponse);

      // Request JWT token from extension
      window.postMessage({
        type: 'MINTCLIP_REQUEST_AUTH_TOKEN',
      }, window.location.origin);

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        resolve({
          success: false,
          error: 'Timeout waiting for extension response',
          requiresAuth: true,
        });
      }, 5000);
    });
  }

  async requireAuth(callback: () => Promise<any>): Promise<any> {
    const response = await this.getAuthToken();

    if (!response.success || !response.token) {
      throw new Error(response.error || 'Authentication required');
    }

    return callback();
  }

  getAuthState(): AuthState {
    return this.authState;
  }

  isExtensionAvailable(): boolean {
    return this.extensionAvailable;
  }

  /**
   * Sign out - clear all auth data
   */
  async signOut(): Promise<void> {
    this.clearAuth();
    window.location.href = '/';
  }
}

// Export singleton instance
export const extensionAuth = new ExtensionAuth();

// Helper function to get auth token for API calls
export async function getAuthToken(): Promise<string> {
  const response = await extensionAuth.getAuthToken();

  if (!response.success || !response.token) {
    throw new Error(response.error || 'Failed to get auth token');
  }

  return response.token;
}

// Helper function to make authenticated API calls
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Helper to sign out
export async function signOut(): Promise<void> {
  return extensionAuth.signOut();
}
