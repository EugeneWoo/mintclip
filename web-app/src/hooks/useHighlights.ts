/**
 * useHighlights hook
 * Manages highlight state for a given video: fetch, add, remove
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../utils/auth';
import {
  fetchHighlights,
  saveHighlight,
  deleteHighlight,
  Highlight,
  SaveHighlightPayload,
} from '../utils/highlights';

interface UseHighlightsReturn {
  highlights: Highlight[];
  loading: boolean;
  error: string | null;
  addHighlight: (payload: SaveHighlightPayload) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  operationLoading: boolean;
  operationError: string | null;
}

export function useHighlights(videoId: string | null): UseHighlightsReturn {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<boolean>(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Fetch highlights whenever videoId changes
  useEffect(() => {
    if (videoId === null) {
      setHighlights([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const data = await fetchHighlights(videoId!, token);
        if (!cancelled) {
          setHighlights(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load highlights');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const addHighlight = useCallback(async (payload: SaveHighlightPayload): Promise<void> => {
    setOperationLoading(true);
    setOperationError(null);

    try {
      const token = await getAuthToken();
      const created = await saveHighlight(payload, token);
      setHighlights((prev) => [...prev, created]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save highlight';
      setOperationError(message);
      throw err;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  const removeHighlight = useCallback(async (id: string): Promise<void> => {
    setOperationLoading(true);
    setOperationError(null);

    try {
      const token = await getAuthToken();
      await deleteHighlight(id, token);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete highlight';
      setOperationError(message);
      throw err;
    } finally {
      setOperationLoading(false);
    }
  }, []);

  return {
    highlights,
    loading,
    error,
    addHighlight,
    removeHighlight,
    operationLoading,
    operationError,
  };
}
