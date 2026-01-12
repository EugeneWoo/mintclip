/**
 * Tests for YouTube page detection
 */

function isYouTubePage(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch/,
    /youtube\.com\/shorts\//,
    /youtube\.com\/@/,
    /youtube\.com\/channel\//,
  ];
  
  return patterns.some((pattern) => pattern.test(url));
}

describe('YouTube Page Detection', () => {
  test('should detect watch URLs', () => {
    expect(isYouTubePage('https://www.youtube.com/watch?v=abc123')).toBe(true);
    expect(isYouTubePage('https://youtube.com/watch?v=xyz789')).toBe(true);
  });

  test('should detect shorts URLs', () => {
    expect(isYouTubePage('https://www.youtube.com/shorts/abc123')).toBe(true);
    expect(isYouTubePage('https://youtube.com/shorts/xyz789')).toBe(true);
  });

  test('should detect channel @ URLs', () => {
    expect(isYouTubePage('https://www.youtube.com/@channelname')).toBe(true);
    expect(isYouTubePage('https://youtube.com/@user')).toBe(true);
  });

  test('should detect channel URLs', () => {
    expect(isYouTubePage('https://www.youtube.com/channel/UC123456')).toBe(true);
    expect(isYouTubePage('https://youtube.com/channel/UC789012')).toBe(true);
  });

  test('should not detect non-YouTube URLs', () => {
    expect(isYouTubePage('https://www.google.com')).toBe(false);
    expect(isYouTubePage('https://example.com')).toBe(false);
  });
});

