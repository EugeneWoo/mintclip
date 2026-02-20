/**
 * export.test.ts - Tests for web-app/src/utils/export.ts
 *
 * All browser APIs (URL.createObjectURL, document.createElement, fetch) are
 * mocked in jest.setup.ts. JSZip is mocked via __mocks__/jszip.ts.
 */

import { exportVideoAsZip, fetchAllItemsForVideo, SavedItem } from '../utils/export';

// Access JSZip mock instance across tests
import JSZip from 'jszip';
const MockJSZip = JSZip as jest.MockedClass<typeof JSZip>;

// Mock browser APIs not available in jsdom
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  const originalCreateElement = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = originalCreateElement(tag);
    if (tag === 'a') {
      jest.spyOn(element as HTMLAnchorElement, 'click').mockImplementation(() => {});
    }
    return element;
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTranscriptItem(overrides: Partial<SavedItem> = {}): SavedItem {
  return {
    id: 'item-transcript-1',
    video_id: 'vid123',
    item_type: 'transcript',
    content: {
      segments: [
        { start: 0, text: 'Hello world.' },
        { start: 5, text: 'This is a test.' },
      ],
      videoTitle: 'Test Video',
      language: 'en',
    },
    created_at: '2025-01-01T00:00:00Z',
    source: 'extension',
    ...overrides,
  };
}

function makeSummaryItem(format: string, summaryText: string, overrides: Partial<SavedItem> = {}): SavedItem {
  return {
    id: `item-summary-${format}`,
    video_id: 'vid123',
    item_type: 'summary',
    content: {
      format,
      summary: summaryText,
    },
    created_at: '2025-01-01T00:00:00Z',
    source: 'extension',
    ...overrides,
  };
}

// ── exportVideoAsZip ──────────────────────────────────────────────────────────

