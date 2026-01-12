/**
 * YouTube Sidebar Component
 * Tabbed interface with Transcript, Summary, and Chat tabs
 */

import React, { useState, useEffect } from 'react';
import { TabNavigation, TabType } from './TabNavigation';
import { TranscriptTab } from './TranscriptTab';
import { SummaryTab, SummaryFormat } from './SummaryTab';
import { ChatTab } from './ChatTab';
import { ErrorToast } from './ErrorToast';

interface Language {
  code: string;
  name: string;
  is_generated?: boolean;
  is_translatable?: boolean;
  is_ai_translated?: boolean;
}

interface YouTubeSidebarProps {
  videoId: string;
}

export function YouTubeSidebar({ videoId }: YouTubeSidebarProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState<number>(402); // Dynamic width state

  // Calculate dynamic width based on available space
  useEffect(() => {
    const calculateWidth = () => {
      console.log('[Mintclip] calculateWidth() called');
      // Get YouTube's video player container
      const ytdPlayer = document.querySelector('#player-container-outer, #player-container, ytd-player');
      const primaryInner = document.querySelector('#primary-inner, #primary');
      console.log('[Mintclip] Element queries:', { ytdPlayer: !!ytdPlayer, primaryInner: !!primaryInner });

      if (!ytdPlayer || !primaryInner) {
        console.log('[Mintclip] Missing required elements, returning early');
        return;
      }

      // Calculate available space
      const playerRect = ytdPlayer.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Calculate space between player right edge and viewport right edge
      const availableSpace = viewportWidth - playerRect.right - 32; // 32px for padding

      // Set width with constraints: min 350px, max 600px
      const newWidth = Math.max(350, Math.min(availableSpace, 600));
      console.log('[Mintclip] Width calculation:', { playerRight: playerRect.right, viewportWidth, availableSpace, newWidth });
      setSidebarWidth(newWidth);
    };

    // Initial calculation
    calculateWidth();

    // Recalculate on window resize
    const resizeObserver = new ResizeObserver(() => {
      calculateWidth();
    });

    // Observe the video player container for size changes
    const playerContainer = document.querySelector('#player-container-outer, #player-container, ytd-player');
    if (playerContainer) {
      resizeObserver.observe(playerContainer);
    }

    // Also listen to window resize
    window.addEventListener('resize', calculateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateWidth);
    };
  }, [videoId]); // Re-calculate when video changes

  // Auth state - Set to true for testing (skip authentication)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authChecked, setAuthChecked] = useState(true);

  // Transcript state
  const [transcript, setTranscript] = useState<any>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Summary state - store all formats separately with per-format is_structured flag
  const [summaries, setSummaries] = useState<{ short?: string; topic?: string; qa?: string; short_is_structured?: boolean; topic_is_structured?: boolean; qa_is_structured?: boolean }>({});
  const [loadingFormat, setLoadingFormat] = useState<SummaryFormat | null>(null);
  const [currentFormat, setCurrentFormat] = useState<SummaryFormat>('short');

  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState<string>('en'); // Track current transcript language
  const [englishTranslation, setEnglishTranslation] = useState<any>(null); // AI-translated English transcript
  const [translating, setTranslating] = useState(false); // Translation in progress
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]); // Available languages for the video
  const [transcriptCache, setTranscriptCache] = useState<{ [languageCode: string]: any }>({}); // Cache transcripts by language

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('[YouTubeSidebar] State - currentLanguage:', currentLanguage, 'englishTranslation:', englishTranslation ? 'exists' : 'null', 'translating:', translating);
  }, [currentLanguage, englishTranslation, translating]);

  // Get video title from YouTube page
  React.useEffect(() => {
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string');
    if (titleElement) {
      setVideoTitle(titleElement.textContent || '');
    }
  }, [videoId]);

  // Load cached data for this video on mount
  React.useEffect(() => {
    const loadVideoData = async () => {
      try {
        const storageKey = `video_${videoId}`;
        const result = await chrome.storage.local.get(storageKey);

        if (result[storageKey]) {
          const videoData = result[storageKey];
          const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds

          // Check if data is still valid (1 hour TTL)
          const isExpired = videoData.lastUpdated && (Date.now() - videoData.lastUpdated > ONE_HOUR);

          if (isExpired) {
            console.log('[YouTubeSidebar] Cached data expired, clearing storage');
            await chrome.storage.local.remove(storageKey);
            return;
          }

          // Restore transcript
          if (videoData.transcript) {
            setTranscript(videoData.transcript);
          }

          // Restore transcript cache (all languages)
          if (videoData.transcriptCache) {
            setTranscriptCache(videoData.transcriptCache);
            console.log('[YouTubeSidebar] Restored transcript cache:', Object.keys(videoData.transcriptCache));
          }

          // Restore current language
          if (videoData.currentLanguage) {
            setCurrentLanguage(videoData.currentLanguage);
          }

          // Restore summaries with migration for legacy cache format
          if (videoData.summaries) {
            // Ensure format-specific boolean fields exist (migration for old cached data)
            const migratedSummaries = {
              ...videoData.summaries,
              short_is_structured: videoData.summaries.short_is_structured || false,
              topic_is_structured: videoData.summaries.topic_is_structured || false,
              qa_is_structured: videoData.summaries.qa_is_structured || false,
            };
            setSummaries(migratedSummaries);
          }

          // Restore chat messages
          if (videoData.chatMessages) {
            setChatMessages(videoData.chatMessages);
          }

          // Restore current format
          if (videoData.currentFormat) {
            setCurrentFormat(videoData.currentFormat);
          }

          // Restore suggested questions
          if (videoData.suggestedQuestions) {
            setSuggestedQuestions(videoData.suggestedQuestions);
          }
        }
      } catch (err) {
        console.error('Failed to load video data:', err);
      }
    };

    loadVideoData();
  }, [videoId]);

  // Check authentication status on mount
  React.useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
      if (response && response.success) {
        setIsAuthenticated(response.data.isAuthenticated);
      }
      setAuthChecked(true);
    });

    // Listen for auth state changes in storage
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.auth) {
        const newAuthState = changes.auth.newValue;
        if (newAuthState) {
          setIsAuthenticated(newAuthState.isAuthenticated);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Save video data to storage whenever it changes
  React.useEffect(() => {
    const saveVideoData = async () => {
      try {
        const storageKey = `video_${videoId}`;
        const videoData = {
          transcript,
          transcriptCache, // Save all cached transcripts (native languages + AI translation)
          currentLanguage,
          summaries,
          chatMessages,
          currentFormat,
          suggestedQuestions,
          lastUpdated: Date.now(),
        };

        await chrome.storage.local.set({ [storageKey]: videoData });
      } catch (err) {
        console.error('Failed to save video data:', err);
      }
    };

    // Only save if we have some data
    if (transcript || Object.keys(summaries).length > 0 || chatMessages.length > 0 || suggestedQuestions.length > 0 || Object.keys(transcriptCache).length > 0) {
      saveVideoData();
    }
  }, [videoId, transcript, transcriptCache, currentLanguage, summaries, chatMessages, currentFormat, suggestedQuestions]);

  // Debug: Monitor transcript state changes
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      console.log('[YouTubeSidebar] ⚠️ TRANSCRIPT STATE CHANGED:');
      console.log(`  - Length: ${transcript.length} segments`);
      console.log(`  - First segment text: "${transcript[0]?.text?.substring(0, 50)}..."`);
      console.log(`  - Current language: ${currentLanguage}`);
    }
  }, [transcript]);

  // Poll backend to check if translation is ready
  const pollForTranslation = async (sourceLanguage: string) => {
    const maxPolls = 30; // Poll for up to 15 seconds (30 polls x 500ms)
    let pollCount = 0;

    const poll = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_LANGUAGES_WITH_TRANSLATION',
          payload: { videoId },
        });

        if (response.success) {
          const englishTranslated = response.languages?.find(
            (lang: any) => lang.code === 'en' && lang.is_ai_translated
          );

          if (englishTranslated) {
            // Translation is ready! Update the language list and fetch transcript
            setTranslating(false);

            // Update language list from backend response
            // This will change "English (translating...)" → "English (AI-translated)"
            setAvailableLanguages(response.languages);
            console.log('[YouTubeSidebar] Translation ready! Updated language list:', response.languages);

            // Fetch the AI-translated English transcript
            try {
              const transcriptResponse = await chrome.runtime.sendMessage({
                type: 'GET_TRANSCRIPT',
                payload: { videoId, languageCode: 'en' },
              });

              if (transcriptResponse.success && transcriptResponse.data) {
                // DEBUG: Check what we actually received
                console.log('[YouTubeSidebar] ⚠️ POLLING - Transcript response received:');
                console.log('  - Language code from backend:', transcriptResponse.language);
                console.log('  - First segment text:', transcriptResponse.data[0]?.text?.substring(0, 50));
                console.log('  - Total segments:', transcriptResponse.data.length);

                // Store the AI-translated English transcript
                setEnglishTranslation(transcriptResponse.data);

                // Also cache it for instant access
                setTranscriptCache(prev => {
                  const updated = {
                    ...prev,
                    ['en']: transcriptResponse.data
                  };
                  console.log('[YouTubeSidebar] Cache updated with AI-translated English. Cache keys:', Object.keys(updated));
                  return updated;
                });

                console.log('[YouTubeSidebar] AI-translated English transcript fetched and cached ✓');
                console.log('[YouTubeSidebar] englishTranslation state:', transcriptResponse.data ? `${transcriptResponse.data.length} segments` : 'null');
              } else {
                console.error('[YouTubeSidebar] Polling fetch failed:', transcriptResponse);
              }
            } catch (err) {
              console.error('[YouTubeSidebar] Error fetching translated transcript:', err);
            }

            return;
          }
        }

        // Continue polling if not ready and haven't exceeded max polls
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 500); // Poll every 500ms
        } else {
          // Timeout - remove the translating status and keep "English (translating...)" as-is
          console.log('[YouTubeSidebar] Translation polling timeout - translation may still complete in background');
          setTranslating(false);
        }
      } catch (err) {
        console.error('[YouTubeSidebar] Error polling for translation:', err);
        setTranslating(false);
      }
    };

    poll();
  };

  // Fetch available languages for the video
  const handleFetchLanguages = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_LANGUAGES_WITH_TRANSLATION',
        payload: { videoId },
      });

      if (response.success) {
        setAvailableLanguages(response.languages || []);
        console.log('[YouTubeSidebar] Available languages:', response.languages);
      } else {
        console.error('[YouTubeSidebar] Failed to fetch languages:', response.error);
      }
    } catch (err) {
      console.error('[YouTubeSidebar] Error fetching languages:', err);
    }
  };

  // Auto-fetch transcript on mount when authenticated
  React.useEffect(() => {
    if (isAuthenticated && authChecked && !transcript && !transcriptLoading) {
      // Silently fetch transcript in the background
      const fetchTranscriptInBackground = async () => {
        try {
          // CRITICAL: Fetch available languages FIRST before transcript
          // This ensures language dropdown appears immediately when transcript loads
          const langResponse = await chrome.runtime.sendMessage({
            type: 'GET_LANGUAGES_WITH_TRANSLATION',
            payload: { videoId },
          });

          if (langResponse.success) {
            const languages = langResponse.languages || [];
            console.log('[YouTubeSidebar] Available languages:', languages);

            // Now fetch transcript
            const response = await chrome.runtime.sendMessage({
              type: 'GET_TRANSCRIPT',
              payload: { videoId },
            });

            if (response.success) {
              setTranscript(response.data);
              // Track the language returned by backend
              const lang = response.language || 'en';
              setCurrentLanguage(lang);
              console.log('[YouTubeSidebar] Auto-loaded transcript in language:', lang);

              // Cache the transcript by language code for instant switching
              setTranscriptCache(prev => ({
                ...prev,
                [lang]: response.data
              }));

              // Sort languages so current/default language is always first
              const sortedLanguages = [...languages].sort((a, b) => {
                // Current language goes first
                if (a.code === lang && b.code !== lang) return -1;
                if (b.code === lang && a.code !== lang) return 1;
                // Then native languages before AI-translated
                if (!a.is_ai_translated && b.is_ai_translated) return -1;
                if (a.is_ai_translated && !b.is_ai_translated) return 1;
                // Otherwise keep original order
                return 0;
              });

              // Set language list immediately with current language first
              setAvailableLanguages(sortedLanguages);

              // Check if English is available natively
              const hasNativeEnglish = languages.some((l: any) => l.code === 'en' && !l.is_ai_translated);
              console.log('[YouTubeSidebar] Has native English:', hasNativeEnglish);

              // Eager pre-fetch all native language transcripts in background
              // This makes switching between languages instant
              const preFetchAllLanguages = async () => {
                const nativeLanguages = languages.filter((l: any) => !l.is_ai_translated);

                for (const language of nativeLanguages) {
                  // Skip the current language (already loaded)
                  if (language.code === lang) continue;

                  console.log(`[YouTubeSidebar] Pre-fetching ${language.code} transcript...`);

                  try {
                    const transcriptResponse = await chrome.runtime.sendMessage({
                      type: 'GET_TRANSCRIPT',
                      payload: { videoId, languageCode: language.code },
                    });

                    if (transcriptResponse.success) {
                      setTranscriptCache(prev => {
                        // Skip if already cached (in case of race condition)
                        if (prev[language.code]) {
                          console.log(`[YouTubeSidebar] ${language.code} already cached, skipping`);
                          return prev;
                        }

                        console.log(`[YouTubeSidebar] Pre-fetched ${language.code} transcript ✓`);
                        return {
                          ...prev,
                          [language.code]: transcriptResponse.data
                        };
                      });
                    }
                  } catch (err) {
                    console.error(`[YouTubeSidebar] Failed to pre-fetch ${language.code}:`, err);
                  }
                }

                console.log('[YouTubeSidebar] All native languages pre-fetched!');
              };

              // Start pre-fetching in background (non-blocking)
              preFetchAllLanguages();

              // Only trigger eager translation if:
              // 1. Current language is not English
              // 2. Native English is NOT available
              if (lang !== 'en' && !hasNativeEnglish) {
                setTranslating(true);
                // Add English option to show "translating..." status
                // Re-sort with English (translating...) at the end
                const languagesWithTranslating = [...sortedLanguages, {
                  code: 'en',
                  name: 'English (translating...)',
                  is_generated: true,
                  is_translatable: false,
                  is_ai_translated: true
                }];
                setAvailableLanguages(languagesWithTranslating);
                // Start polling for translation completion
                pollForTranslation(lang);
              }
            } else {
              console.log('Background transcript fetch failed:', response.error);
            }
          } else {
            console.log('Background language fetch failed:', langResponse.error);
          }
        } catch (err) {
          console.log('Background transcript fetch error:', err);
        }
      };

      fetchTranscriptInBackground();
    }
  }, [isAuthenticated, authChecked, videoId, transcript, transcriptLoading]);

  // Helper function to translate transcript to English in background
  const translateToEnglishInBackground = async (transcriptData: any[], sourceLanguage: string) => {
    if (sourceLanguage === 'en') {
      console.log('[YouTubeSidebar] Skipping translation - already English');
      return null; // Already English
    }

    console.log(`[YouTubeSidebar] Starting auto-translation: ${sourceLanguage} → English`);
    console.log(`[YouTubeSidebar] Transcript segments to translate: ${transcriptData.length}`);
    setTranslating(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_TRANSCRIPT',
        payload: {
          videoId,
          transcript: transcriptData,
          sourceLanguage,
        },
      });

      if (response.success) {
        setEnglishTranslation(response.transcript);
        // Also cache in transcript cache for consistent handling (use 'en' key to match polling)
        setTranscriptCache(prev => ({
          ...prev,
          'en': response.transcript
        }));
        console.log('[YouTubeSidebar] English translation ready:', response.cached ? '(cached)' : '(newly translated)');
        return response.transcript; // Return the translated transcript
      } else {
        console.error('[YouTubeSidebar] Translation failed:', response.error);
        return null;
      }
    } catch (err) {
      console.error('[YouTubeSidebar] Failed to translate transcript:', err);
      return null;
    } finally {
      setTranslating(false);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    console.log('[YouTubeSidebar] Language changed to:', languageCode);
    console.log('[YouTubeSidebar] Available cache keys:', Object.keys(transcriptCache));
    console.log('[YouTubeSidebar] englishTranslation state:', englishTranslation ? `${englishTranslation.length} segments` : 'null');

    // Check if switching to AI-translated English
    const selectedLang = availableLanguages.find(l => l.code === languageCode);
    console.log('[YouTubeSidebar] Selected language:', selectedLang);

    if (languageCode === 'en' && selectedLang?.is_ai_translated) {
      console.log('[YouTubeSidebar] Attempting to switch to AI-translated English...');
      // Check if AI translation exists in cache or state (with non-empty validation)
      if (englishTranslation && englishTranslation.length > 0) {
        console.log(`[YouTubeSidebar] Using englishTranslation state: ${englishTranslation.length} segments`);
        console.log('[YouTubeSidebar] First segment before switch:', transcript[0]);
        console.log('[YouTubeSidebar] First segment of translation:', englishTranslation[0]);
        // Force a new array reference to trigger React re-render
        const newTranscript = [...englishTranslation];
        setTranscript(newTranscript);
        setCurrentLanguage('en');
        console.log('[YouTubeSidebar] ✓ Switched to AI-translated English (from englishTranslation state)');
        console.log('[YouTubeSidebar] New transcript first segment:', newTranscript[0]);
      } else if (transcriptCache['en'] && transcriptCache['en'].length > 0) {
        // Try cache fallback - polling stores at 'en' key
        console.log(`[YouTubeSidebar] Using transcriptCache['en']: ${transcriptCache['en'].length} segments`);
        // Force a new array reference to trigger React re-render
        setTranscript([...transcriptCache['en']]);
        setEnglishTranslation(transcriptCache['en']);
        setCurrentLanguage('en');
        console.log('[YouTubeSidebar] ✓ Switched to AI-translated English (from transcriptCache)');
      } else if (transcript && currentLanguage !== 'en') {
        console.log('[YouTubeSidebar] ⚠️ AI translation not found in cache or state, triggering translation now...');
        console.log('[YouTubeSidebar] Current transcript segments:', transcript.length);
        console.log('[YouTubeSidebar] Current language:', currentLanguage);
        // Translation not ready - trigger it now
        setTranscriptLoading(true);
        const translatedTranscript = await translateToEnglishInBackground(transcript, currentLanguage);
        setTranscriptLoading(false);

        // After translation completes, switch to it
        if (translatedTranscript && translatedTranscript.length > 0) {
          console.log(`[YouTubeSidebar] Translation successful: ${translatedTranscript.length} segments`);
          setTranscript(translatedTranscript);
          setCurrentLanguage('en');
          console.log('[YouTubeSidebar] Successfully switched to AI-translated English');
        } else {
          console.error('[YouTubeSidebar] Translation failed or returned empty, keeping original language');
        }
      } else {
        console.error('[YouTubeSidebar] ⚠️ Cannot translate - no transcript or already English');
      }
    } else if (transcriptCache[languageCode]) {
      // Use cached native transcript - instant switch!
      setTranscript(transcriptCache[languageCode]);
      setCurrentLanguage(languageCode);
      console.log(`[YouTubeSidebar] Switched to ${languageCode} (cached)`);
    } else {
      // Fetch the transcript in the selected language
      console.log(`[YouTubeSidebar] Fetching ${languageCode} transcript (not cached)`);
      handleFetchTranscript(languageCode);
    }
  };

  const handleFetchTranscript = async (languageCode?: string) => {
    setTranscriptLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TRANSCRIPT',
        payload: { videoId, languageCode },
      });

      if (response.success) {
        setTranscript(response.data);
        // Track the language returned by backend (may differ from requested if fallback occurred)
        const lang = response.language || languageCode || 'en';
        setCurrentLanguage(lang);
        console.log('[YouTubeSidebar] Loaded transcript in language:', lang);

        // Cache the transcript by language code for instant switching
        setTranscriptCache(prev => ({
          ...prev,
          [lang]: response.data
        }));

        // Handle English transcript storage
        if (lang === 'en') {
          if (response.is_generated) {
            // This is AI-translated English - store in englishTranslation
            setEnglishTranslation(response.data);
            console.log('[YouTubeSidebar] Stored AI-translated English transcript');
          } else {
            // This is native English - clear englishTranslation
            setEnglishTranslation(null);
          }
        }

        // Fetch available languages from backend
        // This will include native YouTube languages (including English if available)
        const fetchLanguagesAndCheckTranslation = async () => {
          const langResponse = await chrome.runtime.sendMessage({
            type: 'GET_LANGUAGES_WITH_TRANSLATION',
            payload: { videoId },
          });

          if (langResponse.success) {
            const languages = langResponse.languages || [];
            console.log('[YouTubeSidebar] Available languages:', languages);

            // Check if English is available natively
            const hasNativeEnglish = languages.some((l: any) => l.code === 'en' && !l.is_ai_translated);

            // Set the full language list
            setAvailableLanguages(languages);

            // Only trigger eager translation if:
            // 1. Current language is not English
            // 2. Native English is NOT available
            if (lang !== 'en' && !hasNativeEnglish) {
              setTranslating(true);
              // Add English option to show "translating..." status
              setAvailableLanguages([...languages, {
                code: 'en',
                name: 'English (translating...)',
                is_generated: true,
                is_translatable: false,
                is_ai_translated: true
              }]);
              // Start polling for translation completion
              pollForTranslation(lang);
            }
          }
        };

        fetchLanguagesAndCheckTranslation();
      } else {
        setError(response.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Failed to fetch transcript');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleGenerateSummary = async (format: SummaryFormat) => {
    setLoadingFormat(format);
    try {
      // First, get the transcript if we don't have it
      let transcriptSegments = null;

      if (!transcript) {
        // Fetch transcript first
        const transcriptResponse = await chrome.runtime.sendMessage({
          type: 'GET_TRANSCRIPT',
          payload: { videoId },
        });

        if (transcriptResponse.success && transcriptResponse.data) {
          setTranscript(transcriptResponse.data);
          transcriptSegments = transcriptResponse.data;
        } else {
          setError('Please fetch transcript first');
          setLoadingFormat(null);
          return;
        }
      } else {
        transcriptSegments = transcript;
      }

      // Determine which transcript and language to use for summary
      // Priority: Use English (native preferred, then AI-translated) for best summary quality
      let effectiveLanguage = currentLanguage;
      let effectiveSegments = transcriptSegments;

      // If current language is not English, check for English versions
      if (currentLanguage !== 'en') {
        if (transcriptCache['en']) {
          // Prefer native English if available in cache
          effectiveLanguage = 'en';
          effectiveSegments = transcriptCache['en'];
          console.log('[YouTubeSidebar] Using native English from cache for summary');
        } else if (englishTranslation) {
          // Fallback to AI-translated English
          effectiveLanguage = 'en';
          effectiveSegments = englishTranslation;
          console.log('[YouTubeSidebar] Using AI-translated English for summary');
        } else {
          console.log(`[YouTubeSidebar] Using ${currentLanguage} transcript for summary (no English available)`);
        }
      } else {
        console.log('[YouTubeSidebar] Using native English for summary');
      }

      // Generate summary with structured transcript data and language code
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SUMMARY',
        payload: {
          videoId,
          transcript: JSON.stringify(effectiveSegments), // Send as JSON for structured parsing
          format,
          language: effectiveLanguage
        },
      });

      if (response.success) {
        // Store summary for this format with per-format is_structured flag
        setSummaries((prev) => ({
          ...prev,
          [format]: response.summary,
          [`${format}_is_structured`]: response.is_structured || false
        }));
        setCurrentFormat(format);
      } else {
        setError(response.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError('Failed to generate summary');
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleFetchSuggestedQuestions = async () => {
    setQuestionsLoading(true);
    try {
      // Get transcript text
      let transcriptText = '';
      if (!transcript) {
        // Fetch transcript first
        const transcriptResponse = await chrome.runtime.sendMessage({
          type: 'GET_TRANSCRIPT',
          payload: { videoId },
        });

        if (transcriptResponse.success && transcriptResponse.data) {
          setTranscript(transcriptResponse.data);
          transcriptText = transcriptResponse.data.map((seg: any) => seg.text).join(' ');
        } else {
          setError('Please fetch transcript first');
          setQuestionsLoading(false);
          return;
        }
      } else {
        transcriptText = transcript.map((seg: any) => seg.text).join(' ');
      }

      // Determine which transcript and language to use for suggested questions
      // Priority: Use English (native preferred, then AI-translated) for best results
      let effectiveLanguage = currentLanguage;
      let effectiveTranscript = transcriptText;

      if (currentLanguage !== 'en') {
        if (transcriptCache['en']) {
          // Prefer native English if available in cache
          effectiveLanguage = 'en';
          effectiveTranscript = transcriptCache['en'].map((seg: any) => seg.text).join(' ');
          console.log('[YouTubeSidebar] Using native English from cache for suggested questions');
        } else if (englishTranslation) {
          // Fallback to AI-translated English
          effectiveLanguage = 'en';
          effectiveTranscript = englishTranslation.map((seg: any) => seg.text).join(' ');
          console.log('[YouTubeSidebar] Using AI-translated English for suggested questions');
        } else {
          console.log(`[YouTubeSidebar] Using ${currentLanguage} for suggested questions (no English available)`);
        }
      } else {
        console.log('[YouTubeSidebar] Using native English for suggested questions');
      }

      // Fetch suggested questions with language code
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SUGGESTED_QUESTIONS',
        payload: { videoId, transcript: effectiveTranscript, language: effectiveLanguage },
      });

      if (response.success && response.questions) {
        setSuggestedQuestions(response.questions);
      } else {
        setError(response.error || 'Failed to load suggested questions');
      }
    } catch (err) {
      setError('Failed to load suggested questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSendChatMessage = async (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      // Get transcript text
      let transcriptText = '';
      if (!transcript) {
        // Fetch transcript first
        const transcriptResponse = await chrome.runtime.sendMessage({
          type: 'GET_TRANSCRIPT',
          payload: { videoId },
        });

        if (transcriptResponse.success && transcriptResponse.data) {
          setTranscript(transcriptResponse.data);
          transcriptText = transcriptResponse.data.map((seg: any) => seg.text).join(' ');
        } else {
          setError('Please fetch transcript first');
          setChatLoading(false);
          return;
        }
      } else {
        transcriptText = transcript.map((seg: any) => seg.text).join(' ');
      }

      // Format chat history for API
      const chatHistory = chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Determine which transcript and language to use for chat
      // Priority: Use English (native or AI-translated) for best results
      let effectiveLanguage = currentLanguage;
      let effectiveTranscript = transcriptText;

      if (currentLanguage !== 'en') {
        if (transcriptCache['en']) {
          // Prefer native English if available in cache
          effectiveLanguage = 'en';
          effectiveTranscript = transcriptCache['en'].map((seg: any) => seg.text).join(' ');
          console.log('[YouTubeSidebar] Using native English from cache for chat');
        } else if (englishTranslation) {
          // Fallback to AI-translated English
          effectiveLanguage = 'en';
          effectiveTranscript = englishTranslation.map((seg: any) => seg.text).join(' ');
          console.log('[YouTubeSidebar] Using AI-translated English for chat');
        } else {
          console.log(`[YouTubeSidebar] Using ${currentLanguage} for chat (no English available)`);
        }
      } else {
        console.log('[YouTubeSidebar] Using native English for chat');
      }

      // Send chat message with language code
      const response = await chrome.runtime.sendMessage({
        type: 'CHAT',
        payload: {
          videoId,
          transcript: effectiveTranscript,
          question: message,
          chatHistory,
          language: effectiveLanguage,
        },
      });

      if (response.success) {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: response.data.content,
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Failed to get chat response');
      }
    } catch (err) {
      setError('Failed to get chat response');
    } finally {
      setChatLoading(false);
    }
  };

  // Detect light/dark mode
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // The sidebar should be fixed-height only when expanded, authenticated, AND has content to display
  // Content exists if: transcript exists, or any summary exists, or chat messages exist
  const hasContent = transcript || Object.keys(summaries).some(key => !key.endsWith('_is_structured') && summaries[key as keyof typeof summaries]) || chatMessages.length > 0;
  const isFixedSize = isExpanded && isAuthenticated && authChecked && hasContent;

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: isDarkMode ? '#212121' : '#ffffff',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        height: isFixedSize ? '600px' : 'auto',
        maxHeight: '600px',
        width: `${sidebarWidth}px`,
        minWidth: '350px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
            }}
          >
            ✨
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: isDarkMode ? '#fff' : '#000',
              letterSpacing: '-0.01em',
            }}
          >
            Mintclip
          </h3>
        </div>
        <div
          style={{
            color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: '12px',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          ▼
        </div>
      </div>

      {/* Tabbed Content */}
      {isExpanded && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!authChecked ? (
            // Loading auth state
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ fontSize: '14px' }}>Loading...</div>
            </div>
          ) : !isAuthenticated ? (
            // Auth gate - user not authenticated
            <div
              style={{
                padding: '16px 12px',
                textAlign: 'center',
              }}
            >
              <button
                onClick={() => {
                  // Open the extension popup by clicking the extension icon
                  chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
                }}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.25)';
                }}
              >
                Sign In
              </button>
              <div
                style={{
                  fontSize: '11px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                  lineHeight: '1.4',
                }}
              >
                Please sign in to access transcripts, summaries, and chat features.
              </div>
            </div>
          ) : (
            // Authenticated - show tabs
            <>
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'transcript' && (
                  <TranscriptTab
                    transcript={transcript}
                    isLoading={transcriptLoading}
                    onFetchTranscript={handleFetchTranscript}
                    videoId={videoId}
                    currentLanguage={currentLanguage}
                    availableLanguages={availableLanguages}
                    onLanguageChange={handleLanguageChange}
                    onFetchLanguages={handleFetchLanguages}
                  />
                )}
                {activeTab === 'summary' && (
                  <SummaryTab
                    summary={summaries[currentFormat]}
                    isLoading={loadingFormat === currentFormat}
                    onGenerateSummary={handleGenerateSummary}
                    currentFormat={currentFormat}
                    onFormatChange={setCurrentFormat}
                    summaries={summaries}
                    videoTitle={videoTitle}
                    videoId={videoId}
                  />
                )}
                {activeTab === 'chat' && (
                  <ChatTab
                    messages={chatMessages}
                    isLoading={chatLoading}
                    onSendMessage={handleSendChatMessage}
                    suggestedQuestions={suggestedQuestions}
                    questionsLoading={questionsLoading}
                    onFetchSuggestedQuestions={handleFetchSuggestedQuestions}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <ErrorToast
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}
