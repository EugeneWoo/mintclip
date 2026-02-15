/**
 * Message Handler for Chrome Runtime Messages
 * Handles communication between content scripts and service worker
 */

import { fetchTranscript, fetchSummary, streamTranscript, fetchChatMessage, getApiUrl } from './apiClient';
import { requireAuth } from './auth';
import type {
  TranscriptRequest,
  SummaryRequest,
  ChatMessageRequest,
} from './apiClient';

export interface Message {
  type: string;
  payload?: unknown;
}

export interface TranscriptMessage extends Message {
  type: 'GET_TRANSCRIPT';
  payload: TranscriptRequest;
}

export interface SummaryMessage extends Message {
  type: 'GET_SUMMARY';
  payload: SummaryRequest;
}

export interface StreamTranscriptMessage extends Message {
  type: 'STREAM_TRANSCRIPT';
  payload: TranscriptRequest;
}

export interface ChatMessage extends Message {
  type: 'CHAT';
  payload: {
    videoId: string;
    message: string;
    history: any[];
  };
}

export interface CheckAuthMessage extends Message {
  type: 'CHECK_AUTH';
}

export interface OpenPopupMessage extends Message {
  type: 'OPEN_POPUP';
}

export interface GoogleSignInMessage extends Message {
  type: 'GOOGLE_SIGN_IN';
}

export interface GetSuggestedQuestionsMessage extends Message {
  type: 'GET_SUGGESTED_QUESTIONS';
  payload: {
    videoId: string;
    transcript: string;
  };
}

export interface GetLanguagesMessage extends Message {
  type: 'GET_LANGUAGES_WITH_TRANSLATION';
  payload: {
    videoId: string;
  };
}

export interface SeekVideoMessage extends Message {
  type: 'SEEK_VIDEO';
  payload: {
    url: string;  // YouTube URL with timestamp parameter (e.g., https://www.youtube.com/watch?v=VIDEO_ID&t=123s)
  };
}

export interface TranslateTranscriptMessage extends Message {
  type: 'TRANSLATE_TRANSCRIPT';
  payload: {
    videoId: string;
    transcript: any[];
    sourceLanguage: string;
  };
}

export interface GetWebappAuthTokenMessage extends Message {
  type: 'GET_WEBAPP_AUTH_TOKEN';
}

export interface OpenLibraryMessage extends Message {
  type: 'OPEN_LIBRARY';
}

export interface SaveItemMessage extends Message {
  type: 'SAVE_ITEM';
  payload: {
    video_id: string;
    item_type: string;
    content: any;
  };
}

export interface GetSavedItemMessage extends Message {
  type: 'GET_SAVED_ITEM';
  payload: {
    video_id: string;
    item_type: string;
  };
}

export type ExtensionMessage =
  | TranscriptMessage
  | SummaryMessage
  | StreamTranscriptMessage
  | ChatMessage
  | CheckAuthMessage
  | OpenPopupMessage
  | GoogleSignInMessage
  | GetSuggestedQuestionsMessage
  | GetLanguagesMessage
  | SeekVideoMessage
  | TranslateTranscriptMessage
  | GetWebappAuthTokenMessage
  | OpenLibraryMessage
  | SaveItemMessage
  | GetSavedItemMessage;

/**
 * Handle incoming messages from content scripts
 */
