/**
 * Summary Tab Component
 * Displays AI-generated summary with configuration options and share menu
 */

import React, { useState } from 'react';
import jsPDF from 'jspdf';

export type SummaryFormat = 'short' | 'topic' | 'qa';

interface SummaryTabProps {
  summary?: string;
  isLoading?: boolean;
  onGenerateSummary?: (format: SummaryFormat) => void;
  currentFormat?: SummaryFormat;
  onFormatChange?: (format: SummaryFormat) => void;
  summaries?: { short?: string; topic?: string; qa?: string; short_is_structured?: boolean; topic_is_structured?: boolean; qa_is_structured?: boolean };
  videoTitle?: string;
  videoId?: string;  // NEW: Video ID for timestamp seeking
}

export function SummaryTab({
  summary,
  isLoading = false,
  onGenerateSummary,
  currentFormat = 'short',
  onFormatChange,
  summaries = {},
  videoTitle = '',
  videoId = '',  // NEW: Video ID for timestamp seeking
}: SummaryTabProps): React.JSX.Element {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Get the per-format is_structured flag based on currentFormat
  const isStructured = currentFormat === 'short'
    ? summaries.short_is_structured || false
    : currentFormat === 'topic'
      ? summaries.topic_is_structured || false
      : summaries.qa_is_structured || false;

  // DEBUG: Log runtime values to trace why headers aren't rendering
  console.log('[SummaryTab Debug] Runtime values:', {
    currentFormat,
    short_is_structured: summaries.short_is_structured,
    topic_is_structured: summaries.topic_is_structured,
    qa_is_structured: summaries.qa_is_structured,
    computed_isStructured: isStructured,
    summaries_object: summaries
  });

  // YouTube video seeking function - same as TranscriptTab
  const seekToTimestamp = (videoId: string, seconds: number) => {
    const videoElement = document.querySelector(
      '#movie_player video, .html5-main-video'
    ) as HTMLVideoElement;

    if (videoElement && videoElement.currentTime !== undefined) {
      videoElement.currentTime = seconds;
      videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.warn('[SummaryTab] YouTube video element not found for videoId:', videoId);
    }
  };

  const handleGenerate = () => {
    if (onGenerateSummary) {
      onGenerateSummary(currentFormat);
    }
  };

  const handleFormatChange = (newFormat: SummaryFormat) => {
    if (onFormatChange) {
      onFormatChange(newFormat);
    }
  };

  // Helper function to remove timestamp links from summary
  const removeTimestamps = (text: string): string => {
    let cleaned = text;

    // First remove the markdown timestamp links
    cleaned = cleaned.replace(/\s?\[[^\]]+\]\(https:\/\/www\.youtube\.com\/watch\?v=[^&]+&t=[^)]+\)/g, '');

    // Then clean up any multiple spaces left behind (but preserve newlines)
    cleaned = cleaned.replace(/[ \t]+(?=[.,;:!?])/g, ' ');

    // Finally, clean up any double spaces while preserving line breaks
    cleaned = cleaned.replace(/ {2,}/g, ' ').replace(/ \n/g, '\n');

    return cleaned;
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(removeTimestamps(summary));
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 1000);
    }
  };

  const formatFilename = (title: string, extension: string): string => {
    // Convert title to lowercase with underscores
    const formatted = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    return formatted ? `${formatted}.${extension}` : `summary.${extension}`;
  };

  const handleShare = (action: string) => {
    if (!summary) return;

    setShowShareMenu(false);

    switch (action) {
      case 'export-text':
        // Export as plain text without timestamps
        downloadFile(removeTimestamps(summary), formatFilename(videoTitle, 'txt'), 'text/plain');
        break;

      case 'export-pdf':
        // Export as PDF without timestamps
        exportAsPDF(removeTimestamps(summary), formatFilename(videoTitle, 'pdf'));
        break;

      case 'export-markdown':
        // Export as Markdown without timestamps
        downloadFile(removeTimestamps(summary), formatFilename(videoTitle, 'md'), 'text/markdown');
        break;
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = (content: string, filename: string) => {
    // Create PDF using jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set font
    doc.setFont('helvetica');

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number, isBold: boolean = false, isHeading: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');

      const lines = doc.splitTextToSize(text, maxWidth);

      // Check if we need a new page
      if (yPosition + (lines.length * fontSize * 0.35) > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Add spacing before headings
      if (isHeading && yPosition > margin) {
        yPosition += 8;
      }

      lines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += fontSize * 0.35; // Line height
      });

      // Add spacing after paragraphs
      yPosition += isHeading ? 4 : 6;
    };

    // Add title if available
    if (videoTitle) {
      addText(videoTitle, 16, true, true);
      yPosition += 4;
    }

    // Process content line by line
    const lines = content.split('\n');

    lines.forEach((line) => {
      if (!line.trim()) {
        yPosition += 4; // Empty line spacing
        return;
      }

      if (line.startsWith('###')) {
        // H3 heading
        const text = line.replace(/^###\s*/, '');
        addText(text, 14, true, true);
      } else if (line.startsWith('##')) {
        // H2 heading
        const text = line.replace(/^##\s*/, '');
        addText(text, 16, true, true);
      } else if (line.startsWith('#')) {
        // H1 heading
        const text = line.replace(/^#\s*/, '');
        addText(text, 18, true, true);
      } else {
        // Regular text - handle inline bold markers
        const text = line.replace(/\*\*(.+?)\*\*/g, '$1');
        addText(text, 11, false, false);
      }
    });

    // Save the PDF
    doc.save(filename);
  };

  // Simple markdown renderer for summary text with clickable timestamps
  const renderSummary = (text: string) => {
    // Split by lines
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];


    lines.forEach((line, index) => {
      if (!line.trim()) {
        // Empty line - add spacing
        elements.push(<div key={index} style={{ height: '4px' }} />);
        return;
      }

      // Check if line contains a clickable timestamp link (process ALL structured format lines)
      if (isStructured || currentFormat === 'qa') {
        // For structured format, always try to parse for links (QA, short, topic)
        // The renderLineWithLinks function will handle both links and plain text
        // Parse line with markdown link
        const renderLineWithLinks = (lineText: string) => {
          // Pattern: [text](url) with optional ** around it
          const linkPattern = /\*\*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

          const parts: Array<{ type: 'text' | 'link'; content: string; url?: string; isBold?: boolean }> = [];
          let lastIndex = 0;

          let match;
          while ((match = linkPattern.exec(lineText)) !== null) {
            // Add text before link
            if (match.index > lastIndex) {
              parts.push({
                type: 'text',
                content: lineText.slice(lastIndex, match.index)
              });
            }

            // Determine which capture groups matched
            // Case 1: **[text](url)** - match[1] & match[2]
            // Case 2: [text](url) - match[3] & match[4]
            const content = match[1] !== undefined ? match[1] : match[3];
            const url = match[2] !== undefined ? match[2] : match[4];
            const isBold = match[1] !== undefined;

            // Add link
            parts.push({
              type: 'link',
              content: content,
              url: url,
              isBold
            });

            lastIndex = linkPattern.lastIndex;
          }

          // Add remaining text
          if (lastIndex < lineText.length) {
            parts.push({
              type: 'text',
              content: lineText.slice(lastIndex)
            });
          }

          return parts.map((part, i) => {
            if (part.type === 'link' && part.url) {
              // Extract video ID and timestamp from URL
              try {
                const url = new URL(part.url);
                const extractedVideoId = url.searchParams.get('v');
                const timestamp = url.searchParams.get('t');

                const content = part.isBold ? <strong>{part.content}</strong> : part.content;

                return (
                  <span
                    key={i}
                    className="mintclip-summary-timestamp"
                    onClick={() => {
                      // Extract seconds from timestamp parameter
                      if (timestamp && extractedVideoId) {
                        const seconds = parseInt(timestamp, 10);
                        seekToTimestamp(extractedVideoId, seconds);
                      }
                    }}
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
              } catch (e) {
                // Invalid URL, render as plain text
                return <span key={i}>{part.content}</span>;
              }
            } else {
              // Handle bold markers in plain text
              const processedContent = part.content.replace(/\*\*(.+?)\*\*/g, (_, text) => text);
              const hasBold = part.content.includes('**');

              if (hasBold) {
                // Split and render with bold
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

        // For structured format, check for headers first, then use link-rendering
        if (line.startsWith('###')) {
          // H3 heading
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
          // H2 heading
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
          // H1 heading
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
          // Regular content with links and timestamps
          elements.push(
            <div key={index} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
              {renderLineWithLinks(line)}
            </div>
          );
        }
      } else {
        // Non-structured format: fallback to original markdown rendering
        if (line.startsWith('###')) {
          // H3 heading
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
          // H2 heading
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
          // H1 heading
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
          // Regular text - handle inline bold markers
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
  // Show button if: loading OR (current format not generated yet)
  const showGenerateButton = isLoading || !summaries[currentFormat];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        backgroundColor: '#212121',
      }}
    >
      {/* Configuration Controls */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Format Selector with Action Buttons */}
        <div style={{ marginBottom: showGenerateButton ? '12px' : '0' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handleFormatChange('short')}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: currentFormat === 'short' ? '#667eea' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${currentFormat === 'short' ? '#667eea' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: currentFormat === 'short' ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: currentFormat === 'short' ? 600 : 400,
              }}
            >
              Short
            </button>
            <button
              onClick={() => handleFormatChange('topic')}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: currentFormat === 'topic' ? '#667eea' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${currentFormat === 'topic' ? '#667eea' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: currentFormat === 'topic' ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: currentFormat === 'topic' ? 600 : 400,
              }}
            >
              Topics
            </button>
            <button
              onClick={() => handleFormatChange('qa')}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: currentFormat === 'qa' ? '#667eea' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${currentFormat === 'qa' ? '#667eea' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: currentFormat === 'qa' ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: currentFormat === 'qa' ? 600 : 400,
              }}
            >
              Q&A
            </button>

            {/* Copy and Export buttons - only show when summary exists */}
            {summary && !isLoading && (
              <>
                <div style={{ width: '8px' }} /> {/* Spacer */}
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: showCopyFeedback
                      ? '1px solid #667eea'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border 0.2s',
                    boxShadow: showCopyFeedback ? '0 0 0 0.5px #667eea' : 'none',
                    width: '36px',
                    height: '36px',
                    flexShrink: 0,
                  }}
                  title="Copy summary"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M3 10V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: showShareMenu
                        ? '1px solid #667eea'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border 0.2s',
                      boxShadow: showShareMenu ? '0 0 0 0.5px #667eea' : 'none',
                      width: '36px',
                      height: '36px',
                      flexShrink: 0,
                    }}
                    title="Export summary"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1V10M8 1L5 4M8 1L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 10V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H12C12.5304 15 13.0391 14.7893 13.4142 14.4142C13.7893 14.0391 14 13.5304 14 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {showShareMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#2a2a2a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '8px',
                        minWidth: '160px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 1000,
                      }}
                    >
                      <button
                        onClick={() => handleShare('export-text')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Export as Text
                      </button>
                      <button
                        onClick={() => handleShare('export-pdf')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleShare('export-markdown')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Export as Markdown
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Generate Button - Only show when needed */}
        {showGenerateButton && (
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 16px',
              background: isLoading ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? '⏳ Generating...' : '✨ Generate Summary'}
          </button>
        )}
      </div>

      {/* Summary Content */}
      <div
        className="summary-scrollable"
        style={{
          flex: 1,
          overflowY: 'scroll',
          padding: '16px',
        }}
      >
        {/* Empty State - Removed per user request */}

        {/* Summary Display */}
        {summary && !isLoading && (
          <div>
            {/* Summary Text */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '16px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
              }}
            >
              {renderSummary(summary)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
