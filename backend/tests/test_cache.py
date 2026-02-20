"""
test_cache.py - Tests for the cache service (SimpleCache + helpers)

Strategy:
- Tests exercise SimpleCache directly (no mocking needed).
- TTL expiry tested with time manipulation where possible.
- Singleton behavior and batch job helpers also covered.
"""

import time
import threading
import pytest

from app.services.cache import (
    SimpleCache,
    get_cache,
    TTL_SUGGESTED_QUESTIONS,
    TTL_SUMMARY,
    TTL_TRANSCRIPT,
    TTL_CHAT_MESSAGE,
    TTL_BATCH_JOB,
    set_job_status,
    get_job_status,
    update_job_progress,
)


# ── SimpleCache unit tests ────────────────────────────────────────────────────

class TestSimpleCache:
    def test_set_and_get_returns_value(self):
        cache = SimpleCache()
        cache.set("key1", {"data": 42}, ttl_seconds=60)
        assert cache.get("key1") == {"data": 42}

    def test_get_missing_key_returns_none(self):
        cache = SimpleCache()
        assert cache.get("nonexistent") is None

    def test_get_after_expiry_returns_none(self):
        cache = SimpleCache()
        cache.set("expiring_key", "value", ttl_seconds=1)
        assert cache.get("expiring_key") == "value"
        time.sleep(1.1)
        assert cache.get("expiring_key") is None

    def test_delete_removes_key(self):
        cache = SimpleCache()
        cache.set("to_delete", "value", ttl_seconds=60)
        cache.delete("to_delete")
        assert cache.get("to_delete") is None

    def test_delete_nonexistent_key_no_error(self):
        cache = SimpleCache()
        cache.delete("does_not_exist")  # Should not raise

    def test_clear_all_empties_cache(self):
        cache = SimpleCache()
        cache.set("k1", "v1", 60)
        cache.set("k2", "v2", 60)
        cache.clear_all()
        assert cache.size() == 0

    def test_size_returns_count(self):
        cache = SimpleCache()
        assert cache.size() == 0
        cache.set("k1", "v1", 60)
        cache.set("k2", "v2", 60)
        assert cache.size() == 2

    def test_clear_expired_removes_only_expired(self):
        cache = SimpleCache()
        cache.set("fresh", "value", ttl_seconds=60)
        cache.set("stale", "value", ttl_seconds=1)
        time.sleep(1.1)
        removed = cache.clear_expired()
        assert removed == 1
        assert cache.get("fresh") == "value"
        assert cache.get("stale") is None

    def test_overwrite_existing_key(self):
        cache = SimpleCache()
        cache.set("key", "old", 60)
        cache.set("key", "new", 60)
        assert cache.get("key") == "new"

    def test_stores_various_types(self):
        cache = SimpleCache()
        cache.set("list", [1, 2, 3], 60)
        cache.set("dict", {"a": 1}, 60)
        cache.set("int", 999, 60)
        cache.set("none", None, 60)  # None stored is different from key missing
        assert cache.get("list") == [1, 2, 3]
        assert cache.get("dict") == {"a": 1}
        assert cache.get("int") == 999

    def test_thread_safety_concurrent_writes(self):
        """Multiple threads writing simultaneously should not corrupt data."""
        cache = SimpleCache()
        errors = []

        def write_many(prefix):
            try:
                for i in range(50):
                    cache.set(f"{prefix}_{i}", i, 60)
                    cache.get(f"{prefix}_{i}")
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=write_many, args=(f"thread{t}",)) for t in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert errors == [], f"Thread safety errors: {errors}"
        assert cache.size() == 250  # 5 threads × 50 keys


# ── TTL Constants ─────────────────────────────────────────────────────────────

class TestTTLConstants:
    def test_suggested_questions_ttl_is_24h(self):
        assert TTL_SUGGESTED_QUESTIONS == 86400

    def test_summary_ttl_is_7_days(self):
        assert TTL_SUMMARY == 604800

    def test_transcript_ttl_is_30_days(self):
        assert TTL_TRANSCRIPT == 2592000

    def test_chat_message_ttl_is_24h(self):
        assert TTL_CHAT_MESSAGE == 86400

    def test_batch_job_ttl_is_24h(self):
        assert TTL_BATCH_JOB == 86400


# ── get_cache() factory ───────────────────────────────────────────────────────

class TestGetCacheFactory:
    def test_returns_simple_cache_without_redis_url(self):
        """No REDIS_URL env var → SimpleCache instance."""
        cache = get_cache()
        assert isinstance(cache, SimpleCache)

    def test_returns_same_instance_on_repeated_calls(self):
        """Singleton: two calls return same object."""
        cache1 = get_cache()
        cache2 = get_cache()
        assert cache1 is cache2

    def test_autouse_fixture_clears_cache_between_tests(self):
        """The reset_cache autouse fixture works — cache should be empty at test start."""
        cache = get_cache()
        assert cache.size() == 0


# ── Batch Job Helpers ─────────────────────────────────────────────────────────

class TestBatchJobHelpers:
    def test_set_and_get_job_status(self):
        job_id = "test-job-001"
        status = {
            "job_id": job_id,
            "status": "pending",
            "total": 3,
            "completed": 0,
            "failed": 0,
            "results": [],
        }
        set_job_status(job_id, status)
        retrieved = get_job_status(job_id)
        assert retrieved["job_id"] == job_id
        assert retrieved["status"] == "pending"

    def test_get_nonexistent_job_returns_none(self):
        assert get_job_status("nonexistent-job-xyz") is None

    def test_update_job_progress_increments_completed(self):
        job_id = "progress-job-001"
        set_job_status(job_id, {
            "job_id": job_id,
            "status": "pending",
            "total": 2,
            "completed": 0,
            "failed": 0,
            "results": [],
        })

        update_job_progress(job_id, {
            "video_id": "vid1",
            "title": "Test Video",
            "status": "completed",
            "transcript": [],
        })

        result = get_job_status(job_id)
        assert result["completed"] == 1
        assert result["status"] in ("processing", "complete")

    def test_update_job_progress_marks_complete_when_all_done(self):
        job_id = "complete-job-001"
        set_job_status(job_id, {
            "job_id": job_id,
            "status": "pending",
            "total": 1,
            "completed": 0,
            "failed": 0,
            "results": [],
        })

        update_job_progress(job_id, {
            "video_id": "vid1",
            "status": "completed",
            "title": "Done",
            "transcript": [],
        })

        result = get_job_status(job_id)
        assert result["status"] == "complete"

    def test_update_job_progress_on_expired_job_is_noop(self):
        """If job status has expired, update is silently ignored."""
        update_job_progress("ghost-job-999", {
            "video_id": "v1",
            "status": "completed",
            "title": "Ghost",
        })
        # No exception raised
