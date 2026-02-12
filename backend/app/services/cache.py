"""
In-Memory Cache Service
Simple dict-based caching with TTL support for MVP
Will be replaced with Redis in production
"""

from datetime import datetime, timedelta
from typing import Optional, Any
import threading


class SimpleCache:
    """Thread-safe in-memory cache with TTL expiration"""

    def __init__(self):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key in self._cache:
                value, expiry = self._cache[key]
                if datetime.now() < expiry:
                    return value
                else:
                    # Expired, remove it
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int):
        """Set value in cache with TTL"""
        with self._lock:
            expiry = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = (value, expiry)

    def delete(self, key: str):
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear_expired(self):
        """Remove all expired entries (call periodically)"""
        now = datetime.now()
        with self._lock:
            expired_keys = [k for k, (_, exp) in self._cache.items() if now >= exp]
            for k in expired_keys:
                del self._cache[k]
        return len(expired_keys)

    def clear_all(self):
        """Clear entire cache"""
        with self._lock:
            self._cache.clear()

    def size(self) -> int:
        """Get number of items in cache"""
        with self._lock:
            return len(self._cache)


# Global cache instance
_cache_instance: Optional[SimpleCache] = None


def get_cache() -> SimpleCache:
    """Get or create global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SimpleCache()
    return _cache_instance


# Cache TTL constants (in seconds)
TTL_SUGGESTED_QUESTIONS = 86400  # 24 hours
TTL_SUMMARY = 604800  # 7 days
TTL_TRANSCRIPT = 2592000  # 30 days (transcripts never change)
TTL_BATCH_JOB = 86400  # 24 hours (batch job status)
TTL_CHAT_MESSAGE = 86400  # 24 hours (chat messages)


# Batch job status management functions
def set_job_status(job_id: str, status: dict, ttl: int = TTL_BATCH_JOB):
    """Store batch job status with 24-hour TTL.

    Args:
        job_id: Unique batch job identifier
        status: Job status dictionary with structure:
            {
                'job_id': str,
                'status': 'pending' | 'processing' | 'complete' | 'failed',
                'total': int,
                'completed': int,
                'failed': int,
                'results': [...]
            }
        ttl: Time-to-live in seconds (default: 24 hours)
    """
    cache = get_cache()
    cache.set(f"batch_job:{job_id}", status, ttl)


def get_job_status(job_id: str) -> Optional[dict]:
    """Retrieve batch job status.

    Args:
        job_id: Unique batch job identifier

    Returns:
        Job status dictionary if found and not expired, None otherwise
    """
    cache = get_cache()
    return cache.get(f"batch_job:{job_id}")


def update_job_progress(job_id: str, video_result: dict):
    """Update job progress after each video completes.

    Args:
        job_id: Unique batch job identifier
        video_result: Video processing result with structure:
            {
                'video_id': str,
                'title': str,
                'status': 'completed' | 'failed',
                'transcript': list (optional),
                'error': str (optional)
            }
    """
    cache = get_cache()
    job_status = cache.get(f"batch_job:{job_id}")

    if not job_status:
        return  # Job not found or expired

    # Update counters
    if video_result['status'] == 'completed':
        job_status['completed'] += 1
    elif video_result['status'] == 'failed':
        job_status['failed'] += 1

    # Add result to results list
    job_status['results'].append(video_result)

    # Update overall job status
    if job_status['completed'] + job_status['failed'] >= job_status['total']:
        # All videos processed
        if job_status['failed'] == 0:
            job_status['status'] = 'complete'
        elif job_status['completed'] == 0:
            job_status['status'] = 'failed'
        else:
            job_status['status'] = 'complete'  # Partial success still counts as complete
    elif job_status['status'] == 'pending':
        # First video started processing
        job_status['status'] = 'processing'

    # Save updated status
    cache.set(f"batch_job:{job_id}", job_status, TTL_BATCH_JOB)
