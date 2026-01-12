/**
 * Authentication Module
 * Handles Google OAuth flow using Chrome Identity API
 */

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Initiate Google OAuth flow
 * Uses Chrome Identity API to get auth token
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    // Get OAuth token using Chrome Identity API
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });

    // TODO: Send token to backend for verification and user creation
    // For now, we'll store it locally
    await chrome.storage.local.set({
      auth: {
        isAuthenticated: true,
        accessToken: token,
        userId: 'temp-user-id', // TODO: Get from backend
      },
    });

    return {
      success: true,
      token,
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
    // Get current token
    const result = await chrome.storage.local.get(['auth']);
    const token = result.auth?.accessToken;

    // Revoke token if exists
    if (token) {
      await new Promise<void>((resolve, reject) => {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }

    // Clear local storage
    await chrome.storage.local.set({
      auth: {
        isAuthenticated: false,
        accessToken: null,
        userId: null,
      },
    });
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

    // TODO: Send email/password to backend for user creation
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Store auth state locally
    await chrome.storage.local.set({
      auth: {
        isAuthenticated: true,
        accessToken: 'temp-token-' + Date.now(), // TODO: Get real token from backend
        userId: 'temp-user-id', // TODO: Get from backend
        email,
      },
    });

    return {
      success: true,
      token: 'temp-token',
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

    // TODO: Send email/password to backend for authentication
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Store auth state locally
    await chrome.storage.local.set({
      auth: {
        isAuthenticated: true,
        accessToken: 'temp-token-' + Date.now(), // TODO: Get real token from backend
        userId: 'temp-user-id', // TODO: Get from backend
        email,
      },
    });

    return {
      success: true,
      token: 'temp-token',
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
 * Get current authentication state
 */
export async function getAuthState(): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  accessToken?: string;
  email?: string;
}> {
  try {
    const result = await chrome.storage.local.get(['auth']);
    return result.auth || { isAuthenticated: false };
  } catch (error) {
    console.error('Get auth state error:', error);
    return { isAuthenticated: false };
  }
}
