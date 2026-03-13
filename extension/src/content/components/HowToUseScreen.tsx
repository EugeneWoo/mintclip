/**
 * HowToUseScreen
 * "Guide" tab content — explains how to use every Mintclip feature
 */

import React from 'react';

interface HowToUseScreenProps {
  isDarkMode: boolean;
}

interface Section {
  emoji: string;
  title: string;
  steps: string[];
}

const SECTIONS: Section[] = [
  {
    emoji: '📝',
    title: 'Get a Transcript',
    steps: [
      '⚡ Mintclip auto-loads the transcript — no button needed',
      '🌐 Use the language dropdown to switch languages',
      '🔄 Non-English videos are auto-translated to English via AI',
    ],
  },
  {
    emoji: '✨',
    title: 'Generate a Summary',
    steps: [
      '🗂️ Click the Summary tab and choose a format — Short, Topics, or Q&A',
      '🤖 Hit Generate and Mintclip summarises the video with AI',
      '♻️ Switch formats anytime — each is generated independently',
    ],
  },
  {
    emoji: '💬',
    title: 'Chat With the Video',
    steps: [
      '💡 Click Chat, then pick a suggested question or type your own',
      '🧠 Answers are grounded in the video transcript',
    ],
  },
  {
    emoji: '🔖',
    title: 'Save Items',
    steps: [
      '💾 Hit Save in the Transcript or Summary tab',
      '☁️ Synced to your account instantly — accessible on any device',
      '⚠️ Free plan: up to 25 saved items',
    ],
  },
  {
    emoji: '📤',
    title: 'Export',
    steps: [
      '📋 Use Copy in the Transcript or Summary tab to copy the full text',
      '🗒️ Paste into any doc, note, or email',
    ],
  },
  {
    emoji: '📚',
    title: 'View Saved Items on Dashboard',
    steps: [
      '🖥️ Click the Dashboard button in the top-right of this panel',
      '🔎 Browse, search, and filter all your saved transcripts and summaries',
      '🗑️ Delete items you no longer need',
    ],
  },
];

export function HowToUseScreen({ isDarkMode }: HowToUseScreenProps): React.JSX.Element {
  const textPrimary = isDarkMode ? '#ffffff' : '#111111';
  const textSecondary = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      className="transcript-scrollable"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2px' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: textPrimary,
            letterSpacing: '-0.02em',
            marginBottom: '6px',
          }}
        >
          How to Use Mintclip
        </div>
        <div style={{ fontSize: '12px', color: textSecondary, lineHeight: 1.45 }}>
          <div>Mintclip works on any YouTube video with captions available.</div>
          <div>Contact getmintclip@gmail.com for support.</div>
        </div>
      </div>

      {/* Feature sections */}
      {SECTIONS.map((section) => (
        <div
          key={section.title}
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '10px',
            padding: '11px 13px',
          }}
        >
          {/* Section heading */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{section.emoji}</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              {section.title}
            </span>
          </div>

          {/* Steps */}
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            {section.steps.map((step, i) => (
              <li
                key={i}
                style={{
                  fontSize: '12px',
                  color: textSecondary,
                  lineHeight: 1.5,
                  paddingLeft: '2px',
                }}
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      ))}

    </div>
  );
}
