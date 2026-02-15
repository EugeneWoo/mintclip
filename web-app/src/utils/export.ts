/**
 * Export utilities for creating ZIP files of saved items
 */

import JSZip from 'jszip';
import { BACKEND_URL } from '../config';

export interface SavedItem {
  id: string;
  video_id: string;
  item_type: 'transcript' | 'summary';
  content: any;
  created_at: string;
  source: 'extension' | 'upload';
}

/**
 * Sanitize a filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 200); // Limit length
}

/**
 * Convert transcript to markdown format
 */
function transcriptToMarkdown(content: any, videoTitle: string): string {
  let md = `# Transcript: ${videoTitle}\n\n`;

  if (content.videoTitle) {
    md += `**Video Title:** ${content.videoTitle}\n\n`;
  }
  if (content.videoId) {
    md += `**Video ID:** ${content.videoId}\n\n`;
  }
  if (content.videoUrl) {
    md += `**Video URL:** ${content.videoUrl}\n\n`;
  }
  if (content.language) {
    md += `**Language:** ${content.language}\n\n`;
  }

  md += `---\n\n## Transcript\n\n`;

  if (content.segments && Array.isArray(content.segments)) {
    content.segments.forEach((segment: any) => {
      const timestamp = segment.start || segment.offset || '';
      const timeStr = timestamp ? `[${formatTimestamp(timestamp)}] ` : '';
      const text = segment.text || '';
      md += `${timeStr}${text}\n\n`;
    });
  }

  return md;
}

/**
 * Convert summary to markdown format
 */
function summaryToMarkdown(content: any, videoTitle: string): string {
  console.log('[summaryToMarkdown] Input content:', {
    content_keys: Object.keys(content || {}),
    has_summary: !!content?.summary,
    has_summaries: !!content?.summaries,
    has_formats: !!content?.formats,
    full_content: content
  });

  let md = `# Summary: ${videoTitle}\n\n`;

  if (content.videoTitle) {
    md += `**Video Title:** ${content.videoTitle}\n\n`;
  }
  if (content.videoId) {
    md += `**Video ID:** ${content.videoId}\n\n`;
  }
  if (content.videoUrl) {
    md += `**Video URL:** ${content.videoUrl}\n\n`;
  }

  md += `---\n\n`;

  // Handle different summary storage structures:
  // 1. Direct summary at root: { format: "short", summary: "..." }
  // 2. Direct summary field: { summary: "..." }
  // 3. Summaries object (legacy): { summaries: { short: "...", topic: "...", qa: "..." } }
  // 4. Formats object (Extension): { formats: { short: { summary: "..." }, ... } }

  // Format 1: Direct summary at root with format field
  if (content.summary && typeof content.summary === 'string' && content.format) {
    console.log('[summaryToMarkdown] Using root-level summary with format:', content.format);
    const formatType = content.format.charAt(0).toUpperCase() + content.format.slice(1);
    md += `## ${formatType} Summary\n\n${content.summary}\n\n`;
  }
  // Format 2: Direct summary field (simple format)
  else if (content.summary && typeof content.summary === 'string') {
    console.log('[summaryToMarkdown] Using direct summary field');
    md += `## Summary\n\n${content.summary}\n\n`;
  }
  // Format 3: Summaries object (legacy format)
  else if (content.summaries) {
    console.log('[summaryToMarkdown] Using summaries object');
    if (content.summaries.short) {
      md += `## Short Summary\n\n${content.summaries.short}\n\n`;
    }
    if (content.summaries.topic) {
      md += `## Topic-Based Summary\n\n${content.summaries.topic}\n\n`;
    }
    if (content.summaries.qa) {
      md += `## Q&A Summary\n\n${content.summaries.qa}\n\n`;
    }
  }
  // Format 4: Formats object (Extension's nested structure)
  else if (content.formats) {
    console.log('[summaryToMarkdown] Using formats object');
    if (content.formats.short?.summary) {
      console.log('[summaryToMarkdown] Adding short summary');
      md += `## Short Summary\n\n${content.formats.short.summary}\n\n`;
    }
    if (content.formats.topic?.summary) {
      console.log('[summaryToMarkdown] Adding topic summary');
      md += `## Topic-Based Summary\n\n${content.formats.topic.summary}\n\n`;
      if (content.formats.topic.topics && Array.isArray(content.formats.topic.topics)) {
        md += `### Topics\n\n`;
        content.formats.topic.topics.forEach((topic: string) => {
          md += `- ${topic}\n`;
        });
        md += `\n`;
      }
    }
    if (content.formats.qa?.summary) {
      console.log('[summaryToMarkdown] Adding Q&A summary');
      md += `## Q&A Summary\n\n${content.formats.qa.summary}\n\n`;
      if (content.formats.qa.questions && Array.isArray(content.formats.qa.questions)) {
        md += `### Questions & Answers\n\n`;
        content.formats.qa.questions.forEach((qa: any) => {
          md += `**Q:** ${qa.question}\n\n`;
          md += `**A:** ${qa.answer}\n\n`;
        });
      }
    }
  } else {
    console.warn('[summaryToMarkdown] No summary content found!');
  }

  return md;
}

/**
 * Format timestamp in seconds to MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Export all saved items for a video as a ZIP file
 */