export async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<boolean> {
  console.log('Handling message:', message.type);

  try {
    switch (message.type) {
      case 'CHECK_AUTH': {
        // Allow auth check without authentication
        const { getAuthState } = await import('./storage');
        const authState = await getAuthState();
        sendResponse({
          success: true,
          data: authState,
        });
        return true;
      }

      case 'GET_TRANSCRIPT': {
        // Skip authentication for testing
        const request = message.payload as TranscriptRequest;
        const result = await fetchTranscript(request);

        // Transform API response to match UI expectations
        if (result.success && result.transcript) {
          sendResponse({
            success: true,
            data: result.transcript.map((entry) => ({
              timestamp: entry.timestamp,
              start_seconds: entry.start_seconds,
              duration: entry.duration,
              text: entry.text,
            })),
            language: result.language, // Pass through language code
            is_generated: result.is_generated,
            video_title: result.video_title, // Pass through video title from API
          });
        } else {
          sendResponse({
            success: false,
            error: result.error || result.message || 'Failed to fetch transcript',
          });
        }
        return true;
      }

      case 'GET_LANGUAGES_WITH_TRANSLATION': {
        // Get available languages including AI-translated English
        const { videoId } = message.payload as { videoId: string };

        try {
          const response = await fetch(`${getApiUrl()}/api/transcript/languages-with-translation/${videoId}`);
          const data = await response.json();
          sendResponse(data);
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch languages',
          });
        }
        return true;
      }

      case 'TRANSLATE_TRANSCRIPT': {
        // Translate transcript to English using Gemini
        const { videoId, transcript, sourceLanguage } = message.payload as {
          videoId: string;
          transcript: any[];
          sourceLanguage: string;
        };

        try {
          const response = await fetch(`${getApiUrl()}/api/transcript/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId,
              transcript: transcript,
              source_language: sourceLanguage,
            }),
          });

          const data = await response.json();
          sendResponse(data);
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to translate transcript',
          });
        }
        return true;
      }

      case 'SEEK_VIDEO': {
        // Seek YouTube video to a specific timestamp
        const { url } = message.payload as { url: string };

        try {
          // Parse the video ID and timestamp from URL
          // URL format: https://www.youtube.com/watch?v=VIDEO_ID&t=TIMESTAMP
          const urlObj = new URL(url);
          const videoId = urlObj.searchParams.get('v');
          const timestamp = urlObj.searchParams.get('t'); // Format: "123s" (seconds)

          if (videoId && timestamp) {
            // Find the YouTube tab
            const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });

            // Filter for the tab with matching video ID
            const youtubeTab = tabs.find(tab =>
              tab.url && tab.url.includes(videoId)
            );

            if (youtubeTab && youtubeTab.id) {
              // Extract seconds from timestamp (remove 's' suffix)
              const seconds = parseInt(timestamp.replace('s', ''), 10);

              // Inject content script to seek video
              chrome.scripting.executeScript({
                target: { tabId: youtubeTab.id },
                func: (seekSeconds: number) => {
                  const videoElement = document.querySelector('video') as HTMLVideoElement;
                  if (videoElement && videoElement.currentTime !== undefined) {
                    videoElement.currentTime = seekSeconds;
                  }
                },
                args: [seconds]
              });

              sendResponse({
                success: true,
                message: `Seeked video to ${seconds}s`,
              });
            } else {
              sendResponse({
                success: false,
                error: 'YouTube tab not found. Please ensure YouTube is open.',
              });
            }
          } else {
            sendResponse({
              success: false,
              error: 'Invalid YouTube URL or timestamp',
            });
          }
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to seek video',
          });
        }
        return true;
      }

      case 'STREAM_TRANSCRIPT': {
        // Require authentication
        const response = await requireAuth(async () => {
          const request = message.payload as TranscriptRequest;
          // Stream transcript and send chunks to content script
          await streamTranscript(request, (chunk) => {
            if (sender.tab?.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: 'TRANSCRIPT_CHUNK',
                chunk,
              }).catch(console.error);
            }
          });
          return { success: true };
        });
        sendResponse(response);
        return true;
      }

      case 'CHAT': {
        // Skip authentication for testing
        const payload = message.payload as any;
        const request: ChatMessageRequest = {
          videoId: payload.videoId,
          transcript: payload.transcript,
          question: payload.question,
          chatHistory: payload.chatHistory || [],
        };

        const result = await fetchChatMessage(request);

        if (result.success) {
          sendResponse({
            success: true,
            data: {
              content: result.response,
            },
          });
        } else {
          sendResponse({
            success: false,
            error: result.error,
          });
        }
        return true;
      }

      case 'GET_SUGGESTED_QUESTIONS': {
        // Skip authentication - suggested questions are publicly available
        const { videoId, transcript } = message.payload as { videoId: string; transcript: string };
        try {
          const response = await fetch(`${getApiUrl()}/api/chat/suggested-questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              video_id: videoId,
              transcript: transcript,
            }),
          });
          const data = await response.json();
          sendResponse(data);
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch suggested questions',
          });
        }
        return true;
      }

      case 'GET_SUMMARY': {
        // Generate AI summary using Gemini
        const request = message.payload as SummaryRequest;
        const result = await fetchSummary(request);

        if (result.success) {
          sendResponse({
            success: true,
            summary: result.summary,
            cached: result.cached || false,
            format: result.format,
            is_structured: result.is_structured || false,
          });
        } else {
          sendResponse({
            success: false,
            error: result.error || 'Failed to generate summary',
          });
        }
        return true;
      }

      case 'OPEN_POPUP': {
        // Open the extension popup for sign-in
        try {
          chrome.action.openPopup();
          sendResponse({ success: true });
        } catch (error) {
          // If openPopup fails (e.g., user gesture required),
          // instruct user to click extension icon
          sendResponse({
            success: false,
            error: 'Please click the extension icon to sign in',
          });
        }
        return true;
      }

      case 'GOOGLE_SIGN_IN': {
        // Handle Google OAuth in service worker (persists after popup closes)
        try {
          console.log('=== GOOGLE_SIGN_IN HANDLER STARTED ===');
          console.log('Timestamp:', new Date().toISOString());
          console.log('Sender:', sender);

          // Get Google token using Chrome Identity API
          console.log('Calling chrome.identity.getAuthToken({ interactive: true })...');
          const token = await new Promise<string>((resolve, reject) => {
            console.log('Inside getAuthToken promise...');
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
              console.log('getAuthToken callback fired');
              console.log('Token received:', token ? 'YES (length: ' + token.length + ')' : 'NO');
              console.log('lastError:', chrome.runtime.lastError);
              if (chrome.runtime.lastError) {
                console.error('getAuthToken error:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
              } else if (token) {
                resolve(token);
              } else {
                reject(new Error('No token received'));
              }
            });
            console.log('getAuthToken called, waiting for callback...');
          });

          console.log('Got Google token, verifying with backend...');

          // Send token to backend
          const response = await fetch('${getApiUrl()}/api/auth/google/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_token: token }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
          }

          const data = await response.json();

          if (!data.tokens) {
            throw new Error(data.error || 'No tokens received from server');
          }

          // Calculate expiration timestamp
          const expiresAt = Date.now() + (data.tokens.expires_in * 1000);

          // Save auth state
          const { saveAuthState } = await import('./storage');
          await saveAuthState({
            isAuthenticated: true,
            accessToken: data.tokens.access_token,
            refreshToken: data.tokens.refresh_token,
            userId: data.user?.id,
            email: data.user?.email,
            expiresAt,
          });

          console.log('Google sign-in successful:', data.user?.email);

          sendResponse({
            success: true,
            user: data.user,
          });
        } catch (error) {
          console.error('Google sign-in error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sign in with Google',
          });
        }
        return true;
      }

      case 'GET_WEBAPP_AUTH_TOKEN': {
        console.log('[MessageHandler] GET_WEBAPP_AUTH_TOKEN called');

        // Get valid access token (auto-refreshes if expired)
        const { getValidAccessToken } = await import('./auth');
        let accessToken = await getValidAccessToken();

        // If token refresh failed, try to get a fresh Google token
        if (!accessToken) {
          console.log('[MessageHandler] Token refresh failed, attempting to get fresh Google token');
          try {
            const token = await new Promise<string>((resolve, reject) => {
              chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (chrome.runtime.lastError) {
                  console.error('[MessageHandler] getAuthToken failed:', chrome.runtime.lastError);
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (token) {
                  resolve(token);
                } else {
                  reject(new Error('No token received'));
                }
              });
            });

            // Verify the fresh Google token with backend to get JWT
            const response = await fetch('${getApiUrl()}/api/auth/google/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ google_token: token }),
            });

            if (response.ok) {
              const data = await response.json();
              const authState = await import('./storage').then(m => m.getAuthState());

              // Update stored auth state with new tokens
              await import('./storage').then(async ({ setAuthState }) => {
                await setAuthState({
                  isAuthenticated: true,
                  accessToken: data.tokens.access_token,
                  refreshToken: data.tokens.refresh_token,
                  userId: data.user?.id,
                  email: data.user?.email,
                  expiresAt: Date.now() + (data.tokens.expires_in * 1000),
                });
              });

              sendResponse({
                success: true,
                token: data.tokens.access_token,
                user: data.user,
              });
              return true;
            } else {
              throw new Error('Failed to verify Google token');
            }
          } catch (error) {
            console.error('[MessageHandler] Failed to get fresh token:', error);
            sendResponse({
              success: false,
              error: 'Authentication required. Please sign in to use this feature.',
              requiresAuth: true,
            });
            return true;
          }
        }

        const authState = await import('./storage').then(m => m.getAuthState());

        sendResponse({
          success: true,
          token: accessToken,
          user: authState,
        });
        return true;
      }

      case 'SAVE_ITEM': {
        console.log('[MessageHandler] SAVE_ITEM called');
        console.log('[MessageHandler] Payload:', message.payload);

        // Get valid access token (auto-refreshes if expired)
        const { getValidAccessToken } = await import('./auth');
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
          console.error('[MessageHandler] Not authenticated or token refresh failed');
          sendResponse({
            success: false,
            error: 'Authentication required. Please sign in to use this feature.',
            requiresAuth: true,
          });
          return true;
        }

        const { video_id, item_type, content } = message.payload as {
          video_id: string;
          item_type: string;
          content: any;
        };

        console.log('[MessageHandler] Saving item:', { video_id, item_type });

        try {
          const url = `${getApiUrl()}/api/saved-items/save`;
          console.log('[MessageHandler] Fetching:', url);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              video_id,
              item_type,
              content,
              source: 'extension', // Mark as saved from extension (static chat mode)
            }),
          });

          console.log('[MessageHandler] Response status:', response.status);

          const data = await response.json();
          console.log('[MessageHandler] Response data:', data);

          sendResponse(data);
        } catch (error) {
          console.error('[MessageHandler] Error saving item:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save item',
          });
        }
        return true;
      }

      case 'GET_SAVED_ITEM': {
        // Get valid access token (auto-refreshes if expired)
        const { getValidAccessToken } = await import('./auth');
        const accessToken = await getValidAccessToken();

        if (!accessToken) {
          sendResponse({
            success: false,
            error: 'Authentication required. Please sign in to use this feature.',
            requiresAuth: true,
          });
          return true;
        }

        const { video_id, item_type } = message.payload as {
          video_id: string;
          item_type: string;
        };

        try {
          const response = await fetch(
            `${getApiUrl()}/api/saved-items/${video_id}/${item_type}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          const data = await response.json();
          sendResponse(data);
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get saved item',
          });
        }
        return true;
      }

      case 'OPEN_LIBRARY': {
        // Open web app library in a new tab
        try {
          const { API_CONFIG } = await import('../config');
          await chrome.tabs.create({ url: API_CONFIG.webAppUrl });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to open library',
          });
        }
        return true;
      }

      default: {
        const unknownMessage = message as { type: string };
        sendResponse({
          success: false,
          error: `Unknown message type: ${unknownMessage.type}`,
        });
        return true;
      }
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return true;
  }
}

