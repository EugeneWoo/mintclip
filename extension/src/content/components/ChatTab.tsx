/**
 * Chat Tab Component
 * Interactive chat interface for asking questions about video content
 */

import React, { useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

/**
 * Convert markdown to HTML for message display
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

interface ChatTabProps {
  messages?: ChatMessage[];
  isLoading?: boolean;
  onSendMessage?: (message: string) => void;
  suggestedQuestions?: string[];
  questionsLoading?: boolean;
  onFetchSuggestedQuestions?: () => void;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

export function ChatTab({
  messages = [],
  isLoading = false,
  onSendMessage,
  suggestedQuestions = [],
  questionsLoading = false,
  onFetchSuggestedQuestions,
  inputValue = '',
  onInputChange,
}: ChatTabProps): React.JSX.Element {
  const [localInputValue, setLocalInputValue] = useState('');
  const [clickedPillIndex, setClickedPillIndex] = useState<number | null>(null);

  // Use parent state if provided, otherwise use local state
  const currentInputValue = onInputChange ? inputValue : localInputValue;
  const setCurrentInputValue = onInputChange || setLocalInputValue;

  // Auto-fetch suggested questions when Chat tab opens with no messages
  React.useEffect(() => {
    if (messages.length === 0 && suggestedQuestions.length === 0 && !questionsLoading && onFetchSuggestedQuestions) {
      onFetchSuggestedQuestions();
    }
  }, [messages.length, suggestedQuestions.length, questionsLoading, onFetchSuggestedQuestions]);

  const handleSend = () => {
    if (currentInputValue.trim() && onSendMessage && !isLoading) {
      onSendMessage(currentInputValue.trim());
      setCurrentInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
      {/* Messages Area */}
      <div
        className="chat-scrollable"
        style={{
          flex: 1,
          overflowY: 'scroll',
          padding: '16px',
        }}
      >
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
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
        {messages.map((message) => (
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
        {isLoading && (
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
        {messages.length === 0 && !isLoading && suggestedQuestions.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setClickedPillIndex(index);
                  setTimeout(() => setClickedPillIndex(null), 200); // Reset after animation
                  if (onSendMessage) {
                    onSendMessage(question);
                  }
                }}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'rgba(102, 126, 234, 0.15)',
                  border: clickedPillIndex === index
                    ? '1px solid #667eea'
                    : '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '20px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: clickedPillIndex === index ? '0 0 0 0.5px #667eea' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (clickedPillIndex !== index) {
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (clickedPillIndex !== index) {
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                  }
                }}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={currentInputValue}
            onChange={(e) => setCurrentInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={(e) => {
              // Prevent YouTube keyboard shortcuts from triggering
              e.stopPropagation();
            }}
            onKeyUp={(e) => {
              // Prevent YouTube keyboard shortcuts from triggering
              e.stopPropagation();
            }}
            placeholder="Ask a question about the video..."
            disabled={isLoading}
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
            onClick={handleSend}
            disabled={!currentInputValue.trim() || isLoading}
            style={{
              padding: '10px 20px',
              background:
                !currentInputValue.trim() || isLoading
                  ? 'rgba(102, 126, 234, 0.3)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: !currentInputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: !currentInputValue.trim() || isLoading ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.25)',
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
    </div>
  );
}
