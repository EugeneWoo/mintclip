/**
 * Library Component
 * Table view of saved items with simple filters
 */

import React, { useState, useEffect } from 'react';
import { VideoCard } from './VideoCard';
import { SavedItemModal } from './modal/SavedItemModal';
import { extensionAuth, getAuthToken } from '../utils/auth';
import { exportVideoAsZip, fetchAllItemsForVideo } from '../utils/export';

interface SavedItem {
  id: string;
  video_id: string;
  item_type: 'transcript' | 'summary';
  content: any;
  created_at: string;
  source: 'extension' | 'upload';
}

type ContentFilter = 'all' | 'transcript' | 'summary';
type DateOrder = 'latest' | 'earliest';

export function Library(): React.JSX.Element {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Filters
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [dateOrder, setDateOrder] = useState<DateOrder>('latest');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedItems();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await extensionAuth.getAuthToken();
      setIsAuthenticated(response.success && !!response.token);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
  };

  const loadSavedItems = async () => {
    try {
      setIsLoadingItems(true);
      const token = await getAuthToken();

      const response = await fetch('http://localhost:8000/api/saved-items/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSavedItems(data.items || []);
      } else {
        console.error('Failed to load items:', data.error);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleView = (item: SavedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleExport = async (item: SavedItem) => {
    console.log('[Library handleExport] Starting export for item:', item);
    try {
      const token = await getAuthToken();
      const videoTitle = item.content?.videoTitle || `Video ${item.video_id}`;

      // Fetch all items for this video
      const allVideoItems = await fetchAllItemsForVideo(item.video_id, token);
      console.log('[Library handleExport] Fetched items:', allVideoItems);

      // Export as ZIP
      await exportVideoAsZip(videoTitle, allVideoItems);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Filter items
  const filteredItems = savedItems.filter(item => {
    if (contentFilter === 'all') return true;
    return item.item_type === contentFilter;
  });

  // Group items by video_id to merge content from different item_types
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.video_id]) {
      acc[item.video_id] = {
        video_id: item.video_id,
        item_type: item.item_type,
        content: { ...item.content },
        created_at: item.created_at,
        source: item.source,
        id: item.id,
      };
    } else {
      // Merge content from multiple item_types for the same video
      const existing = acc[item.video_id];
      existing.content = {
        ...existing.content,
        ...item.content,
        // Merge formats if exists
        ...(item.content?.formats ? { formats: { ...existing.content?.formats, ...item.content.formats } } : {}),
      };
      // Use the most recent created_at
      if (new Date(item.created_at) > new Date(existing.created_at)) {
        existing.created_at = item.created_at;
      }
    }
    return acc;
  }, {} as Record<string, SavedItem>);

  // Sort items
  const sortedItems = Object.values(groupedItems).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });

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

            <div style={{
              display: 'flex',
              gap: '0.5rem',
            }}>
              <a
                href="/"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                }}
              >
                Dashboard
              </a>
              <a
                href="/library"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                Library
              </a>
            </div>
          </div>

          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}>
            U
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        paddingTop: '120px',
        paddingBottom: '4rem',
        paddingLeft: '2rem',
        paddingRight: '2rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h1 style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                Library
              </h1>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255, 255, 255, 0.6)',
              }}>
                {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            background: '#262626',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            {/* Content Type Filter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500,
              }}>
                Filter by:
              </span>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
              }}>
                {(['all', 'transcript', 'summary'] as ContentFilter[]).map(filter => (
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
              alignItems: 'center',
              gap: '1rem',
              marginLeft: 'auto',
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500,
              }}>
                Sort by:
              </span>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
              }}>
                {(['latest', 'earliest'] as DateOrder[]).map(order => (
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

          {/* Items Grid */}
          {isLoadingItems ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              Loading your content...
            </div>
          ) : sortedItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'rgba(255, 255, 255, 0.6)',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                {contentFilter === 'all'
                  ? 'No content yet. Extract your first YouTube video from the dashboard!'
                  : `No ${contentFilter} items found. Try a different filter.`}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}>
              {sortedItems.map((item) => (
                <VideoCard
                  key={`${item.video_id}-${item.item_type}`}
                  item={item}
                  onView={handleView}
                  onExport={handleExport}
                />
              ))}
            </div>
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
    </div>
  );
}
