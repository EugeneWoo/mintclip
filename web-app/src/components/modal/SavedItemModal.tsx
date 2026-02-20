/**
 * SavedItemModal Component
 * Displays and generates content for saved items
 * - source='extension': View-only mode
 * - source='upload': Interactive mode (generate summaries)
 * Mobile-optimized with fixed scrolling and responsive layout
 */

import { useState, useEffect, useRef } from 'react';
import { generateSummary, saveItem, sendChatMessage, getSuggestedQuestions } from '../../utils/api';

// Types matching extension format
type SummaryFormat = 'short' | 'topic' | 'qa';

interface TranscriptSegment {
  timestamp: string;
  start_seconds?: number;
  duration?: number;
  text: string;
}

// Summary format for extension's nested structure
interface SummaryFormatData {
  summary?: string;
  is_structured?: boolean;
}

// Extension save format
interface SavedItemData {
  video_id: string;
  video_title: string;
  video_thumbnail?: string;
  item_type: 'transcript' | 'summary' | 'chat';
  content: {
    // Transcript format
    videoTitle?: string;
    savedAt?: string;
    language?: string;
    text?: string;
    segments?: TranscriptSegment[];

    // Summary format (direct)
    format?: SummaryFormat;
    summary?: string;
    is_structured?: boolean;

    // Summary format (nested - extension saves multiple formats)
    formats?: {
      short?: SummaryFormatData;
      topic?: SummaryFormatData;
      qa?: SummaryFormatData;
    };
  };
  created_at: string;
  source?: 'extension' | 'upload';
}

interface SavedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SavedItemData;
  isAuthenticated?: boolean;
}

// Chat Message Interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

type TabType = 'transcript' | 'summary' | 'chat';

