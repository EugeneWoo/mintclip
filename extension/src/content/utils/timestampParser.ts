/**
 * Timestamp Parser Utility
 * Extracts and parses timestamps in (MM:SS) format from text
 *
 * @example
 * parseTimestamps("Discussion (05:23) about AI") // Returns typed array
 * parseTimestamps("Topic A (02:15), Topic B (07:30)") // Handles multiple timestamps
 * parseTimestamps("No timestamps here") // Returns text-only array
 */

/**
 * Parse timestamps from text in format (MM:SS)
 * Returns array of typed parts (text or timestamp) with calculated seconds
 *
 * @param text - The text string to parse for timestamps
 * @returns Array of typed parts with type ('text' | 'timestamp'), text, and optional seconds
 */
export function parseTimestamps(text: string): Array<{
  type: 'text' | 'timestamp';
  text: string;
  seconds?: number;
}> {
  const regex = /\((\d{1,2}):(\d{2})\)/g;
  const parts: Array<{ type: 'text' | 'timestamp'; text: string; seconds?: number }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before timestamp
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: text.slice(lastIndex, match.index)
      });
    }

    // Parse timestamp
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const totalSeconds = minutes * 60 + seconds;

    parts.push({
      type: 'timestamp',
      text: match[0],  // Full timestamp including parentheses: "(MM:SS)"
      seconds: totalSeconds
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last timestamp
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      text: text.slice(lastIndex)
    });
  }

  return parts;
}
