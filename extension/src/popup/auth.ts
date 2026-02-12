/**
 * Authentication Module
 * Handles Google OAuth flow using Chrome Identity API
 */

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  tier: string;
  summariesUsed: number;
  chatMessagesUsed: number;
}

/**
 * Initiate Google OAuth flow using Chrome Identity API
 * Uses chrome.identity.getAuthToken for seamless Google sign-in
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    console.log('Starting Google OAuth flow with chrome.identity.getAuthToken');

    // First, try to remove any cached token to get a fresh one
    try {
      await new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (cachedToken) => {
          if (cachedToken) {
            console.log('Removing cached Google token...');
            chrome.identity.removeCachedAuthToken({ token: cachedToken }, () => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      console.log('No cached token to remove:', e);
    }

    // Get Google OAuth token using Chrome's built-in identity API (fresh token)
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error('getAuthToken error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (token) {
          console.log('Got fresh Google OAuth token');
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });

    console.log('Got Google OAuth token, verifying with backend...');

    // Send the Google token to our backend to create/verify user
    const response = await fetch('http://localhost:8000/api/auth/google/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_token: token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.tokens) {
      return {
        success: false,
        error: data.error || 'Failed to authenticate with server',
      };
    }

    // Calculate token expiration timestamp
    const expiresAt = Date.now() + (data.tokens.expires_in * 1000);

    // Store authentication state
    await chrome.storage.local.set({
      authState: {
        isAuthenticated: true,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        userId: data.user?.id,
        email: data.user?.email,
        expiresAt,
      },
    });

    console.log('Google sign-in successful, user:', data.user?.email);

    return {
      success: true,
      token: data.tokens.access_token,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.display_name,
        avatarUrl: data.user.avatar_url,
        tier: data.user.tier,
        summariesUsed: data.user.summaries_used,
        chatMessagesUsed: data.user.chat_messages_used,
      } : undefined,
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in with Google',
    };
  }
}

/**
 * Sign out and clear authentication state
 */
export async function signOut(): Promise<void> {
  try {
    // Revoke the Google token
    await new Promise<void>((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

    // Clear local storage
    await chrome.storage.local.set({
      authState: {
        isAuthenticated: false,
        accessToken: undefined,
        refreshToken: undefined,
        userId: undefined,
        email: undefined,
        expiresAt: undefined,
      },
    });

    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    // Validate password length (min 8 characters)
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    // Call backend signup endpoint
    const response = await fetch('http://localhost:8000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        privacy_accepted: true,
        terms_accepted: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Signup failed',
      };
    }

    // Check if email confirmation is required
    if (!data.tokens && data.message) {
      return {
        success: false,
        error: data.message,
      };
    }

    if (!data.tokens) {
      return {
        success: false,
        error: 'Signup failed - no tokens received',
      };
    }

    // Calculate token expiration timestamp
    const expiresAt = Date.now() + (data.tokens.expires_in * 1000);

    // Store auth state
    await chrome.storage.local.set({
      authState: {
        isAuthenticated: true,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        userId: data.user?.id,
        email: data.user?.email || email,
        expiresAt,
      },
    });

    return {
      success: true,
      token: data.tokens.access_token,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.display_name,
        avatarUrl: data.user.avatar_url,
        tier: data.user.tier,
        summariesUsed: data.user.summaries_used,
        chatMessagesUsed: data.user.chat_messages_used,
      } : undefined,
    };
  } catch (error) {
    console.error('Email sign-up error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign up',
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    // Validate password is provided
    if (!password || password.length === 0) {
      return {
        success: false,
        error: 'Password is required',
      };
    }

    // Call backend login endpoint
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Login failed',
      };
    }

    if (!data.tokens) {
      return {
        success: false,
        error: 'Login failed - no tokens received',
      };
    }

    // Calculate token expiration timestamp
    const expiresAt = Date.now() + (data.tokens.expires_in * 1000);

    // Store auth state
    await chrome.storage.local.set({
      authState: {
        isAuthenticated: true,
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        userId: data.user?.id,
        email: data.user?.email || email,
        expiresAt,
      },
    });

    return {
      success: true,
      token: data.tokens.access_token,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.display_name,
        avatarUrl: data.user.avatar_url,
        tier: data.user.tier,
        summariesUsed: data.user.summaries_used,
        chatMessagesUsed: data.user.chat_messages_used,
      } : undefined,
    };
  } catch (error) {
    console.error('Email sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in',
    };
  }
}

/**
 * Reset password via email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    // Call backend password reset endpoint
    const response = await fetch('http://localhost:8000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Password reset failed',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password',
    };
  }
}

/**
 * Get current authentication state
 */
export async function getAuthState(): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  expiresAt?: number;
}> {
  try {
    const result = await chrome.storage.local.get(['authState']);
    return result.authState || { isAuthenticated: false };
  } catch (error) {
    console.error('Get auth state error:', error);
    return { isAuthenticated: false };
  }
}
