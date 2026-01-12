/**
 * Background Service Worker
 * Handles API communication, state management, and message passing
 */

import { handleMessage } from './messageHandler';
import { getAuthState } from './storage';
import { initializeAuth } from './auth';
import type { ExtensionMessage } from './messageHandler';

console.log('YT Coach background service worker loaded');

// Helper function to update icon for a tab
function updateIconForTab(tabId: number, url?: string): void {
  const isYouTube = url?.includes('youtube.com');
  console.log(`[YT Coach] Updating icon for tab ${tabId}, URL: ${url}, isYouTube: ${isYouTube}`);

  chrome.action.setIcon({
    tabId,
    path: {
      '16': isYouTube ? '/icon-16.png' : '/icon-grey-16.png',
      '48': isYouTube ? '/icon-48.png' : '/icon-grey-48.png',
      '128': isYouTube ? '/icon-128.png' : '/icon-grey-128.png',
    },
  }).then(() => {
    console.log(`[YT Coach] Icon updated successfully for tab ${tabId}`);

    // Add badge for YouTube pages
    if (isYouTube) {
      chrome.action.setBadgeText({ tabId, text: '' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#667eea' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }).catch((error) => {
    console.error(`[YT Coach] Failed to update icon for tab ${tabId}:`, error);
  });
}

// Initialize icons for all tabs when extension loads
async function initializeIcons(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    if (tab.id) {
      updateIconForTab(tab.id, tab.url);
    }
  });
}

// Service worker setup
chrome.runtime.onInstalled.addListener(() => {
  console.log('YT Coach extension installed');
  initializeAuth();
  initializeIcons();
});

// Also initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('YT Coach extension starting up');
  initializeAuth();
  initializeIcons();
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async response
  }
);

// Update icon color based on whether on YouTube
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateIconForTab(tabId, tab.url);
  }
});

// Also update icon when switching tabs
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  updateIconForTab(tabId, tab.url);
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  const authState = await getAuthState();
  
  if (!authState.isAuthenticated) {
    // Open popup for sign up
    chrome.action.setPopup({ popup: 'popup.html' });
  } else {
    // Open settings or toggle extension UI
    // TODO: Implement settings page
    console.log('User authenticated, open settings');
  }
});

