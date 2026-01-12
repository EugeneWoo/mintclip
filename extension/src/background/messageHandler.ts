/**
 * Message Handler for Chrome Runtime Messages
 * Handles communication between content scripts and service worker
 */

import { fetchTranscript, fetchSummary, streamTranscript, fetchChatMessage } from './apiClient';
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

export type ExtensionMessage =
  | TranscriptMessage
  | SummaryMessage
  | StreamTranscriptMessage
  | ChatMessage
  | CheckAuthMessage
  | OpenPopupMessage
  | GetSuggestedQuestionsMessage
  | GetLanguagesMessage
  | SeekVideoMessage
  | TranslateTranscriptMessage;

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
          const response = await fetch(`http://localhost:8000/api/transcript/languages-with-translation/${videoId}`);
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
          const response = await fetch(`http://localhost:8000/api/transcript/translate`, {
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
          const response = await fetch(`http://localhost:8000/api/chat/suggested-questions`, {
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