export async function exportVideoAsZip(
  videoTitle: string,
  items: SavedItem[]
): Promise<void> {
  console.log('[exportVideoAsZip] Processing items:', items.map(item => ({ item_type: item.item_type, id: item.id })));

  const zip = new JSZip();
  const sanitizedName = sanitizeFilename(videoTitle);
  const addedFiles: string[] = [];

  // Process each item
  for (const item of items) {
    console.log(`[exportVideoAsZip] Processing item: ${item.item_type}`, {
      id: item.id,
      content_keys: Object.keys(item.content || {}),
      has_formats: !!item.content?.formats,
      has_summaries: !!item.content?.summaries,
      has_summary: !!item.content?.summary,
    });

    switch (item.item_type) {
      case 'transcript': {
        const content = transcriptToMarkdown(item.content, videoTitle);
        const filename = `transcript_${sanitizedName}.md`;
        console.log(`[exportVideoAsZip] Adding transcript: ${filename}`);
        zip.file(filename, content);
        addedFiles.push(filename);
        break;
      }

      case 'summary': {
        // Handle different summary storage structures:
        // 1. Single format at root: { format: "short", summary: "..." }
        // 2. Multiple formats in one row: { formats: { short: {...}, topic: {...}, qa: {...} } }
        // 3. Legacy summaries object: { summaries: { short: "...", topic: "...", qa: "..." } }

        console.log(`[exportVideoAsZip] Processing summary item:`, {
          id: item.id,
          has_format: !!item.content?.format,
          format_value: item.content?.format,
          has_formats: !!item.content?.formats,
          has_summaries: !!item.content?.summaries,
          has_summary: !!item.content?.summary
        });

        // Case 1: Root-level format + summary (one format per row)
        if (item.content?.format && item.content?.summary) {
          const formatType = item.content.format; // 'short', 'topic', or 'qa'
          const content = summaryToMarkdown(item.content, videoTitle);
          const filename = `summary_${formatType}_${sanitizedName}.md`;
          console.log(`[exportVideoAsZip] Adding summary_${formatType}: ${filename}`);
          zip.file(filename, content);
          addedFiles.push(filename);
        }
        // Case 2: Formats object (multiple formats in one row)
        else if (item.content?.formats) {
          const formats = item.content.formats;
          if (formats.short?.summary) {
            const contentForShort = { ...item.content, format: 'short', summary: formats.short.summary };
            const content = summaryToMarkdown(contentForShort, videoTitle);
            const filename = `summary_short_${sanitizedName}.md`;
            console.log(`[exportVideoAsZip] Adding summary_short: ${filename}`);
            zip.file(filename, content);
            addedFiles.push(filename);
          }
          if (formats.topic?.summary) {
            const contentForTopic = { ...item.content, format: 'topic', summary: formats.topic.summary };
            const content = summaryToMarkdown(contentForTopic, videoTitle);
            const filename = `summary_topic_${sanitizedName}.md`;
            console.log(`[exportVideoAsZip] Adding summary_topic: ${filename}`);
            zip.file(filename, content);
            addedFiles.push(filename);
          }
          if (formats.qa?.summary) {
            const contentForQa = { ...item.content, format: 'qa', summary: formats.qa.summary };
            const content = summaryToMarkdown(contentForQa, videoTitle);
            const filename = `summary_qa_${sanitizedName}.md`;
            console.log(`[exportVideoAsZip] Adding summary_qa: ${filename}`);
            zip.file(filename, content);
            addedFiles.push(filename);
          }
        }
        // Case 3: Legacy summaries object
        else if (item.content?.summaries) {
          if (item.content.summaries.short) {
            const contentForShort = { ...item.content, format: 'short', summary: item.content.summaries.short };
            const content = summaryToMarkdown(contentForShort, videoTitle);
            const filename = `summary_short_${sanitizedName}.md`;
            zip.file(filename, content);
            addedFiles.push(filename);
          }
          if (item.content.summaries.topic) {
            const contentForTopic = { ...item.content, format: 'topic', summary: item.content.summaries.topic };
            const content = summaryToMarkdown(contentForTopic, videoTitle);
            const filename = `summary_topic_${sanitizedName}.md`;
            zip.file(filename, content);
            addedFiles.push(filename);
          }
          if (item.content.summaries.qa) {
            const contentForQa = { ...item.content, format: 'qa', summary: item.content.summaries.qa };
            const content = summaryToMarkdown(contentForQa, videoTitle);
            const filename = `summary_qa_${sanitizedName}.md`;
            zip.file(filename, content);
            addedFiles.push(filename);
          }
        }
        // Case 4: Direct summary field (no format info)
        else if (item.content?.summary) {
          const content = summaryToMarkdown(item.content, videoTitle);
          const filename = `summary_${sanitizedName}.md`;
          console.log(`[exportVideoAsZip] Adding summary (no format): ${filename}`);
          zip.file(filename, content);
          addedFiles.push(filename);
        } else {
          console.warn(`[exportVideoAsZip] No summary content found for item ${item.id}`);
        }
        break;
      }

      default:
        console.warn(`[exportVideoAsZip] Unknown item type: ${item.item_type}`);
        continue;
    }
  }

  // Generate the ZIP file
  const blob = await zip.generateAsync({ type: 'blob' });

  // Download the file
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedName}_mintclip_export.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetch all saved items for a specific video
 */
export async function fetchAllItemsForVideo(
  videoId: string,
  token: string
): Promise<SavedItem[]> {
  const response = await fetch(`${BACKEND_URL}/api/saved-items/list`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch saved items');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch saved items');
  }

  // Filter items for this video
  const videoItems = (data.items || []).filter((item: SavedItem) => item.video_id === videoId);

  return videoItems;
}
