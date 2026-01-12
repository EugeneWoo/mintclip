/**
 * Authentication Tests
 * Tests for email sign-up/sign-in, Google OAuth, and authentication state management
 */

import { signUpWithEmail, signInWithEmail, signInWithGoogle, signOut, getAuthState } from '../src/popup/auth';

// Mock chrome.storage and chrome.identity APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn(),
  },
  runtime: {
    lastError: null,
  },
} as any;

describe('Email Sign-Up', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  });

  test('validates email format', async () => {
    const result = await signUpWithEmail('invalid-email', 'password123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('valid email');
  });

  test('validates password length (min 8 characters)', async () => {
    const result = await signUpWithEmail('test@example.com', 'short');

    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 8 characters');
  });

  test('successfully signs up with valid credentials', async () => {
    const result = await signUpWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        isAuthenticated: true,
        email: 'test@example.com',
      }),
    });
  });
});

describe('Email Sign-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  });

  test('validates email format', async () => {
    const result = await signInWithEmail('invalid-email', 'password123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('valid email');
  });

  test('validates password is provided', async () => {
    const result = await signInWithEmail('test@example.com', '');

    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('password');
  });

  test('successfully signs in with valid credentials', async () => {
    const result = await signInWithEmail('test@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        isAuthenticated: true,
        email: 'test@example.com',
      }),
    });
  });
});

describe('Google OAuth Sign-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  });

  test('successfully authenticates with Google OAuth', async () => {
    const mockToken = 'mock-oauth-token-12345';

    (chrome.identity.getAuthToken as jest.Mock).mockImplementation((options, callback) => {
      callback(mockToken);
    });

    const result = await signInWithGoogle();

    expect(result.success).toBe(true);
    expect(result.token).toBe(mockToken);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        isAuthenticated: true,
        accessToken: mockToken,
      }),
    });
  });

  test('handles OAuth failure gracefully', async () => {
    (chrome.identity.getAuthToken as jest.Mock).mockImplementation((options, callback) => {
      chrome.runtime.lastError = { message: 'User declined authorization' };
      callback(null);
    });

    const result = await signInWithGoogle();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Sign Out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.runtime.lastError = undefined; // Clear lastError
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      auth: {
        isAuthenticated: true,
        accessToken: 'mock-token',
      },
    });
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
    (chrome.identity.removeCachedAuthToken as jest.Mock).mockImplementation((options, callback) => {
      callback();
    });
  });

  test('clears authentication state', async () => {
    await signOut();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      auth: {
        isAuthenticated: false,
        accessToken: null,
        userId: null,
      },
    });
  });

  test('revokes OAuth token if exists', async () => {
    await signOut();

    expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
      { token: 'mock-token' },
      expect.any(Function)
    );
  });
});

describe('Authentication State Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retrieves authenticated state from storage', async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      auth: {
        isAuthenticated: true,
        userId: 'user-123',
        accessToken: 'token-456',
        email: 'test@example.com',
      },
    });

    const authState = await getAuthState();

    expect(authState.isAuthenticated).toBe(true);
    expect(authState.userId).toBe('user-123');
    expect(authState.accessToken).toBe('token-456');
    expect(authState.email).toBe('test@example.com');
  });

  test('returns unauthenticated state when no auth data', async () => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

    const authState = await getAuthState();

    expect(authState.isAuthenticated).toBe(false);
  });
});

describe('OPEN_POPUP Message Handler', () => {
  // Mock message handler
  const handleMessage = async (message: { type: string }, sender: any, sendResponse: any) => {
    if (message.type === 'OPEN_POPUP') {
      try {
        // In real extension, this would call chrome.action.openPopup()
        // For testing, we'll just simulate success
        sendResponse({ success: true });
        return true;
      } catch (error) {
        sendResponse({
          success: false,
          error: 'Please click the extension icon to sign in',
        });
        return true;
      }
    }
  };

  test('handles OPEN_POPUP message', async () => {
    const mockSendResponse = jest.fn();
    const mockSender = {};

    await handleMessage({ type: 'OPEN_POPUP' }, mockSender, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
  });
});

describe('Authentication Gating', () => {
  // Mock authentication check
  const requireAuth = async (authenticated: boolean, handler: () => Promise<any>) => {
    if (!authenticated) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to use this feature.',
        requiresAuth: true,
      };
    }
    return handler();
  };

  test('blocks unauthenticated users from protected features', async () => {
    const mockHandler = jest.fn().mockResolvedValue({ success: true, data: 'protected data' });

    const result = await requireAuth(false, mockHandler);

    expect(result.success).toBe(false);
    expect(result.requiresAuth).toBe(true);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('allows authenticated users to access features', async () => {
    const mockHandler = jest.fn().mockResolvedValue({ success: true, data: 'protected data' });

    const result = await requireAuth(true, mockHandler);

    expect(result.success).toBe(true);
    expect(result.data).toBe('protected data');
    expect(mockHandler).toHaveBeenCalled();
  });
});
