/**
 * Tab Navigation Component
 * Provides tab switching for Transcript, Summary, and Chat
 */

import React from 'react';

export type TabType = 'transcript' | 'summary' | 'chat';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps): React.JSX.Element {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'transcript', label: 'Transcript', icon: '📝' },
    { id: 'summary', label: 'Summary', icon: '✨' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: '#212121',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent',
            color: activeTab === tab.id ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            fontWeight: activeTab === tab.id ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
