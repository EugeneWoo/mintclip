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
  
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      callback(url);
    }
  });

  observer.observe(document, { subtree: true, childList: true });

  // Return cleanup function
  return () => observer.disconnect();
}