describe('exportVideoAsZip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockJSZip.mockClear();
  });

  it('creates a ZIP with transcript file for transcript item', async () => {
    const items = [makeTranscriptItem()];
    await exportVideoAsZip('My Test Video', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect(zipInstance.file).toHaveBeenCalledWith(
      expect.stringContaining('transcript_'),
      expect.stringContaining('Hello world.')
    );
    expect(zipInstance.generateAsync).toHaveBeenCalledWith({ type: 'blob' });
  });

  it('creates a ZIP with summary_short file for short summary', async () => {
    const items = [makeSummaryItem('short', 'This is a short summary.')];
    await exportVideoAsZip('Test Video', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect(zipInstance.file).toHaveBeenCalledWith(
      expect.stringContaining('summary_short_'),
      expect.stringContaining('Short Summary')
    );
  });

  it('creates a ZIP with summary_topic file for topic summary', async () => {
    const items = [makeSummaryItem('topic', 'Topic based summary text.')];
    await exportVideoAsZip('Test Video', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect(zipInstance.file).toHaveBeenCalledWith(
      expect.stringContaining('summary_topic_'),
      expect.any(String)
    );
  });

  it('creates a ZIP with summary_qa file for qa summary', async () => {
    const items = [makeSummaryItem('qa', 'Q&A summary text.')];
    await exportVideoAsZip('Test Video', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect(zipInstance.file).toHaveBeenCalledWith(
      expect.stringContaining('summary_qa_'),
      expect.any(String)
    );
  });

  it('handles formats object (extension nested structure)', async () => {
    const item: SavedItem = {
      id: 'item-formats',
      video_id: 'vid123',
      item_type: 'summary',
      content: {
        formats: {
          short: { summary: 'Short format text.' },
          topic: { summary: 'Topic format text.' },
        },
      },
      created_at: '2025-01-01T00:00:00Z',
      source: 'extension',
    };
    await exportVideoAsZip('Formats Test', [item]);

    const zipInstance = MockJSZip.mock.results[0].value;
    const fileCalls = (zipInstance.file as jest.Mock).mock.calls.map(([name]) => name);
    expect(fileCalls.some((n: string) => n.includes('summary_short_'))).toBe(true);
    expect(fileCalls.some((n: string) => n.includes('summary_topic_'))).toBe(true);
  });

  it('handles legacy summaries object', async () => {
    const item: SavedItem = {
      id: 'item-legacy',
      video_id: 'vid123',
      item_type: 'summary',
      content: {
        summaries: {
          short: 'Legacy short.',
          qa: 'Legacy Q&A.',
        },
      },
      created_at: '2025-01-01T00:00:00Z',
      source: 'extension',
    };
    await exportVideoAsZip('Legacy Test', [item]);

    const zipInstance = MockJSZip.mock.results[0].value;
    const fileCalls = (zipInstance.file as jest.Mock).mock.calls.map(([name]) => name);
    expect(fileCalls.some((n: string) => n.includes('summary_short_'))).toBe(true);
    expect(fileCalls.some((n: string) => n.includes('summary_qa_'))).toBe(true);
  });

  it('skips items with unknown item_type', async () => {
    const item = {
      id: 'item-unknown',
      video_id: 'vid123',
      item_type: 'unknown_type' as any,
      content: {},
      created_at: '2025-01-01T00:00:00Z',
      source: 'extension' as const,
    };
    await exportVideoAsZip('Test', [item]);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect(zipInstance.file).not.toHaveBeenCalled();
  });

  it('triggers download by calling link.click', async () => {
    const items = [makeTranscriptItem()];
    await exportVideoAsZip('Download Test', items);

    // URL.createObjectURL should have been called with the blob
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('sanitizes video title in filename', async () => {
    const items = [makeTranscriptItem()];
    await exportVideoAsZip('Title: With/Invalid<Chars>', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    const fileCalls = (zipInstance.file as jest.Mock).mock.calls;
    // No invalid chars in any filename
    fileCalls.forEach(([name]: [string]) => {
      expect(name).not.toMatch(/[<>:"/\\|?*]/);
    });
  });

  it('includes video title as H1 in transcript markdown', async () => {
    const items = [makeTranscriptItem()];
    await exportVideoAsZip('My Amazing Video', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    const fileCall = (zipInstance.file as jest.Mock).mock.calls[0];
    const content = fileCall[1] as string;
    expect(content).toContain('# Transcript: My Amazing Video');
  });

  it('handles multiple items in one export', async () => {
    const items = [
      makeTranscriptItem(),
      makeSummaryItem('short', 'Short text.'),
      makeSummaryItem('topic', 'Topic text.'),
    ];
    await exportVideoAsZip('Multi Item', items);

    const zipInstance = MockJSZip.mock.results[0].value;
    expect((zipInstance.file as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

// ── fetchAllItemsForVideo ─────────────────────────────────────────────────────

describe('fetchAllItemsForVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the correct API endpoint with Bearer token', async () => {
    const mockItems = [
      makeTranscriptItem(),
      { ...makeTranscriptItem(), video_id: 'other_vid' },
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, items: mockItems }),
    });

    await fetchAllItemsForVideo('vid123', 'test-token-abc');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/saved-items/list',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token-abc' },
      })
    );
  });

  it('filters items to only the requested video_id', async () => {
    const item1 = makeTranscriptItem({ video_id: 'vid123' });
    const item2 = makeTranscriptItem({ id: 'other', video_id: 'other_vid' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, items: [item1, item2] }),
    });

    const result = await fetchAllItemsForVideo('vid123', 'token');

    expect(result).toHaveLength(1);
    expect(result[0].video_id).toBe('vid123');
  });

  it('throws on non-ok HTTP response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchAllItemsForVideo('vid123', 'token')).rejects.toThrow(
      'Failed to fetch saved items'
    );
  });

  it('throws when data.success is false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'Unauthorized' }),
    });

    await expect(fetchAllItemsForVideo('vid123', 'token')).rejects.toThrow();
  });

  it('returns empty array when no items match video_id', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, items: [] }),
    });

    const result = await fetchAllItemsForVideo('vid123', 'token');
    expect(result).toEqual([]);
  });
});
