/**
 * Highlights API client for Mintclip
 * Handles all /api/highlights endpoint communication
 */

import { BACKEND_URL } from '../config';

export interface Highlight {
  id: string;
  video_id: string;
  selected_text: string;
  source_type: 'transcript' | 'summary';
  segment_index: number | null;
  char_start: number;
  char_end: number;
  summary_format: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface SaveHighlightPayload {
  video_id: string;
  selected_text: string;
  source_type: 'transcript' | 'summary';
  segment_index?: number;
  char_start: number;
  char_end: number;
  summary_format?: string;
  expires_at?: string;
}

/**
 * Fetch all highlights for a given video.
 * Throws on HTTP error.
 */
export async function fetchHighlights(videoId: string, token: string): Promise<Highlight[]> {
  const response = await fetch(
    `${BACKEND_URL}/api/highlights/${encodeURIComponent(videoId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to fetch highlights (${response.status})${text ? `: ${text}` : ''}`);
  }

  const data = await response.json();
  return (data.highlights ?? data) as Highlight[];
}

/**
 * Save a new highlight.
 * Throws on HTTP error.
 */
export async function saveHighlight(
  payload: SaveHighlightPayload,
  token: string
): Promise<Highlight> {
  const response = await fetch(`${BACKEND_URL}/api/highlights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to save highlight (${response.status})${text ? `: ${text}` : ''}`);
  }

  const data = await response.json();
  return (data.highlight ?? data) as Highlight;
}

/**
 * Delete a highlight by ID.
 * Throws on HTTP error.
 */
export async function deleteHighlight(id: string, token: string): Promise<void> {
  const response = await fetch(
    `${BACKEND_URL}/api/highlights/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to delete highlight (${response.status})${text ? `: ${text}` : ''}`);
  }
}
