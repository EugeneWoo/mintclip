/**
 * Content Script
 * Injects UI into YouTube pages
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { isYouTubePage, watchYouTubeNavigation } from './utils/youtubeDetector';
import { YouTubeSidebar } from './components/YouTubeSidebar';

console.log('YT Coach content script loaded');

let sidebarContainer: HTMLElement | null = null;
let reactRoot: Root | null = null;

/**
 * Get current video ID from URL
 */
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Initialize extension UI on YouTube pages
 */
function initExtensionUI(): void {
  if (!isYouTubePage()) {
    cleanupExtensionUI();
    return;
  }

  const videoId = getVideoId();
  if (!videoId) {
    console.log('[YT Coach] No video ID found, skipping UI injection');
    cleanupExtensionUI();
    return;
  }

  // Don't re-initialize if already exists
  if (sidebarContainer) {
    return;
  }

  console.log('[YT Coach] Injecting UI for video:', videoId);

  // Find YouTube's secondary column (sidebar)
  const secondary = document.querySelector('#secondary');
  if (!secondary) {
    console.log('[YT Coach] Secondary column not found, retrying...');
    setTimeout(initExtensionUI, 500);
    return;
  }

  // Create container with Shadow DOM for style isolation
  const container = document.createElement('div');
  container.id = 'yt-coach-sidebar';

  // Attach shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Add base styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Prevent YouTube styles from leaking in */
    :host {
      all: initial;
      display: block;
      margin-bottom: 12px;
      align-self: start;
    }

    /* Scrollbar styles - more specific selectors */
    div.transcript-scrollable::-webkit-scrollbar,
    div.summary-scrollable::-webkit-scrollbar,
    div.chat-scrollable::-webkit-scrollbar {
      width: 14px !important;
      height: 14px !important;
    }

    div.transcript-scrollable::-webkit-scrollbar-track,
    div.summary-scrollable::-webkit-scrollbar-track,
    div.chat-scrollable::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.08) !important;
      border-radius: 7px !important;
    }

    div.transcript-scrollable::-webkit-scrollbar-thumb,
    div.summary-scrollable::-webkit-scrollbar-thumb,
    div.chat-scrollable::-webkit-scrollbar-thumb {
      background: rgba(102, 126, 234, 0.6) !important;
      border-radius: 7px !important;
      border: 3px solid rgba(0, 0, 0, 0.1) !important;
    }

    div.transcript-scrollable::-webkit-scrollbar-thumb:hover,
    div.summary-scrollable::-webkit-scrollbar-thumb:hover,
    div.chat-scrollable::-webkit-scrollbar-thumb:hover {
      background: rgba(102, 126, 234, 0.8) !important;
    }

    div.transcript-scrollable,
    div.summary-scrollable,
    div.chat-scrollable {
      overflow-y: scroll !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(102, 126, 234, 0.6) rgba(255, 255, 255, 0.08) !important;
    }

    /* Make scrollbar always visible even with no content */
    div.transcript-scrollable::-webkit-scrollbar-track,
    div.summary-scrollable::-webkit-scrollbar-track,
    div.chat-scrollable::-webkit-scrollbar-track {
      display: block !important;
    }

    /* Animated dots for "Thinking" indicator */
    @keyframes dotPulse {
      0%, 20% {
        opacity: 0.2;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.2;
      }
    }

    .dots {
      display: inline-block;
      animation: dotPulse 1.4s ease-in-out infinite;
    }
  `;
  shadowRoot.appendChild(style);

  // Create React root container
  const reactContainer = document.createElement('div');
  reactContainer.id = 'yt-coach-root';
  shadowRoot.appendChild(reactContainer);

  // Insert at the top of the secondary column
  secondary.insertBefore(container, secondary.firstChild);

  sidebarContainer = container;
  reactRoot = createRoot(reactContainer);
  reactRoot.render(<YouTubeSidebar videoId={videoId} />);

  console.log('[YT Coach] UI injected successfully');
}

/**
 * Cleanup extension UI
 */
function cleanupExtensionUI(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (sidebarContainer) {
    sidebarContainer.remove();
    sidebarContainer = null;
  }
}

// Watch for YouTube SPA navigation
watchYouTubeNavigation(() => {
  cleanupExtensionUI();
  if (isYouTubePage()) {
    // Small delay to ensure DOM is ready
    setTimeout(initExtensionUI, 100);
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtensionUI);
} else {
  initExtensionUI();
}
