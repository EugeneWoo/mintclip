/**
 * Dashboard Component
 * Main dashboard page with URL extraction and saved items display
 */

import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
import { VideoCard } from './VideoCard';
import { SavedItemModal } from './modal/SavedItemModal';
import { UserProfileDropdown } from './UserProfileDropdown';
import { Footer } from './Footer';
import { getAuthToken } from '../utils/auth';
import { BACKEND_URL } from '../config';

interface SavedItem {
  id: string;
  video_id: string;
  item_type: 'transcript' | 'summary' | 'chat';
  content: any;
  created_at: string;
  source: 'extension' | 'upload';
}

interface ExtractResponse {
  success: boolean;
  video_id?: string;
  video_title?: string;
  transcript?: any[];
  language?: string;
  error?: string;
}

export function Dashboard(): React.JSX.Element {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9); // Show 9 cards initially
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contentFilter, setContentFilter] = useState<'all' | 'transcript' | 'summary'>('all');
  const [dateOrder, setDateOrder] = useState<'latest' | 'earliest'>('latest');

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load saved items on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedItems();
    }
  }, [isAuthenticated]);

  // Listen for item saved notifications from extension
  useEffect(() => {
    const handleItemSaved = (event: MessageEvent) => {
      if (event.data.type === 'MINTCLIP_ITEM_SAVED') {
        console.log('[Dashboard] Item saved notification received:', event.data.data);
        // Reload saved items to show the new item
        if (isAuthenticated) {
          loadSavedItems();
        }
      }
    };

    window.addEventListener('message', handleItemSaved);

    return () => {
      window.removeEventListener('message', handleItemSaved);
    };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('mintclip_access_token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to Google OAuth
    const CLIENT_ID = '210145228416-krofb2li6a68ng13el76rs301e6tgmb2.apps.googleusercontent.com';
    const REDIRECT_URI = encodeURIComponent(window.location.origin + '/auth/callback');
    const SCOPES = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPES}&access_type=offline&prompt=consent`;

    window.location.href = authUrl;
  };

  const loadSavedItems = async () => {
    try {
      setIsLoadingItems(true);
      const token = await getAuthToken();

      const response = await fetch(`${BACKEND_URL}/api/saved-items/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Group items by video_id and merge their content
        const itemsByVideo = (data.items || []).reduce((acc: any, item: SavedItem) => {
          const videoId = item.video_id;

          if (!acc[videoId]) {
            // Create a new merged item for this video
            acc[videoId] = {
              id: item.id,
              video_id: videoId,
              item_type: 'transcript', // Default type
              content: {
                videoTitle: item.content?.videoTitle,
                videoThumbnail: item.content?.videoThumbnail,
              },
              created_at: item.created_at,
              source: item.source,
            };
          }

          // Merge content based on item_type
          if (item.item_type === 'transcript' && item.content?.segments) {
            acc[videoId].content.segments = item.content.segments;
            acc[videoId].content.text = item.content.text;
            acc[videoId].content.language = item.content.language;
          }

if (item.item_type === 'summary') {
            // Debug log summary content structure
            console.log(`[Dashboard] Merging summary for ${videoId}:`, {
              has_summary: !!item.content?.summary,
              has_summaries: !!item.content?.summaries,
              has_formats: !!item.content?.formats,
              has_format_field: !!item.content?.format,
              content_keys: Object.keys(item.content || {}),
              content: item.content,
            });

            // Handle both formats: single summary or summaries object
            if (item.content?.summary) {
              const format = item.content.format; // 'short' | 'topic' | 'qa'

              if (format) {
                // New format: Each format is saved as a separate row with content.format field
                // Merge into a formats object for backward compatibility
                if (!acc[videoId].content.formats) {
                  acc[videoId].content.formats = {};
                }
                acc[videoId].content.formats[format] = {
                  summary: item.content.summary,
                  is_structured: item.content.is_structured || false,
                };
              } else {
                // Legacy: Direct summary without format field
                acc[videoId].content.summary = item.content.summary;
                acc[videoId].content.format = item.content.format;
                acc[videoId].content.is_structured = item.content.is_structured;
              }
            } else if (item.content?.summaries) {
              // Legacy: Summaries object from extension's old save format
              acc[videoId].content.summaries = item.content.summaries;
            } else if (item.content?.formats) {
              // Legacy: Formats object from extension's old nested save format
              acc[videoId].content.formats = { ...acc[videoId].content.formats, ...item.content.formats };
            }
            // FALLBACK: If neither format exists but we have a summary item_type,
            // copy entire content object to preserve whatever format is there
            else {
              console.warn(`[Dashboard] Summary item for ${videoId} has unexpected format, copying all content`);
              acc[videoId].content = { ...acc[videoId].content, ...item.content };
            }
          }

          if (item.item_type === 'chat') {
            // Handle both formats: chat_history (new) or messages (old)
            console.log(`[Dashboard] Processing chat item for ${videoId}:`, item.content);
            if (item.content?.chat_history) {
              console.log(`[Dashboard] Found chat_history:`, item.content.chat_history);
              acc[videoId].content.chat_history = item.content.chat_history;
            } else if (item.content?.messages) {
              console.log(`[Dashboard] Found messages (old format):`, item.content.messages);
              acc[videoId].content.chat_history = item.content.messages;
            } else {
              console.warn(`[Dashboard] Chat item has no chat_history or messages:`, item);
            }
          }

          // Update metadata from most recent item
          if (!acc[videoId].content.videoTitle && item.content?.videoTitle) {
            acc[videoId].content.videoTitle = item.content.videoTitle;
          }
          if (!acc[videoId].content.videoThumbnail && item.content?.videoThumbnail) {
            acc[videoId].content.videoThumbnail = item.content.videoThumbnail;
          }

          return acc;
        }, {});

        // Convert back to array
        const mergedItems = Object.values(itemsByVideo) as SavedItem[];
        console.log('[Dashboard] Merged items:', mergedItems);
        setSavedItems(mergedItems);
      } else {
        console.error('Failed to load items:', data.error);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  };

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setExtractError('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setExtractError('Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setExtractError('Could not extract video ID from URL');
      return;
    }

    // Check if this video already exists
    const existingVideo = savedItems.find(item => item.video_id === videoId);
    if (existingVideo) {
      const videoTitle = existingVideo.content?.videoTitle || `Video ${videoId}`;
      const existingSource = existingVideo.source === 'extension' ? 'Extension' : 'Uploaded';

      const confirmed = window.confirm(
        `This video was already ${existingSource}:\n\n"${videoTitle}"\n\nDo you want to replace it with a new upload?\n\nClick OK to replace, or Cancel to keep the existing version.`
      );

      if (!confirmed) {
        setExtractError('Upload cancelled. Existing video preserved.');
        return;
      }

      // User confirmed - delete existing items for this video first
      try {
        const token = await getAuthToken();
        const deleteResponse = await fetch(`${BACKEND_URL}/api/saved-items/video/${videoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!deleteResponse.ok) {
          setExtractError('Failed to remove existing video. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Delete error:', error);
        setExtractError('Failed to remove existing video. Please try again.');
        return;
      }
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const token = await getAuthToken();

      // Extract transcript
      const extractResponse = await fetch(`${BACKEND_URL}/api/transcript/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_url: url,
          languages: ['en'], // Prioritize English
        }),
      });

      const extractData: ExtractResponse = await extractResponse.json();

      if (!extractData.success || !extractData.transcript) {
        setExtractError(extractData.error || 'Failed to extract transcript');
        return;
      }

      // Save to Supabase with source='upload'
      const saveResponse = await fetch(`${BACKEND_URL}/api/saved-items/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_id: videoId,
          item_type: 'transcript',
          content: {
            videoTitle: extractData.video_title || `Video ${videoId}`,
            savedAt: new Date().toISOString(),
            language: extractData.language || 'en',
            text: extractData.transcript.map((seg: any) => seg.text).join(' '),
            segments: extractData.transcript,
          },
          source: 'upload',
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        setExtractError(saveData.error || 'Failed to save transcript');
        return;
      }

      // Success! Clear URL
      setUrl('');

      // Create a SavedItem object from the save response to open immediately
      const newItem: SavedItem = {
        id: saveData.item?.id || videoId,
        video_id: videoId,
        item_type: 'transcript',
        content: {
          videoTitle: extractData.video_title || `Video ${videoId}`,
          savedAt: new Date().toISOString(),
          language: extractData.language || 'en',
          text: extractData.transcript.map((seg: any) => seg.text).join(' '),
          segments: extractData.transcript,
        },
        created_at: new Date().toISOString(),
        source: 'upload',
      };

      // Open the modal with the new item
      handleView(newItem);

      // Reload saved items in background
      loadSavedItems();
    } catch (error) {
      console.error('Extract error:', error);
      setExtractError('Failed to extract transcript. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleView = (item: SavedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleExport = async (item: SavedItem) => {
    // Export as ZIP with separate files for transcript and summary formats
    try {
      const token = await getAuthToken();
      const videoTitle = item.content?.videoTitle || `Video ${item.video_id}`;

      // Fetch ALL items for this video (transcript + summary)
      const { exportVideoAsZip, fetchAllItemsForVideo } = await import('../utils/export');
      const allItems = await fetchAllItemsForVideo(item.video_id, token);

      console.log('[Dashboard] Exporting video items:', {
        video_id: item.video_id,
        total_items: allItems.length,
        item_types: allItems.map(i => i.item_type)
      });

      await exportVideoAsZip(videoTitle, allItems);
    } catch (error) {
      console.error('[Dashboard] Export failed:', error);
      alert('Failed to export. Please try again.');
    }
  };

  const handleDelete = async (item: SavedItem) => {
    const videoTitle = item.content?.videoTitle || `Video ${item.video_id}`;

    // Confirm deletion
    const confirmed = window.confirm(
      `Delete all saved content for "${videoTitle}"?\n\nThis will remove all transcripts, summaries, and chats for this video.`
    );

    if (!confirmed) return;

    try {
      const token = await getAuthToken();

      const response = await fetch(`${BACKEND_URL}/api/saved-items/video/${item.video_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Remove the card from state by filtering out this video_id
        setSavedItems(prev => prev.filter(i => i.video_id !== item.video_id));
      } else {
        console.error('Failed to delete items:', data.error);
        alert('Failed to delete items. Please try again.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete items. Please try again.');
    }
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const getFilteredItems = () => {
    // Filter by content type based on what's actually saved
    let filtered = savedItems.filter(item => {
      if (contentFilter === 'all') return true;

      // Check what content actually exists
      if (contentFilter === 'transcript') {
        return item.content?.segments && item.content.segments.length > 0;
      } else if (contentFilter === 'summary') {
        return item.content?.summary || (item.content?.summaries && (
          item.content.summaries.short || item.content.summaries.topic || item.content.summaries.qa
        ));
      }

      return false;
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const getDisplayedItems = () => {
    const filtered = getFilteredItems();
    return filtered.slice(0, visibleCount);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 9); // Load 9 more items
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#171717',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '1.25rem 2rem',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(23, 23, 23, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '100px',
          padding: '0.75rem 1rem 0.75rem 1.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3rem',
          }}>
            <a
              href="/"
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <img
                src="/icon-48.png"
                alt="Mintclip"
                style={{ width: '40px', height: '40px', borderRadius: '10px' }}
              />
              Mintclip
            </a>

          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {isAuthenticated ? (
              <UserProfileDropdown onDeleteAccount={() => loadSavedItems()} />
            ) : (
              <button
                onClick={handleSignIn}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#16a34a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#22c55e';
                }}
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        paddingTop: window.innerWidth < 768 ? '100px' : '120px',
        paddingBottom: window.innerWidth < 768 ? '2rem' : '4rem',
        paddingLeft: window.innerWidth < 768 ? '1rem' : '2rem',
        paddingRight: window.innerWidth < 768 ? '1rem' : '2rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* URL Input Section */}
          <div style={{
            marginBottom: window.innerWidth < 768 ? '2rem' : '3rem',
            textAlign: 'center',
            padding: window.innerWidth < 768 ? '0 0.5rem' : '0',
          }}>
            <h1 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: window.innerWidth < 768 ? '1.75rem' : '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}>
              Extract YouTube Content
            </h1>
            <p style={{
              fontSize: window.innerWidth < 768 ? '0.95rem' : '1.1rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: window.innerWidth < 768 ? '1.5rem' : '2rem',
            }}>
              Paste a YouTube URL to extract transcripts, summaries, and chat
            </p>

            <div style={{
              maxWidth: '600px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: window.innerWidth < 640 ? 'column' : 'row',
              gap: '0.75rem',
            }}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleExtract();
                  }
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isExtracting}
                style={{
                  flex: 1,
                  padding: window.innerWidth < 640 ? '1rem 1.25rem' : '0.875rem 1.25rem',
                  background: '#262626',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px', /* Prevent zoom on iOS */
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
              <button
                onClick={handleExtract}
                disabled={isExtracting || !url.trim()}
                style={{
                  padding: window.innerWidth < 640 ? '1rem 2rem' : '0.875rem 2rem',
                  background: isExtracting || !url.trim() ? '#404040' : '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isExtracting || !url.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  minHeight: '48px', /* Touch-friendly height */
                }}
                onMouseEnter={(e) => {
                  if (!isExtracting && url.trim()) {
                    e.currentTarget.style.background = '#16a34a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isExtracting && url.trim()) {
                    e.currentTarget.style.background = '#22c55e';
                  }
                }}
              >
                {isExtracting ? 'Extracting...' : 'Extract'}
              </button>
            </div>

            {extractError && (
              <p style={{
                marginTop: '1rem',
                color: '#ef4444',
                fontSize: '0.9rem',
              }}>
                {extractError}
              </p>
            )}
          </div>

          {/* Saved Items Grid with Pagination */}
          {isLoadingItems ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              Loading your content...
            </div>
          ) : savedItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                No content yet. Extract your first YouTube video above!
              </p>
            </div>
          ) : (
            <>
              {/* Filter Bar (Library-style) - Mobile Responsive */}
              <div style={{
                background: '#262626',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                gap: window.innerWidth < 640 ? '1rem' : '2rem',
                alignItems: window.innerWidth < 640 ? 'stretch' : 'center',
                flexWrap: 'wrap',
              }}>
                {/* Content Type Filter */}
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                  alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    Filter by:
                  </span>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    width: window.innerWidth < 640 ? '100%' : 'auto',
                  }}>
                    {(['all', 'transcript', 'summary'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setContentFilter(filter)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: contentFilter === filter ? '#667eea' : 'transparent',
                          color: contentFilter === filter ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          border: contentFilter === filter ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                          flex: window.innerWidth < 640 ? '1' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (contentFilter !== filter) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (contentFilter !== filter) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Order Filter */}
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                  alignItems: window.innerWidth < 640 ? 'flex-start' : 'center',
                  marginLeft: window.innerWidth < 640 ? '0' : 'auto',
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    Sort by:
                  </span>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    width: window.innerWidth < 640 ? '100%' : 'auto',
                  }}>
                    {(['latest', 'earliest'] as const).map(order => (
                      <button
                        key={order}
                        onClick={() => setDateOrder(order)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: dateOrder === order ? '#667eea' : 'transparent',
                          color: dateOrder === order ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                          border: dateOrder === order ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                          flex: window.innerWidth < 640 ? '1' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (dateOrder !== order) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dateOrder !== order) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {order === 'latest' ? 'Latest First' : 'Earliest First'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video Grid - Responsive: 1 col mobile, 2 tablet, 3 desktop, 4 wide */}
              <div className="grid" style={{
                gap: '1.5rem',
                alignItems: 'start',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
              }}>
                {getDisplayedItems().map((item) => (
                  <VideoCard
                    key={`${item.video_id}-${item.item_type}`}
                    item={item}
                    onView={handleView}
                    onExport={handleExport}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Load More Button - show when more items available */}
              {getFilteredItems().length > visibleCount && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '2rem',
                }}>
                  <button
                    onClick={handleLoadMore}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#22c55e',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    Load {getFilteredItems().length - visibleCount > 0 ? getFilteredItems().length - visibleCount : 0} more videos
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedItem && (
        <SavedItemModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          item={{
            video_id: selectedItem.video_id,
            video_title: selectedItem.content?.videoTitle || `Video ${selectedItem.video_id}`,
            video_thumbnail: selectedItem.content?.videoThumbnail,
            item_type: selectedItem.item_type,
            content: selectedItem.content,
            created_at: selectedItem.created_at,
            source: selectedItem.source,
          }}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
