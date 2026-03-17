/**
 * API client tests — transcript, summary, chat, token refresh
 *
 * These are unit tests against the fetch wrappers in apiClient.ts.
 * They verify correct request shape, auth header forwarding, and error
 * handling without hitting a real backend.
 */

import { fetchTranscript, fetchSummary, fetchChatMessage, refreshAccessToken } from '../src/background/apiClient';

// ------------------------------------------------------------------
// fetch mock
// ------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOk(body: object) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockError(status: number, detail = 'Something went wrong') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ detail }),
  });
}

beforeEach(() => mockFetch.mockClear());

// ------------------------------------------------------------------
// Transcript
// ------------------------------------------------------------------

describe('fetchTranscript', () => {
  test('sends video_id in POST body', async () => {
    mockOk({ success: true, transcript: [], language: 'en', video_title: 'Test' });

    await fetchTranscript({ videoId: 'abc123' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.video_id).toBe('abc123');
  });

  test('includes Authorization header when token provided', async () => {
    mockOk({ success: true, transcript: [], language: 'en' });

    await fetchTranscript({ videoId: 'abc123', token: 'my-token' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });

  test('omits Authorization header when no token', async () => {
    mockOk({ success: true, transcript: [], language: 'en' });

    await fetchTranscript({ videoId: 'abc123' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  test('returns transcript data on success', async () => {
    const transcript = [
      { timestamp: '0:00', start_seconds: 0, duration: 5, text: 'Hello' },
    ];
    mockOk({ success: true, transcript, language: 'en', video_title: 'My Video' });

    const result = await fetchTranscript({ videoId: 'abc123' });

    expect(result.success).toBe(true);
    expect(result.transcript).toEqual(transcript);
    expect(result.language).toBe('en');
  });

  test('returns error on HTTP failure', async () => {
    mockError(500, 'Internal server error');

    const result = await fetchTranscript({ videoId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Internal server error');
  });

  test('returns error when backend returns success:false', async () => {
    mockOk({ success: false, message: 'Transcript unavailable' });

    const result = await fetchTranscript({ videoId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transcript unavailable');
  });

  test('handles network failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchTranscript({ videoId: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  test('calls correct endpoint', async () => {
    mockOk({ success: true, transcript: [] });

    await fetchTranscript({ videoId: 'abc123' });

    expect(mockFetch.mock.calls[0][0]).toContain('/api/transcript/extract');
  });
});

// ------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------

describe('fetchSummary', () => {
  test('sends required fields in POST body', async () => {
    mockOk({ success: true, summary: 'A summary', format: 'short' });

    await fetchSummary({ videoId: 'abc123', transcript: 'some text', format: 'short' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.video_id).toBe('abc123');
    expect(body.transcript).toBe('some text');
    expect(body.format).toBe('short');
  });

  test('includes Authorization header when token provided', async () => {
    mockOk({ success: true, summary: 'A summary' });

    await fetchSummary({ videoId: 'abc123', transcript: 'text', format: 'topic', token: 'tok' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer tok');
  });

  test('returns summary text on success', async () => {
    mockOk({ success: true, summary: 'Here is a summary', is_structured: true });

    const result = await fetchSummary({ videoId: 'abc123', transcript: 'text', format: 'qa' });

    expect(result.success).toBe(true);
    expect(result.summary).toBe('Here is a summary');
    expect(result.is_structured).toBe(true);
  });

  test('returns error on HTTP failure', async () => {
    mockError(401, 'Unauthorized');

    const result = await fetchSummary({ videoId: 'abc123', transcript: 'text', format: 'short' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  test('handles network failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await fetchSummary({ videoId: 'abc123', transcript: 'text', format: 'short' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch');
  });

  test('calls correct endpoint', async () => {
    mockOk({ success: true, summary: '' });

    await fetchSummary({ videoId: 'abc123', transcript: 'text', format: 'short' });

    expect(mockFetch.mock.calls[0][0]).toContain('/api/summary/generate');
  });
});

// ------------------------------------------------------------------
// Chat
// ------------------------------------------------------------------

describe('fetchChatMessage', () => {
  test('sends required fields in POST body', async () => {
    mockOk({ success: true, response: 'AI answer' });

    await fetchChatMessage({
      videoId: 'abc123',
      transcript: 'full transcript',
      question: 'What is this about?',
      chatHistory: [],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.video_id).toBe('abc123');
    expect(body.question).toBe('What is this about?');
    expect(body.chat_history).toEqual([]);
  });

  test('includes Authorization header when token provided', async () => {
    mockOk({ success: true, response: 'answer' });

    await fetchChatMessage({
      videoId: 'abc123',
      transcript: 'text',
      question: 'Q?',
      chatHistory: [],
      token: 'chat-token',
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer chat-token');
  });

  test('returns AI response on success', async () => {
    mockOk({ success: true, response: 'The video is about X' });

    const result = await fetchChatMessage({
      videoId: 'abc123',
      transcript: 'text',
      question: 'Q?',
      chatHistory: [],
    });

    expect(result.success).toBe(true);
    expect(result.response).toBe('The video is about X');
  });

  test('passes chat history correctly', async () => {
    mockOk({ success: true, response: 'follow-up answer' });

    const history = [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
    ];

    await fetchChatMessage({
      videoId: 'abc123',
      transcript: 'text',
      question: 'Follow-up?',
      chatHistory: history,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_history).toEqual(history);
  });

  test('returns error on HTTP failure', async () => {
    mockError(500, 'Server error');

    const result = await fetchChatMessage({
      videoId: 'abc123',
      transcript: 'text',
      question: 'Q?',
      chatHistory: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error');
  });

  test('calls correct endpoint', async () => {
    mockOk({ success: true, response: '' });

    await fetchChatMessage({ videoId: 'abc123', transcript: 'text', question: 'Q?', chatHistory: [] });

    expect(mockFetch.mock.calls[0][0]).toContain('/api/chat/message');
  });
});

// ------------------------------------------------------------------
// Token refresh
// ------------------------------------------------------------------

describe('refreshAccessToken', () => {
  test('sends refresh_token in POST body', async () => {
    mockOk({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    await refreshAccessToken('old-refresh-token');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.refresh_token).toBe('old-refresh-token');
  });

  test('returns new tokens on success', async () => {
    mockOk({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const result = await refreshAccessToken('old-refresh-token');

    expect(result.success).toBe(true);
    expect(result.tokens?.accessToken).toBe('new-access');
    expect(result.tokens?.refreshToken).toBe('new-refresh');
    expect(result.tokens?.expiresIn).toBe(3600);
  });

  test('returns error on HTTP 401', async () => {
    mockError(401, 'Invalid refresh token');

    const result = await refreshAccessToken('bad-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid refresh token');
  });

  test('handles network failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await refreshAccessToken('token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  test('calls correct endpoint', async () => {
    mockOk({ access_token: 'a', refresh_token: 'b', expires_in: 3600, token_type: 'Bearer' });

    await refreshAccessToken('token');

    expect(mockFetch.mock.calls[0][0]).toContain('/api/auth/refresh');
  });
});
