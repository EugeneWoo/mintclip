/**
 * API Client for Mintclip Webapp
 * Handles all backend API communication
 */

import { getAuthToken } from './auth';
import { BACKEND_URL } from '../config';

const API_BASE_URL = BACKEND_URL;

interface TranscriptSegment {
  timestamp: string;
  start_seconds?: number;
  duration?: number;
  text: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SummaryResponse {
  success: boolean;
  summary?: string;
  cached?: boolean;
  format?: string;
  is_structured?: boolean;
  error?: string;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

interface SuggestedQuestionsResponse {
  success: boolean;
  questions?: string[];
  error?: string;
}

interface SaveItemResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate summary for a transcript
 */
export async function generateSummary(
  videoId: string,
  transcript: TranscriptSegment[],
  format: 'short' | 'topic' | 'qa',
  language: string = 'en'
): Promise<SummaryResponse> {
  try {
    const token = await getAuthToken();

    // Send transcript as JSON string for structured summaries with clickable timestamps
    const transcriptData = JSON.stringify(transcript);

    const response = await fetch(`${API_BASE_URL}/api/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        video_id: videoId,
        transcript: transcriptData,
        format,
        language,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true } as SummaryResponse & { requiresAuth: boolean };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary',
    };
  }
}

/**
 * Send chat message
 */
export async function sendChatMessage(
  videoId: string,
  transcriptText: string,
  question: string,
  chatHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        video_id: videoId,
        transcript: transcriptText,
        question,
        chat_history: chatHistory,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true } as ChatResponse & { requiresAuth: boolean };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get suggested questions for a video
 */
export async function getSuggestedQuestions(
  videoId: string,
  transcriptText: string
): Promise<SuggestedQuestionsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/suggested-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        transcript: transcriptText,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true } as SuggestedQuestionsResponse & { requiresAuth: boolean };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Suggested questions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get suggested questions',
    };
  }
}

/**
 * Save item to Supabase
 */
export async function saveItem(
  videoId: string,
  itemType: 'transcript' | 'summary' | 'chat',
  content: any,
  source: 'extension' | 'upload' = 'upload'
): Promise<SaveItemResponse> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/saved-items/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        video_id: videoId,
        item_type: itemType,
        content,
        source,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true } as SaveItemResponse & { requiresAuth: boolean };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Save item error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save item',
    };
  }
}

/**
 * Extract transcript from YouTube URL
 */
export async function extractTranscript(videoUrl: string): Promise<any> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/transcript/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        languages: ['en'],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Extract transcript error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract transcript',
    };
  }
}

/**
 * Get all saved items for the authenticated user
 */
export async function getSavedItems(itemType?: 'transcript' | 'summary' | 'chat'): Promise<any> {
  try {
    const token = await getAuthToken();

    const url = itemType
      ? `${API_BASE_URL}/api/saved-items/list?item_type=${itemType}`
      : `${API_BASE_URL}/api/saved-items/list`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get saved items error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get saved items',
    };
  }
}

/**
 * Get a specific saved item by video ID and type
 */
export async function getSavedItem(videoId: string, itemType: 'transcript' | 'summary' | 'chat'): Promise<any> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/api/saved-items/${videoId}/${itemType}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Session expired. Please sign in again.', requiresAuth: true };
      }
      return { success: false, error: `Request failed (${response.status})` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get saved item error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get saved item',
    };
  }
}