/**
 * Convert markdown to HTML for chat message display
 * Handles basic markdown: bold, italic, lists, code blocks, links
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Code blocks (triple backticks)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>$2</code></pre>');

  // Inline code (single backticks)
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 12px;">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #667eea; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bullet lists
  html = html.replace(/^\- (.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 0;">$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 20px;">$1</li>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

export function SavedItemModal({
  isOpen,
  onClose,
  item,
}: SavedItemModalProps): React.JSX.Element | null {
  const isInteractive = item?.source === 'upload';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [currentFormat, setCurrentFormat] = useState<SummaryFormat>('short');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Chat state (only for upload items)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Refs for auto-scroll
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Generated content state (for upload items)
  const [generatedSummaries, setGeneratedSummaries] = useState<{
    short?: string;
    topic?: string;
    qa?: string;
    short_is_structured?: boolean;
    topic_is_structured?: boolean;
    qa_is_structured?: boolean;
  }>({});

  // Initialize based on item type and content
  useEffect(() => {
    if (item) {
      try {
        console.log('[SavedItemModal] Item received:', item);
        console.log('[SavedItemModal] Item content:', item.content);

        // Set current format from saved item if available
        if (item.content?.format) {
          setCurrentFormat(item.content.format);
        }

        // Handle extension summary format: content.formats.{format}.summary
        if (item.content?.formats) {
          // For extension items with nested formats structure
          const formats = item.content.formats;
          console.log('[SavedItemModal] Loading formats:', formats);
          setGeneratedSummaries({
            short: formats.short?.summary,
            topic: formats.topic?.summary,
            qa: formats.qa?.summary,
            short_is_structured: formats.short?.is_structured,
            topic_is_structured: formats.topic?.is_structured,
            qa_is_structured: formats.qa?.is_structured,
          });
          // Set first available format
          if (formats.short?.summary) setCurrentFormat('short');
          else if (formats.topic?.summary) setCurrentFormat('topic');
          else if (formats.qa?.summary) setCurrentFormat('qa');
        }

        // Determine default tab based on available content
        if (item.content?.segments && item.content.segments.length > 0) {
          setActiveTab('transcript');
        } else if (item.content?.summary || item.content?.formats) {
          setActiveTab('summary');
        }
      } catch (error) {
        console.error('Error initializing modal:', error);
      }
    }
  }, [item]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Clear copy success message after 2 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Load chat context from sessionStorage on mount (upload items only)
  useEffect(() => {
    if (isInteractive && item) {
      const CHAT_STORAGE_KEY = `mintclip_chat_${item.video_id}`;
      const savedChat = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            setChatMessages(parsed.messages);
            console.log('[SavedItemModal] Restored chat context from sessionStorage');
          }
        } catch (error) {
          console.error('[SavedItemModal] Failed to parse chat context:', error);
          sessionStorage.removeItem(CHAT_STORAGE_KEY);
        }
      }
    }
  }, [isInteractive, item]);

  // Auto-save chat context to sessionStorage whenever it changes (upload items only)
  useEffect(() => {
    if (isInteractive && chatMessages.length > 0) {
      const CHAT_STORAGE_KEY = `mintclip_chat_${item.video_id}`;
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        messages: chatMessages,
        timestamp: Date.now(),
      }));
      console.log('[SavedItemModal] Saved chat context to sessionStorage');
    }
  }, [isInteractive, chatMessages, item.video_id]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  // Auto-fetch suggested questions when Chat tab opens with no messages (upload items only)
  useEffect(() => {
    if (isInteractive && activeTab === 'chat' && chatMessages.length === 0 && suggestedQuestions.length === 0 && !questionsLoading) {
      handleFetchSuggestedQuestions();
    }
  }, [isInteractive, activeTab, chatMessages.length, suggestedQuestions.length, questionsLoading]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Chat: Send message
  const handleSendChatMessage = async (message?: string) => {
    const messageToSend = message?.trim() || chatInput.trim();
    if (!messageToSend || isLoadingChat || !isInteractive) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoadingChat(true);

    try {
      const transcriptText = getTranscriptText();
      if (!transcriptText) {
        console.error('No transcript available for chat');
        return;
      }

      const response = await sendChatMessage(
        item.video_id,
        transcriptText,
        messageToSend,
        chatMessages
      );

      if (response.success && response.response) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        console.error('Chat failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Chat: Fetch suggested questions
  const handleFetchSuggestedQuestions = async () => {
    if (!isInteractive || questionsLoading) return;

    setQuestionsLoading(true);
    try {
      const transcriptText = getTranscriptText();
      if (!transcriptText) {
        console.error('No transcript available for suggested questions');
        return;
      }

      const response = await getSuggestedQuestions(item.video_id, transcriptText);

      if (response.success && response.questions) {
        setSuggestedQuestions(response.questions);
      } else {
        console.error('Failed to fetch suggested questions:', response.error);
      }
    } catch (error) {
      console.error('Failed to fetch suggested questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Chat: Handle keyboard shortcuts
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  // Get transcript text from item content
  const getTranscriptText = (): string => {
    return item.content?.text || '';
  };

  const getTranscriptSegments = (): TranscriptSegment[] => {
    return item.content?.segments || [];
  };

  // Group transcript segments into paragraphs (matching extension logic)
  const getGroupedTranscript = () => {
    const segments = getTranscriptSegments();
    if (!segments || segments.length === 0) return [];

    const groups: Array<{timestamp: string, startSeconds: number, text: string}> = [];
    let currentGroup: { start: number; texts: string[] } = { start: 0, texts: [] };

    segments.forEach((segment, index) => {
      const startSeconds = segment.start_seconds ?? 0;
      let text = segment.text.trim();

      // Capitalize first word of entire transcript
      if (index === 0 && text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }

      // Calculate gap between segments
      const gap = index > 0
        ? startSeconds - (segments[index - 1].start_seconds ?? 0) - (segments[index - 1].duration ?? 0)
        : 0;

      // Paragraph break heuristics
      const isLongGap = gap > 2.0;
      const endsWithPunctuation = /[.!?]$/.test(currentGroup.texts.join(' '));
      const currentGroupTooLong = currentGroup.texts.length >= 8;

      const shouldBreak = currentGroup.texts.length > 0 && (
        isLongGap ||
        (endsWithPunctuation && gap > 1.0) ||
        currentGroupTooLong
      );

      if (shouldBreak) {
        groups.push({
          timestamp: segment.timestamp,
          startSeconds: currentGroup.start,
          text: currentGroup.texts.join(' ')
        });
        // Capitalize new paragraph if previous ended with punctuation
        let newText = text;
        if (endsWithPunctuation && text.length > 0) {
          newText = text.charAt(0).toUpperCase() + text.slice(1);
        }
        currentGroup = { start: startSeconds, texts: [newText] };
      } else {
        if (currentGroup.texts.length === 0) {
          currentGroup.start = startSeconds;
        }
        currentGroup.texts.push(text);
      }
    });

    // Add final paragraph
    if (currentGroup.texts.length > 0) {
      const lastSegment = segments[segments.length - 1];
      groups.push({
        timestamp: lastSegment.timestamp,
        startSeconds: currentGroup.start,
        text: currentGroup.texts.join(' ')
      });
    }

    return groups;
  };

  // Get filtered transcript based on search query
  const getFilteredTranscript = () => {
    const grouped = getGroupedTranscript();
    if (!searchQuery) return grouped;

    const query = searchQuery.toLowerCase();
    return grouped.filter(segment =>
      segment.text.toLowerCase().includes(query)
    );
  };

  const getCurrentSummary = (): string | undefined => {
    // Check for direct summary (simple save format) - ONLY if format matches
    if (item.content.summary && item.content.format === currentFormat) {
      console.log('[SavedItemModal] Using direct summary for format', currentFormat, ':', item.content.summary);
      return item.content.summary;
    }
    // Check for nested formats structure (extension multi-format save)
    if (item.content.formats && item.content.formats[currentFormat]) {
      const summary = item.content.formats[currentFormat]?.summary;
      console.log('[SavedItemModal] Using formats summary for', currentFormat, ':', summary);
      return summary;
    }
    // Generated summary (upload items)
    const genSummary = generatedSummaries[currentFormat];
    console.log('[SavedItemModal] Using generated summary for', currentFormat, ':', genSummary);
    return genSummary;
  };

  // Get is_structured flag for current format
  const getIsStructured = (): boolean => {
    // Check direct is_structured - ONLY if format matches
    if (item.content.is_structured !== undefined && item.content.format === currentFormat) {
      return item.content.is_structured;
    }
    // Check nested formats structure
    if (item.content.formats && item.content.formats[currentFormat]) {
      return item.content.formats[currentFormat]?.is_structured || false;
    }
    // Check generated summaries (upload items)
    if (currentFormat === 'short') {
      return generatedSummaries.short_is_structured || false;
    } else if (currentFormat === 'topic') {
      return generatedSummaries.topic_is_structured || false;
    } else if (currentFormat === 'qa') {
      return generatedSummaries.qa_is_structured || false;
    }
    return false;
  };

  // Render summary with markdown, clickable timestamps, and headers
  const renderSummary = (text: string) => {
    // Debug log to check if text is complete
    console.log('[SavedItemModal] Rendering summary:', {
      length: text.length,
      lines: text.split('\n').length,
      endsWithNewline: text.endsWith('\n'),
      lastChars: text.slice(-50)
    });

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    const isStructured = getIsStructured();

    lines.forEach((line, index) => {
      if (!line.trim()) {
        elements.push(<div key={index} style={{ height: '8px' }} />);
        return;
      }

      // Parse line with markdown links for structured formats
      const renderLineWithLinks = (lineText: string) => {
        const linkPattern = /\*\*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        const parts: Array<{ type: 'text' | 'link'; content: string; url?: string; isBold?: boolean }> = [];
        let lastIndex = 0;

        let match;
        while ((match = linkPattern.exec(lineText)) !== null) {
          if (match.index > lastIndex) {
            parts.push({
              type: 'text',
              content: lineText.slice(lastIndex, match.index)
            });
          }

          const content = match[1] !== undefined ? match[1] : match[3];
          const url = match[2] !== undefined ? match[2] : match[4];
          const isBold = match[1] !== undefined;

          parts.push({
            type: 'link',
            content: content,
            url: url,
            isBold
          });

          lastIndex = linkPattern.lastIndex;
        }

        if (lastIndex < lineText.length) {
          parts.push({
            type: 'text',
            content: lineText.slice(lastIndex)
          });
        }

        return parts.map((part, i) => {
          if (part.type === 'link' && part.url) {
            const content = part.isBold ? <strong>{part.content}</strong> : part.content;
            return (
              <span
                key={i}
                style={{
                  color: '#3ea6ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: '2px',
                  padding: '1px 3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(62, 166, 255, 0.1)';
                  e.currentTarget.style.color = '#1a73e8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#3ea6ff';
                }}
                title={`Jump to ${part.content}`}
              >
                {content}
              </span>
            );
          } else {
            const processedContent = part.content.replace(/\*\*(.+?)\*\*/g, (_, text) => text);
            const hasBold = part.content.includes('**');

            if (hasBold) {
              const boldParts = part.content.split(/(\*\*.+?\*\*)/g);
              return (
                <span key={i}>
                  {boldParts.map((bp, bi) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) {
                      return <strong key={bi}>{bp.slice(2, -2)}</strong>;
                    }
                    return bp;
                  })}
                </span>
              );
            }

            return <span key={i}>{processedContent}</span>;
          }
        });
      };

      // For structured formats, render headers and links
      if (isStructured || currentFormat === 'qa') {
        if (line.startsWith('###')) {
          const headingText = line.replace(/^###\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '16px',
                marginTop: index > 0 ? '20px' : '0',
                marginBottom: '10px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else if (line.startsWith('##')) {
          const headingText = line.replace(/^##\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '17px',
                marginTop: index > 0 ? '22px' : '0',
                marginBottom: '12px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else if (line.startsWith('#')) {
          const headingText = line.replace(/^#\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '18px',
                marginTop: index > 0 ? '24px' : '0',
                marginBottom: '14px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else {
          elements.push(
            <div key={index} style={{ marginBottom: '10px', lineHeight: '1.6' }}>
              {renderLineWithLinks(line)}
            </div>
          );
        }
      } else {
        // Non-structured: basic markdown rendering
        if (line.startsWith('###')) {
          const headingText = line.replace(/^###\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '16px',
                marginTop: index > 0 ? '16px' : '0',
                marginBottom: '8px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else if (line.startsWith('##')) {
          const headingText = line.replace(/^##\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '16px',
                marginTop: index > 0 ? '18px' : '0',
                marginBottom: '10px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else if (line.startsWith('#')) {
          const headingText = line.replace(/^#\s*/, '');
          elements.push(
            <div
              key={index}
              style={{
                fontWeight: 700,
                fontSize: '18px',
                marginTop: index > 0 ? '20px' : '0',
                marginBottom: '12px',
                color: '#fff',
              }}
            >
              {headingText}
            </div>
          );
        } else {
          const parts = line.split(/(\*\*.+?\*\*)/g);
          const rendered = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={i} style={{ fontWeight: 700, color: '#fff' }}>
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          elements.push(
            <div key={index} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
              {rendered}
            </div>
          );
        }
      }
    });

    return elements;
  };

  // Generate summary (upload items only)
  const handleGenerateSummary = async (format: SummaryFormat) => {
    if (!isInteractive) return;

    setIsSummaryLoading(true);
    try {
      const transcriptText = getTranscriptText();
      if (!transcriptText) {
        console.error('No transcript available');
        return;
      }

      const response = await generateSummary(
        item.video_id,
        getTranscriptSegments(),
        format,
        item.content.language || 'en'
      );

      if (response.success && response.summary) {
        const structuredKey = `${format}_is_structured`;
        setGeneratedSummaries(prev => ({
          ...prev,
          [format]: response.summary,
          [structuredKey]: response.is_structured,
        } as typeof prev));

        // Save to Supabase
        await saveItem(item.video_id, 'summary', {
          videoTitle: item.video_title || `Video ${item.video_id}`,
          savedAt: new Date().toISOString(),
          format,
          summary: response.summary,
          is_structured: response.is_structured,
        }, 'upload');
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Export as Markdown file
  const exportAsMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export transcript as Markdown
  const exportTranscriptMarkdown = () => {
    const grouped = getGroupedTranscript();
    const markdown = grouped
      .map(segment => `**${segment.timestamp}**\n\n${segment.text}`)
      .join('\n\n---\n\n');

    const filename = `${item.video_title || `Video ${item.video_id}`.slice(0, 50)}_transcript`;
    exportAsMarkdown(markdown, filename);
  };

  // Export summary as Markdown
  const exportSummaryMarkdown = () => {
    const summary = getCurrentSummary();
    if (!summary) return;

    const formatLabel = currentFormat === 'qa' ? 'qa' : currentFormat;
    const filename = `${item.video_title || `Video ${item.video_id}`.slice(0, 50)}_summary_${formatLabel}`;
    exportAsMarkdown(summary, filename);
  };

  if (!isOpen || !item) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: isAnimating ? 'auto' : 'none',
        }}
        onClick={handleClose}
      />

      {/* Slide-out Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#212121',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
          zIndex: 10001,
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#212121',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={item.video_title || `Video ${item.video_id}`}
          >
            {item.video_title || `Video ${item.video_id}`}
          </h2>
          <button
            aria-label="Close"
            onClick={handleClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              marginLeft: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            padding: '0 24px',
            backgroundColor: '#212121',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setActiveTab('transcript')}
            style={{
              padding: '12px 0',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'transcript' ? '3px solid #22c55e' : '3px solid transparent',
              color: activeTab === 'transcript' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: activeTab === 'transcript' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flex: 1,
              minWidth: 0,
            }}
          >
            Transcript
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '12px 0',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'summary' ? '3px solid #22c55e' : '3px solid transparent',
              color: activeTab === 'summary' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: activeTab === 'summary' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flex: 1,
              minWidth: 0,
            }}
          >
            Summary
          </button>

          {/* Chat Tab - Only for upload items */}
          {isInteractive && (
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                padding: '12px 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'chat' ? '3px solid #667eea' : '3px solid transparent',
                color: activeTab === 'chat' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                fontWeight: activeTab === 'chat' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
                minWidth: 0,
              }}
            >
              Chat
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: activeTab === 'transcript' ? 'flex' : 'none',
            flexDirection: 'column',
            backgroundColor: '#212121',
          }}
        >
          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <>
              {/* Transcript Controls */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0,
                flexWrap: 'wrap',
              }}>
                {/* Search Input - Full width on mobile */}
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: window.innerWidth < 500 ? '1 1 100%' : '1',
                    minWidth: window.innerWidth < 500 ? '100%' : '0',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />

                {/* Language Display - Hidden on very small screens */}
                {window.innerWidth >= 400 && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M2 8h12M8 2a8 8 0 0 0 0 12M8 2a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                    <span style={{ fontWeight: 500 }}>{item.content.language || 'EN'}</span>
                  </div>
                )}

                {/* Copy Button */}
                <button
                  onClick={() => copyToClipboard(getTranscriptText(), 'transcript')}
                  style={{
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: copySuccess === 'transcript' ? '#22c55e' : 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    flexShrink: 0,
                  }}
                  title={copySuccess === 'transcript' ? 'Copied!' : 'Copy transcript'}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  {copySuccess === 'transcript' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.5 4.5L6 12L3.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 10V3C2.44772 2.44772 2 2 2 2H10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  )}
                </button>

                {/* Export MD Button */}
                <button
                  onClick={exportTranscriptMarkdown}
                  style={{
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    flexShrink: 0,
                  }}
                  title="Export as Markdown"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1V10M8 1L5 4M8 1L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 10V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H12C12.5304 15 13.0391 14.7893 13.4142 14.4142C13.7893 14.0391 14 13.5304 14 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Transcript Scrollable Content */}
              <div
                ref={transcriptScrollRef}
                style={{
                  flex: 1,
                  overflowY: 'scroll',
                  padding: '16px',
                  paddingBottom: '80px', // Extra bottom padding for mobile scrolling
                  WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                }}
              >
                {(() => {
                  const grouped = getFilteredTranscript();
                  return grouped && grouped.length > 0 ? (
                    <>
                      {grouped.map((segment, index) => {
                        // Highlight search matches
                        const highlightText = (text: string) => {
                          if (!searchQuery) return text;
                          const regex = new RegExp(`(${searchQuery})`, 'gi');
                          return text.replace(regex, '<mark style="background-color: #fef08a; color: #000; padding: 1px 2px; border-radius: 2px;">$1</mark>');
                        };

                        return (
                          <div
                            key={index}
                            style={{
                              marginBottom: '24px',
                              display: 'flex',
                              gap: '12px',
                              alignItems: 'flex-start',
                            }}
                          >
                            <span
                              style={{
                                color: '#3ea6ff',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'default',
                                transition: 'all 0.2s ease',
                                borderRadius: '2px',
                                padding: '1px 3px',
                                flexShrink: 0,
                              }}
                            >
                              {segment.timestamp}
                            </span>
                            <span
                              style={{
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '15px',
                                lineHeight: '1.6',
                              }}
                              dangerouslySetInnerHTML={{ __html: highlightText(segment.text) }}
                            />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.5)',
                      padding: '40px',
                    }}>
                      {searchQuery ? 'No matches found' : 'No transcript available'}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Summary Tab */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: activeTab === 'summary' ? 'flex' : 'none',
            flexDirection: 'column',
            backgroundColor: '#212121',
          }}
        >
          {activeTab === 'summary' && (
            <>
              {/* Summary Controls */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  {/* Format Buttons */}
                  {(['short', 'topic', 'qa'] as SummaryFormat[]).map((format) => {
                    // Check if format is available
                    // For upload items: can generate any format
                    // For extension items: check if format exists in nested formats structure OR direct format match
                    const isFormatAvailable = isInteractive
                      ? true
                      : (item.content.formats?.[format]?.summary) ||
                        (item.content.format === format && item.content.summary);

                    return (
                      <button
                        key={format}
                        onClick={() => setCurrentFormat(format)}
                        disabled={!isFormatAvailable}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          backgroundColor: currentFormat === format ? '#667eea' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${currentFormat === format ? '#667eea' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '6px',
                          color: currentFormat === format ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                          fontSize: '13px',
                          fontWeight: currentFormat === format ? 600 : 400,
                          cursor: isFormatAvailable ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                          opacity: isFormatAvailable ? 1 : 0.5,
                          textTransform: 'capitalize',
                        }}
                      >
                        {format === 'qa' ? 'Q&A' : format === 'topic' ? 'Topics' : 'Short'}
                      </button>
                    );
                  })}

                  <div style={{ width: '8px' }} />

                  {/* Copy Button */}
                  <button
                    onClick={() => {
                      const summary = getCurrentSummary();
                      if (summary) copyToClipboard(summary, 'summary');
                    }}
                    disabled={!getCurrentSummary()}
                    style={{
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: copySuccess === 'summary' ? '#22c55e' : 'rgba(255, 255, 255, 0.7)',
                      cursor: getCurrentSummary() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      opacity: getCurrentSummary() ? 1 : 0.5,
                    }}
                    title={copySuccess === 'summary' ? 'Copied!' : 'Copy summary'}
                    onMouseEnter={(e) => {
                      if (getCurrentSummary()) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    {copySuccess === 'summary' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5L6 12L3.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M3 10V3C2.44772 2.44772 2 2 2 2H10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                    )}
                  </button>

                  {/* Export MD Button */}
                  <button
                    onClick={exportSummaryMarkdown}
                    disabled={!getCurrentSummary()}
                    style={{
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      cursor: getCurrentSummary() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      opacity: getCurrentSummary() ? 1 : 0.5,
                    }}
                    title="Export as Markdown"
                    onMouseEnter={(e) => {
                      if (getCurrentSummary()) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1V10M8 1L5 4M8 1L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 10V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H12C12.5304 15 13.0391 14.7893 13.4142 14.4142C13.7893 14.0391 14 13.5304 14 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Summary Scrollable Content */}
              <div style={{
                flex: 1,
                overflowY: 'scroll',
                padding: '16px',
                paddingBottom: '80px', // Extra bottom padding for mobile scrolling
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              }}>
                {/* Generate button (upload items only) - Full width like extension */}
                {isInteractive && !generatedSummaries[currentFormat] && !isSummaryLoading && (
                  <button
                    onClick={() => handleGenerateSummary(currentFormat)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    ✨ Generate Summary
                  </button>
                )}

                {/* Loading state */}
                {isSummaryLoading && (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 16px',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.5) 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    Generating summary...
                  </button>
                )}

                {/* Summary Content */}
                {getCurrentSummary() && !isSummaryLoading && (
                  <>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '16px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '14px',
                    }}>
                      {renderSummary(getCurrentSummary()!)}
                    </div>
                    {/* Debug info - shows if summary appears incomplete */}
                    {(() => {
                      const summary = getCurrentSummary()!;
                      const lastLine = summary.trim().split('\n').pop() || '';
                      const endsWithHeader = lastLine.match(/^#{1,3}\s/);
                      const seemsIncomplete = endsWithHeader || (!lastLine && summary.length > 100);

                      if (seemsIncomplete) {
                        return (
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            backgroundColor: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'rgba(251, 191, 36, 0.9)',
                          }}>
                            ⚠️ This summary may be incomplete. The AI generation might have been cut off.
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}

                {/* Empty state */}
                {!getCurrentSummary() && !isSummaryLoading && !isInteractive && (
                  <div style={{
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.5)',
                    padding: '40px',
                  }}>
                    No summary available.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Chat Tab - Only for upload items */}
        {isInteractive && (
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              display: activeTab === 'chat' ? 'flex' : 'none',
              flexDirection: 'column',
              backgroundColor: '#212121',
            }}
          >
            {activeTab === 'chat' && (
              <>
                {/* Messages Area */}
                <div
                  ref={chatScrollRef}
                  style={{
                    flex: 1,
                    overflowY: 'scroll',
                    padding: '16px',
                    paddingBottom: '80px', // Extra bottom padding for mobile scrolling
                    WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                  }}
                >
                  {/* Empty State */}
                  {chatMessages.length === 0 && !isLoadingChat && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'rgba(255, 255, 255, 0.6)',
                        padding: '32px 16px',
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                        Ask questions about the video
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                        Get AI-powered answers based on the transcript
                      </div>

                      {/* Loading State for Questions */}
                      {questionsLoading && (
                        <div style={{ marginTop: '24px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          Loading suggestions...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Messages */}
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background:
                            message.role === 'user'
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                          border:
                            message.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          wordWrap: 'break-word',
                        }}
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(message.content)
                        }}
                      />
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isLoadingChat && (
                    <div
                      style={{
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span>Thinking</span>
                          <span className="dots">...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div
                  style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {/* Suggested Question Pills - Only show when no messages and questions available */}
                  {chatMessages.length === 0 && !isLoadingChat && suggestedQuestions.length > 0 && (
                    <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            handleSendChatMessage(question);
                          }}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: 'rgba(102, 126, 234, 0.15)',
                            border: '1px solid rgba(102, 126, 234, 0.3)',
                            borderRadius: '20px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '12.5px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.25)';
                            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                          }}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder="Ask a question about the video..."
                      disabled={isLoadingChat}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '13px',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        minHeight: '44px',
                        maxHeight: '120px',
                      }}
                      rows={1}
                    />
                    <button
                      onClick={() => handleSendChatMessage()}
                      disabled={!chatInput.trim() || isLoadingChat}
                      style={{
                        padding: '10px 20px',
                        background:
                          !chatInput.trim() || isLoadingChat
                            ? 'rgba(102, 126, 234, 0.3)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: !chatInput.trim() || isLoadingChat ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: !chatInput.trim() || isLoadingChat ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.25)',
                      }}
                    >
                      Send
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
