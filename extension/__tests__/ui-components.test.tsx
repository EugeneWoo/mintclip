/**
 * UI Component Tests
 * Tests for TabNavigation, TranscriptTab, SummaryTab, ChatTab, and LoadingSpinner/ErrorToast
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabNavigation } from '../src/content/components/TabNavigation';
import { TranscriptTab } from '../src/content/components/TranscriptTab';
import { SummaryTab } from '../src/content/components/SummaryTab';
import { ChatTab } from '../src/content/components/ChatTab';
import { LoadingSpinner } from '../src/content/components/LoadingSpinner';
import { ErrorToast } from '../src/content/components/ErrorToast';

// Mock chrome.runtime.sendMessage
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
  },
} as any;

describe('TabNavigation Component', () => {
  test('renders all three tabs', () => {
    const mockOnTabChange = jest.fn();

    render(
      <TabNavigation activeTab="transcript" onTabChange={mockOnTabChange} />
    );

    expect(screen.getByText('Transcript')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  test('highlights active tab', () => {
    const mockOnTabChange = jest.fn();

    const { container } = render(
      <TabNavigation activeTab="summary" onTabChange={mockOnTabChange} />
    );

    const summaryButton = screen.getByText('Summary').closest('button');
    const transcriptButton = screen.getByText('Transcript').closest('button');

    // Active tab should have different styling (fontWeight and color)
    expect(summaryButton).toHaveStyle({ fontWeight: 600, color: '#fff' });
    expect(transcriptButton).toHaveStyle({ fontWeight: 400, color: 'rgba(255, 255, 255, 0.5)' });
  });

  test('switches tabs on click', () => {
    const mockOnTabChange = jest.fn();

    render(
      <TabNavigation activeTab="transcript" onTabChange={mockOnTabChange} />
    );

    const summaryButton = screen.getByText('Summary');
    fireEvent.click(summaryButton);

    expect(mockOnTabChange).toHaveBeenCalledWith('summary');
  });
});

describe('TranscriptTab Component', () => {
  const mockTranscript = [
    { timestamp: '00:00', start_seconds: 0, text: 'Hello world' },
    { timestamp: '00:10', start_seconds: 10, text: 'This is a test transcript' },
    { timestamp: '00:25', start_seconds: 25, text: 'With multiple lines' },
  ];

  test('renders transcript with timestamps', () => {
    render(<TranscriptTab transcript={mockTranscript} isLoading={false} />);

    // Transcript is grouped into 5-second intervals, so text is combined
    // 0-4s: "Hello world This is a test transcript"
    // 25-29s: "With multiple lines"
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
    expect(screen.getByText(/This is a test transcript/)).toBeInTheDocument();
    expect(screen.getByText(/With multiple lines/)).toBeInTheDocument();

    // Check for grouped timestamps (00:00, 00:10, 00:25)
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('00:10')).toBeInTheDocument();
    expect(screen.getByText('00:25')).toBeInTheDocument();
  });

  test('renders copy button', () => {
    render(<TranscriptTab transcript={mockTranscript} isLoading={false} />);

    const copyButton = screen.getByText(/copy/i);
    expect(copyButton).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<TranscriptTab transcript={[]} isLoading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows empty state when no transcript', () => {
    render(<TranscriptTab transcript={undefined} isLoading={false} />);

    expect(screen.getByText(/no transcript loaded/i)).toBeInTheDocument();
  });
});

describe('SummaryTab Component', () => {
  const mockSummary = 'This is a test summary of the video content.';

  test('renders summary content', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    expect(screen.getByText(mockSummary)).toBeInTheDocument();
  });

  test('renders format selector (Q&A / Listicle)', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    expect(screen.getByText('Q&A')).toBeInTheDocument();
    expect(screen.getByText('Listicle')).toBeInTheDocument();
  });

  test('renders detail level selector (Short / Detailed)', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();
  });

  test('renders focus options (Insightful / Actionable / Funny)', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    expect(screen.getByText(/💡.*Insightful/)).toBeInTheDocument();
    expect(screen.getByText(/🎯.*Actionable/)).toBeInTheDocument();
    expect(screen.getByText(/😄.*Funny/)).toBeInTheDocument();
  });

  test('renders share button with dropdown menu', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    const shareButton = screen.getByText(/share/i);
    expect(shareButton).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(shareButton);

    // Check for dropdown options
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
    expect(screen.getByText('Copy Text')).toBeInTheDocument();
    expect(screen.getByText('Export as Text')).toBeInTheDocument();
    expect(screen.getByText('Export as Doc')).toBeInTheDocument();
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    expect(screen.getByText('Export as Markdown')).toBeInTheDocument();
  });

  test('renders copy button', () => {
    render(<SummaryTab summary={mockSummary} isLoading={false} />);

    const copyButton = screen.getAllByText(/copy/i)[0]; // First "Copy" button
    expect(copyButton).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<SummaryTab summary="" isLoading={true} />);

    expect(screen.getByText(/⏳.*Generating/i)).toBeInTheDocument();
  });
});

describe('ChatTab Component', () => {
  const mockMessages = [
    { id: '1', role: 'user' as const, content: 'What is this video about?' },
    { id: '2', role: 'assistant' as const, content: 'This video discusses...' },
  ];

  test('renders chat messages', () => {
    render(<ChatTab messages={mockMessages} isLoading={false} onSendMessage={jest.fn()} />);

    expect(screen.getByText('What is this video about?')).toBeInTheDocument();
    expect(screen.getByText('This video discusses...')).toBeInTheDocument();
  });

  test('renders message input field', () => {
    render(<ChatTab messages={[]} isLoading={false} onSendMessage={jest.fn()} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    expect(input).toBeInTheDocument();
  });

  test('renders send button', () => {
    render(<ChatTab messages={[]} isLoading={false} onSendMessage={jest.fn()} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeInTheDocument();
  });

  test('calls onSendMessage when send button clicked', () => {
    const mockSendMessage = jest.fn();

    render(<ChatTab messages={[]} isLoading={false} onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('Test message');
  });

  test('shows empty state when no messages', () => {
    render(<ChatTab messages={[]} isLoading={false} onSendMessage={jest.fn()} />);

    expect(screen.getByText(/ask questions about the video/i)).toBeInTheDocument();
  });
});

describe('LoadingSpinner Component', () => {
  test('displays loading spinner', () => {
    const { container } = render(<LoadingSpinner />);

    expect(container.querySelector('[data-testid="loading-spinner"]') || container.firstChild).toBeInTheDocument();
  });
});

describe('ErrorToast Component', () => {
  test('displays error message', () => {
    const mockOnClose = jest.fn();

    render(<ErrorToast message="Test error message" onClose={mockOnClose} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('calls onClose when close button clicked', () => {
    const mockOnClose = jest.fn();

    render(<ErrorToast message="Test error" onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('auto-dismisses after duration', async () => {
    const mockOnClose = jest.fn();

    render(<ErrorToast message="Test error" onClose={mockOnClose} duration={1000} />);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 1500 });
  });
});
