/**
 * Storage Utilities
 * Manages extension state and user preferences
 */

export interface UserPreferences {
  apiUrl?: string;
  defaultSummaryFormat?: 'qa' | 'listicle';
  defaultDetailLevel?: 'short' | 'detailed';
}

export interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  accessToken?: string;
}

const PREFERENCES_KEY = 'userPreferences';
const AUTH_STATE_KEY = 'authState';
const CACHE_PREFIX = 'transcript_cache_';

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const result = await chrome.storage.local.get(PREFERENCES_KEY);
  return result[PREFERENCES_KEY] || {};
}

/**
 * Save user preferences
 */
export async function saveUserPreferences(
  preferences: UserPreferences
): Promise<void> {
  await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
}

/**
 * Get authentication state
 */
export async function getAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get(AUTH_STATE_KEY);
  return result[AUTH_STATE_KEY] || { isAuthenticated: false };
}

/**
 * Save authentication state
 */
export async function saveAuthState(authState: AuthState): Promise<void> {
  await chrome.storage.local.set({ [AUTH_STATE_KEY]: authState });
}

/**
 * Alias for saveAuthState (for backward compatibility)
 */
export const setAuthState = saveAuthState;

/**
 * Cache transcript for a video
 */
export async function cacheTranscript(
  videoId: string,
  transcript: string
): Promise<void> {
  const key = `${CACHE_PREFIX}${videoId}`;
  await chrome.storage.local.set({
    [key]: {
      transcript,
      timestamp: Date.now(),
    },
  });
}

/**
 * Get cached transcript
 */
export async function getCachedTranscript(
  videoId: string
): Promise<string | null> {
  const key = `${CACHE_PREFIX}${videoId}`;
  const result = await chrome.storage.local.get(key);
  
  if (!result[key]) {
    return null;
  }

  const cached = result[key];
  const cacheAge = Date.now() - cached.timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (cacheAge > maxAge) {
    // Cache expired
    await chrome.storage.local.remove(key);
    return null;
  }

  return cached.transcript;
}

/**
 * Clear all cached transcripts
 */
export async function clearTranscriptCache(): Promise<void> {
  const allData = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allData).filter((key) =>
    key.startsWith(CACHE_PREFIX)
  );
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

