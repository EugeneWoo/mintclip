import React, { useState, useRef } from 'react';
import { getAuthToken } from '../utils/auth';
import { BACKEND_URL } from '../config';

interface BatchImportProps {
  onComplete: () => void;
}

type VideoProgress = 'idle' | 'processing' | 'done' | 'failed';

interface VideoResult {
  url: string;
  video_id?: string;
  title?: string;
  status: VideoProgress;
  error?: string;
}

const MAX_URLS = 5;

function isValidYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function isShortsUrl(url: string): boolean {
  return /youtube\.com\/shorts\//i.test(url);
}

function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) return { valid: false };
  if (isShortsUrl(url)) return { valid: false, error: 'Shorts not supported' };
  if (!isValidYouTubeUrl(url)) return { valid: false, error: 'Invalid YouTube URL' };
  return { valid: true };
}

function ThumbnailGrid({ results }: { results: VideoResult[] }): React.JSX.Element {
  const count = results.length;

  // Determine row layout: rows is an array of row sizes
  let rows: number[];
  if (count === 1) rows = [1];
  else if (count === 2) rows = [2];
  else if (count === 3) rows = [3];
  else if (count === 4) rows = [2, 2];
  else rows = [3, 2]; // 5 videos

  let itemIndex = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {rows.map((cols, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '6px',
          }}
        >
          {Array.from({ length: cols }, () => {
            const result = results[itemIndex++];
            if (!result) return null;
            const key = result.video_id ?? result.url;
            if (result.video_id) {
              return (
                <img
                  key={key}
                  src={`https://img.youtube.com/vi/${result.video_id}/mqdefault.jpg`}
                  alt={result.title ?? result.url}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    display: 'block',
                  }}
                />
              );
            }
            return (
              <div
                key={key}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  background: '#404040',
                  borderRadius: '8px',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BatchImport({ onComplete }: BatchImportProps): React.JSX.Element {
  const [urlInputs, setUrlInputs] = useState<string[]>(Array(MAX_URLS).fill(''));
  const [urlErrors, setUrlErrors] = useState<(string | null)[]>(Array(MAX_URLS).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobResults, setJobResults] = useState<VideoResult[] | null>(null);
  const [progressLabel, setProgressLabel] = useState('');
  const [groupTitle, setGroupTitle] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUrlChange = (index: number, value: string) => {
    const next = [...urlInputs];
    next[index] = value;
    setUrlInputs(next);

    const nextErrors = [...urlErrors];
    if (value.trim()) {
      const { valid, error } = validateUrl(value);
      nextErrors[index] = valid ? null : (error || 'Invalid URL');
    } else {
      nextErrors[index] = null;
    }
    setUrlErrors(nextErrors);
  };

  // Compute duplicate URL numbers (1-based) across filled, format-valid fields
  const duplicateNumbers: number[] = (() => {
    const seen = new Map<string, number>();
    const dupes: number[] = [];
    urlInputs.forEach((u, i) => {
      const trimmed = u.trim();
      if (!trimmed || urlErrors[i]) return;
      const normalized = trimmed.toLowerCase();
      if (seen.has(normalized)) {
        if (!dupes.includes(seen.get(normalized)! + 1)) dupes.push(seen.get(normalized)! + 1);
        dupes.push(i + 1);
      } else {
        seen.set(normalized, i);
      }
    });
    return [...new Set(dupes)].sort((a, b) => a - b);
  })();

  const validUrls = urlInputs.filter((u, i) => {
    const trimmed = u.trim();
    if (!trimmed || urlErrors[i]) return false;
    // exclude duplicates
    return !duplicateNumbers.includes(i + 1);
  });
  const hasAnyInput = urlInputs.some(u => u.trim());

  const handleClear = () => {
    setUrlInputs(Array(MAX_URLS).fill(''));
    setUrlErrors(Array(MAX_URLS).fill(null));
    setJobResults(null);
    setProgressLabel('');
    setGroupTitle(null);
    if (pollRef.current) clearTimeout(pollRef.current);
  };

  const handleSubmit = async () => {
    if (validUrls.length === 0) return;
    setIsSubmitting(true);
    setProgressLabel('Starting...');

    const initialResults: VideoResult[] = validUrls.map(u => ({
      url: u,
      status: 'processing',
    }));
    setJobResults(initialResults);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${BACKEND_URL}/api/batch/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ urls: validUrls }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to start batch');
      }

      const { job_id, total: jobTotal } = await res.json() as { job_id: string; total: number };
      setProgressLabel(`Processing 0 / ${jobTotal}...`);
      pollForStatus(job_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setProgressLabel(`Error: ${message}`);
      setIsSubmitting(false);
    }
  };

  const pollForStatus = (job_id: string) => {
    const poll = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${BACKEND_URL}/api/batch/status/${job_id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json() as {
          status: string;
          completed: number;
          failed: number;
          total: number;
          group_title?: string;
          results?: Array<{
            url: string;
            video_id?: string;
            title?: string;
            status: string;
            error?: string;
          }>;
        };

        const updatedResults: VideoResult[] = validUrls.map(url => {
          const found = data.results?.find((r) => r.url === url);
          if (!found) return { url, status: 'processing' as VideoProgress };
          return {
            url,
            video_id: found.video_id,
            title: found.title,
            status: found.status === 'completed' ? 'done' : 'failed',
            error: found.error,
          };
        });

        setJobResults(updatedResults);
        setProgressLabel(`Processing ${data.completed + data.failed} / ${data.total}...`);

        if (data.status === 'complete') {
          setGroupTitle(data.group_title || null);
          setIsSubmitting(false);
          setProgressLabel(`Done — ${data.completed} processed, ${data.failed} failed`);
          if (data.completed > 0) {
            setTimeout(() => onComplete(), 800);
          }
        } else {
          pollRef.current = setTimeout(poll, 2000);
        }
      } catch {
        pollRef.current = setTimeout(poll, 2000);
      }
    };

    pollRef.current = setTimeout(poll, 2000);
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.75rem 1rem',
    background: '#262626',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {!jobResults ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {Array.from({ length: MAX_URLS }, (_, i) => (
              <div key={i}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', minWidth: '44px' }}>
                    URL {i + 1}
                  </span>
                  <input
                    type="text"
                    value={urlInputs[i]}
                    onChange={(e) => handleUrlChange(i, e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={isSubmitting}
                    style={{
                      ...inputStyle,
                      borderColor: urlErrors[i]
                        ? '#ef4444'
                        : urlInputs[i].trim() && !urlErrors[i]
                        ? 'rgba(34, 197, 94, 0.5)'
                        : 'rgba(255, 255, 255, 0.1)',
                    }}
                    onFocus={(e) => {
                      if (!urlErrors[i]) e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                    }}
                    onBlur={(e) => {
                      if (!urlErrors[i] && !urlInputs[i].trim()) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  />
                  <span style={{ width: '20px', textAlign: 'center', fontSize: '14px' }}>
                    {urlInputs[i].trim()
                      ? urlErrors[i]
                        ? '✗'
                        : '✓'
                      : ''}
                  </span>
                </div>
                {urlErrors[i] && (
                  <p style={{
                    margin: '4px 0 0 54px',
                    color: '#ef4444',
                    fontSize: '12px',
                  }}>
                    {urlErrors[i]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {duplicateNumbers.length > 0 && (
            <p style={{
              marginTop: '0.875rem',
              color: '#f97316',
              fontSize: '0.875rem',
              textAlign: 'left',
            }}>
              {`URL(s) ${duplicateNumbers.join(', ')} are duplicated. Please re-enter.`}
            </p>
          )}

          <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {hasAnyInput && (
              <button
                onClick={handleClear}
                disabled={isSubmitting}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={validUrls.length === 0 || isSubmitting}
              style={{
                padding: '0.875rem 1.75rem',
                background: validUrls.length === 0 ? '#404040' : '#22c55e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: validUrls.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (validUrls.length > 0) e.currentTarget.style.background = '#16a34a';
              }}
              onMouseLeave={(e) => {
                if (validUrls.length > 0) e.currentTarget.style.background = '#22c55e';
              }}
            >
              {`Process ${validUrls.length > 0 ? validUrls.length : ''} Video${validUrls.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {groupTitle && (
            <p style={{
              margin: '0 0 0.25rem',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
            }}>
              {groupTitle}
            </p>
          )}

          <ThumbnailGrid results={jobResults} />

          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {jobResults.map((r, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: '#262626',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ fontSize: '16px', minWidth: '20px' }}>
                  {r.status === 'processing' && '⠋'}
                  {r.status === 'done' && '✓'}
                  {r.status === 'failed' && '✗'}
                </span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '14px',
                    color: r.status === 'failed' ? '#ef4444' : '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {r.title || r.url}
                  </div>
                  {r.error && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>
                      {r.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {progressLabel && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
                {progressLabel}
              </p>
            )}
            {!isSubmitting && (
              <button
                onClick={handleClear}
                style={{
                  marginLeft: 'auto',
                  padding: '0.5rem 1.25rem',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
