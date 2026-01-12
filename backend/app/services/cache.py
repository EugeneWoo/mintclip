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
