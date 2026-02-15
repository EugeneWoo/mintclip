/**
 * YouTube Page Detection Utilities
 */

export interface YouTubePageInfo {
  isYouTubePage: boolean;
  pageType: 'watch' | 'shorts' | 'channel' | 'unknown';
  videoId?: string;
  channelId?: string;
}

/**
 * Check if current page is a YouTube page
 */
export function isYouTubePage(url: string = window.location.href): boolean {
  const patterns = [
    /youtube\.com\/watch/,
    /youtube\.com\/shorts\//,
    /youtube\.com\/@/,
    /youtube\.com\/channel\//,
  ];
  
  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Get YouTube page information
 */
export function getYouTubePageInfo(): YouTubePageInfo {
  const url = window.location.href;
  
  if (!isYouTubePage(url)) {
    return { isYouTubePage: false, pageType: 'unknown' };
  }

  if (/youtube\.com\/watch/.test(url)) {
    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
    return {
      isYouTubePage: true,
      pageType: 'watch',
      videoId: videoIdMatch?.[1],
    };
  }

  if (/youtube\.com\/shorts\//.test(url)) {
    const videoIdMatch = url.match(/\/shorts\/([^/?]+)/);
    return {
      isYouTubePage: true,
      pageType: 'shorts',
      videoId: videoIdMatch?.[1],
    };
  }

  if (/youtube\.com\/@/.test(url)) {
    const channelMatch = url.match(/youtube\.com\/@([^/?]+)/);
    return {
      isYouTubePage: true,
      pageType: 'channel',
      channelId: channelMatch?.[1],
    };
  }

  if (/youtube\.com\/channel\//.test(url)) {
    const channelMatch = url.match(/\/channel\/([^/?]+)/);
    return {
      isYouTubePage: true,
      pageType: 'channel',
      channelId: channelMatch?.[1],
    };
  }

  return { isYouTubePage: true, pageType: 'unknown' };
}

/**
 * Watch for YouTube SPA navigation changes
 */
export function watchYouTubeNavigation(
  callback: (url: string) => void
): () => void {
  let lastUrl = location.href;

  // Handler for URL changes
  const handleUrlChange = () => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      callback(url);
    }
  };

  // 1. Listen to YouTube's native navigation event (most reliable)
  document.addEventListener('yt-navigate-finish', handleUrlChange);

  // 2. Intercept History API (fallback for edge cases)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  // 3. Listen to popstate (browser back/forward)
  window.addEventListener('popstate', handleUrlChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('yt-navigate-finish', handleUrlChange);
    window.removeEventListener('popstate', handleUrlChange);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}

