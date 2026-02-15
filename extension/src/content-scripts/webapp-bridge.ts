/**
 * Webapp Bridge - Content Script
 * Injected into mintclip webapp to enable communication between extension and webapp
 *
 * This script acts as a bridge, allowing the webapp to request auth tokens from the extension
 */

// Valid origins for security
const VALID_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://mintclip.app', // Production domain
  'https://*.mintclip.app' // Subdomains
];

function isValidOrigin(origin: string): boolean {
  return VALID_ORIGINS.some(valid => {
    if (valid.includes('*')) {
      const pattern = valid.replace('*', '([^.]+)');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return origin === valid;
  });
}

// Listen for messages from the webapp page
window.addEventListener('message', async (event) => {
  // Validate origin for security
  if (!isValidOrigin(event.origin)) {
    console.warn('[WebappBridge] Invalid origin:', event.origin);
    return;
  }

  const { type, data } = event.data;

  switch (type) {
    case 'MINTCLIP_REQUEST_AUTH_TOKEN':
      // Forward request to extension background
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_WEBAPP_AUTH_TOKEN',
        });

        // Send response back to webapp
        window.postMessage({
          type: 'MINTCLIP_AUTH_TOKEN_RESPONSE',
          data: response,
        }, event.origin);
      } catch (error) {
        console.error('[WebappBridge] Error getting auth token:', error);
        window.postMessage({
          type: 'MINTCLIP_AUTH_TOKEN_RESPONSE',
          data: {
            success: false,
            error: 'Failed to communicate with extension',
          },
        }, event.origin);
      }
      break;

    case 'MINTCLIP_CHECK_EXTENSION':
      // Webapp checking if extension is available
      window.postMessage({
        type: 'MINTCLIP_EXTENSION_AVAILABLE',
        data: { available: true },
      }, event.origin);
      break;

    default:
      // Ignore unknown message types
      break;
  }
});

// Listen for messages from extension background (for item saved notifications)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ITEM_SAVED_NOTIFICATION') {
    // Forward the notification to the webapp page
    window.postMessage({
      type: 'MINTCLIP_ITEM_SAVED',
      data: message.data,
    }, window.location.origin);
  }
});

// Notify page that bridge is ready
window.postMessage({
  type: 'MINTCLIP_BRIDGE_READY',
}, window.location.origin);

console.log('[WebappBridge] Mintclip extension bridge loaded');
