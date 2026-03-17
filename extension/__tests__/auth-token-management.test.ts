/**
 * Auth token management tests
 *
 * Tests for getValidAccessToken() — the function responsible for
 * auto-refreshing expired tokens. This is the function that was
 * called on every API request after the auth bug was introduced.
 */

import { getValidAccessToken } from '../src/background/auth';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

const mockGetStorageAuthState = jest.fn();
const mockSetAuthState = jest.fn();
const mockRefreshAccessToken = jest.fn();

jest.mock('../src/background/storage', () => ({
  getAuthState: (...args: any[]) => mockGetStorageAuthState(...args),
  setAuthState: (...args: any[]) => mockSetAuthState(...args),
}));

jest.mock('../src/background/apiClient', () => ({
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
  getApiUrl: () => 'http://localhost:8000',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAuthState.mockResolvedValue(undefined);
});

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function authState(overrides: object = {}) {
  return {
    isAuthenticated: true,
    accessToken: 'valid-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + HOUR, // valid for 1 hour by default
    userId: 'user-123',
    ...overrides,
  };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('getValidAccessToken — unauthenticated', () => {
  test('returns null when not authenticated', async () => {
    mockGetStorageAuthState.mockResolvedValue({ isAuthenticated: false });
    expect(await getValidAccessToken()).toBeNull();
  });

  test('returns null when authenticated but no accessToken stored', async () => {
    mockGetStorageAuthState.mockResolvedValue({ isAuthenticated: true, accessToken: null });
    expect(await getValidAccessToken()).toBeNull();
  });
});

describe('getValidAccessToken — valid token', () => {
  test('returns token directly when not expired', async () => {
    mockGetStorageAuthState.mockResolvedValue(authState());

    const token = await getValidAccessToken();

    expect(token).toBe('valid-token');
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });
});

describe('getValidAccessToken — token refresh', () => {
  test('refreshes token when it expires within 1 minute', async () => {
    mockGetStorageAuthState.mockResolvedValue(
      authState({ expiresAt: Date.now() + 30 * 1000 }) // 30s left
    );
    mockRefreshAccessToken.mockResolvedValue({
      success: true,
      tokens: { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600, tokenType: 'Bearer' },
    });

    const token = await getValidAccessToken();

    expect(mockRefreshAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(token).toBe('new-token');
  });

  test('refreshes token when it is already expired', async () => {
    mockGetStorageAuthState.mockResolvedValue(
      authState({ expiresAt: Date.now() - HOUR }) // 1 hour ago
    );
    mockRefreshAccessToken.mockResolvedValue({
      success: true,
      tokens: { accessToken: 'refreshed-token', refreshToken: 'new-refresh', expiresIn: 3600, tokenType: 'Bearer' },
    });

    const token = await getValidAccessToken();

    expect(token).toBe('refreshed-token');
  });

  test('saves new tokens to storage after successful refresh', async () => {
    mockGetStorageAuthState.mockResolvedValue(
      authState({ expiresAt: Date.now() + 30 * 1000 })
    );
    mockRefreshAccessToken.mockResolvedValue({
      success: true,
      tokens: { accessToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600, tokenType: 'Bearer' },
    });

    await getValidAccessToken();

    expect(mockSetAuthState).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      })
    );
  });

  test('clears auth state and returns null when refresh fails', async () => {
    mockGetStorageAuthState.mockResolvedValue(
      authState({ expiresAt: Date.now() + 30 * 1000 })
    );
    mockRefreshAccessToken.mockResolvedValue({
      success: false,
      error: 'Refresh token expired',
    });

    const token = await getValidAccessToken();

    expect(token).toBeNull();
    expect(mockSetAuthState).toHaveBeenCalledWith({ isAuthenticated: false });
  });

  test('does not attempt refresh when no refreshToken available', async () => {
    mockGetStorageAuthState.mockResolvedValue(
      authState({ expiresAt: Date.now() + 30 * 1000, refreshToken: undefined })
    );

    // Token is expiring but no refresh token — should return existing token
    const token = await getValidAccessToken();

    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    expect(token).toBe('valid-token');
  });
});
