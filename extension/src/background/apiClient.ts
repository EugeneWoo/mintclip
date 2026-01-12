/**
 * API Client for Backend Communication
 * Handles all API calls to the backend service
 */

export interface TranscriptRequest {
  videoId: string;
  videoUrl?: string;
  languageCode?: string;
}

export interface TranscriptEntry {
  timestamp: string;
  start_seconds: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: TranscriptEntry[];
  full_text?: string;
  video_id?: string;
  language?: string;
  is_generated?: boolean;
  error?: string;
  message?: string;
}

export interface SummaryRequest {
  videoId: string;
  transcript: string;
  format: 'short' | 'topic' | 'qa';
}

export interface SummaryResponse {
  success: boolean;
  summary?: string;
  is_structured?: boolean;
  error?: string;
}

export interface ChatMessageRequest {
  videoId: string;
  transcript: string;
  question: string;
  chatHistory: Array<{ role: string; content: string }>;
}

export interface ChatMessageResponse {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Get backend API URL from environment or use default
 */
function getApiUrl(): string {
  // For development, use localhost. For production, use deployed backend
  // TODO: Make this configurable in extension options
  return 'http://localhost:8000';
}

/**
 * Fetch transcript from backend
 */
export async function fetchTranscript(
  request: TranscriptRequest
): Promise<TranscriptResponse> {
  try {
    console.log('Fetching transcript for video:', request.videoId);

    const response = await fetch(`${getApiUrl()}/api/transcript/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: request.videoId,
        video_url: request.videoUrl,
        languages: request.languageCode ? [request.languageCode] : undefined,
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

    // Backend returns the full response, just pass it through
    if (data.success) {
      console.log('Transcript fetched successfully:', {
        entries: data.transcript?.length,
        language: data.language,
      });
      return data;
    } else {
      return {
        success: false,
        error: data.message || data.error || 'Failed to fetch transcript',
      };
    }
  } catch (error) {
    console.error('Transcript fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch summary from backend
 */
export async function fetchSummary(
  request: SummaryRequest
): Promise<SummaryResponse> {
  try {
    console.log('Generating summary:', { videoId: request.videoId, format: request.format });

    const response = await fetch(`${getApiUrl()}/api/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: request.videoId,
        transcript: request.transcript,
        format: request.format,
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

    if (data.success) {
      console.log('Summary generated successfully:', { format: data.format, cached: data.cached, is_structured: data.is_structured });
      return {
        success: true,
        summary: data.summary,
        is_structured: data.is_structured || false,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to generate summary',
      };
    }
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send chat message to backend
 */
export async function fetchChatMessage(
  request: ChatMessageRequest
): Promise<ChatMessageResponse> {
  try {
    console.log('Sending chat message:', { videoId: request.videoId, question: request.question });

    const response = await fetch(`${getApiUrl()}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: request.videoId,
        transcript: request.transcript,
        question: request.question,
        chat_history: request.chatHistory,
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

    if (data.success) {
      console.log('Chat response received');
      return {
        success: true,
        response: data.response,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to get chat response',
      };
    }
  } catch (error) {
    console.error('Chat message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stream transcript from backend
 */
export async function streamTranscript(
  request: TranscriptRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${getApiUrl()}/api/transcript/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error) {
    console.error('Stream error:', error);
    throw error;
  }
}

