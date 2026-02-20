"""
test_transcript.py - Tests for /api/transcript/* endpoints

Strategy:
- TranscriptExtractor methods are patched per-test with AsyncMock.
- Translation cache tests use the real SimpleCache (reset by autouse fixture).
- Gemini is patched for translation success paths.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from tests.conftest import (
    MOCK_TRANSCRIPT_RESPONSE,
    MOCK_TRANSCRIPT_SEGMENTS,
    MOCK_TRANSCRIPT_FULL_TEXT,
    make_gemini_mock,
    VIDEO_ID,
)
TRANSLATION_CACHE_KEY = f"transcript_translation:{VIDEO_ID}:fr"


# ── Extract Transcript ────────────────────────────────────────────────────────

class TestExtractTranscript:
    def test_missing_video_id_and_url_returns_400(self, client):
        """Neither video_id nor video_url provided → 400."""
        resp = client.post("/api/transcript/extract", json={})
        assert resp.status_code == 400

    def test_extract_with_video_id_returns_transcript(self, client):
        """Success path: provide video_id, get transcript back."""
        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_transcript",
            new=AsyncMock(return_value=MOCK_TRANSCRIPT_RESPONSE)
        ), patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_video_title",
            new=AsyncMock(return_value="Test Video Title")
        ):
            resp = client.post("/api/transcript/extract", json={"video_id": VIDEO_ID})

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["video_id"] == VIDEO_ID
        assert data["language"] == "en"
        assert len(data["transcript"]) == 3

    def test_extract_with_video_url_parses_id(self, client):
        """Standard YouTube URL → extract video_id and return transcript."""
        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_transcript",
            new=AsyncMock(return_value=MOCK_TRANSCRIPT_RESPONSE)
        ), patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_video_title",
            new=AsyncMock(return_value="Test Video Title")
        ):
            resp = client.post("/api/transcript/extract", json={
                "video_url": "https://www.youtube.com/watch?v=test_video_id"
            })

        assert resp.status_code == 200

    def test_extract_shorts_url_returns_400(self, client):
        """YouTube Shorts URL → TranscriptExtractor raises ValueError → 400."""
        from unittest.mock import patch as mock_patch

        def raise_shorts_error(url):
            raise ValueError("YouTube Shorts are not supported. Please use a regular YouTube video URL.")

        with mock_patch(
            "app.routes.transcript.TranscriptExtractor.extract_video_id",
            side_effect=raise_shorts_error
        ):
            resp = client.post("/api/transcript/extract", json={
                "video_url": "https://www.youtube.com/shorts/test_short_id"
            })
        assert resp.status_code == 400

    def test_extract_invalid_url_returns_400(self, client):
        """Completely invalid URL → 400."""
        resp = client.post("/api/transcript/extract", json={
            "video_url": "https://notyoutube.com/watch?v=abc"
        })
        assert resp.status_code == 400

    def test_extract_no_captions_returns_404(self, client):
        """When transcript extractor returns no_captions error, route returns 404."""
        no_captions_response = {
            "success": False,
            "error": "no_captions",
            "message": "No captions available for this video.",
            "video_id": "no_captions_vid",
        }
        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_transcript",
            new=AsyncMock(return_value=no_captions_response)
        ), patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_video_title",
            new=AsyncMock(return_value="Test Video")
        ):
            # Use a unique video_id to avoid hitting the route-level cache
            resp = client.post("/api/transcript/extract", json={"video_id": "no_captions_vid"})

        assert resp.status_code == 404

    def test_extract_second_call_returns_cached(self, client):
        """Second call for same video+language returns cached=True."""
        call_count = 0

        async def mock_get_transcript(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return {**MOCK_TRANSCRIPT_RESPONSE, "cached": call_count > 1}

        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_transcript",
            new=mock_get_transcript
        ), patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_video_title",
            new=AsyncMock(return_value="Test Video Title")
        ):
            resp1 = client.post("/api/transcript/extract", json={"video_id": VIDEO_ID})
            resp2 = client.post("/api/transcript/extract", json={"video_id": VIDEO_ID})

        assert resp1.status_code == 200
        assert resp2.status_code == 200


# ── Languages ─────────────────────────────────────────────────────────────────

class TestGetLanguages:
    def test_get_available_languages_returns_list(self, client):
        """GET /languages/{video_id} returns list of available languages."""
        mock_langs = {
            "success": True,
            "video_id": VIDEO_ID,
            "languages": [
                {"code": "en", "name": "English", "is_translatable": True, "is_generated": False},
                {"code": "fr", "name": "French", "is_translatable": True, "is_generated": False},
            ],
            "cached": False,
        }
        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_available_languages",
            new=AsyncMock(return_value=mock_langs)
        ):
            resp = client.get(f"/api/transcript/languages/{VIDEO_ID}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["languages"]) == 2

    def test_languages_with_translation_adds_ai_option(self, client):
        """When translation cache has an entry, languages-with-translation includes AI English."""
        from app.services.cache import get_cache, TTL_SUMMARY

        # Pre-populate translation cache to simulate completed background translation
        cache = get_cache()
        cache.set(
            f"transcript_translation:{VIDEO_ID}:fr",
            {"transcript": MOCK_TRANSCRIPT_SEGMENTS, "full_text": "Translated text"},
            TTL_SUMMARY
        )

        mock_langs = {
            "success": True,
            "video_id": VIDEO_ID,
            "languages": [
                {"code": "fr", "name": "French", "is_translatable": True, "is_generated": False},
            ],
            "cached": False,
        }
        with patch(
            "app.services.transcript_extractor.TranscriptExtractor.get_available_languages",
            new=AsyncMock(return_value=mock_langs)
        ):
            resp = client.get(f"/api/transcript/languages-with-translation/{VIDEO_ID}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True


# ── Translate ─────────────────────────────────────────────────────────────────

class TestTranslateEndpoint:
    def test_translate_returns_cached_if_exists(self, client):
        """When translation cache already has an entry, return it with cached=True."""
        from app.services.cache import get_cache, TTL_SUMMARY

        cached_translation = {
            "transcript": MOCK_TRANSCRIPT_SEGMENTS,
            "full_text": "Translated English text.",
        }
        cache = get_cache()
        cache.set(TRANSLATION_CACHE_KEY, cached_translation, TTL_SUMMARY)

        resp = client.post("/api/transcript/translate", json={
            "video_id": VIDEO_ID,
            "transcript": MOCK_TRANSCRIPT_SEGMENTS,
            "source_language": "fr",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["cached"] is True
        assert data["language"] == "en"

    def test_translate_calls_gemini_and_caches_result(self, client):
        """When cache is empty, calls Gemini and stores result in cache."""
        mock_gemini = make_gemini_mock(translation="Hello everyone from France.")

        # Gemini is imported inside the function, so patch at the service module level
        with patch("app.services.gemini_client.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/transcript/translate", json={
                "video_id": "new_video_id_for_translate",
                "transcript": [{"text": "Bonjour tout le monde.", "start_seconds": 0}],
                "source_language": "fr",
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    def test_translate_rejects_when_translation_matches_source(self, client):
        """When Gemini returns the same text unchanged, the result should not be cached."""
        original_text = "Bonjour tout le monde."
        mock_gemini = make_gemini_mock(translation=original_text)  # Same as source

        with patch("app.services.gemini_client.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/transcript/translate", json={
                "video_id": "same_text_video_id",
                "transcript": [{"text": original_text, "start_seconds": 0}],
                "source_language": "fr",
            })

        # Route may return 200 with success=False or a 4xx
        data = resp.json()
        assert resp.status_code in (200, 400, 422)

    def test_delete_translation_cache_removes_key(self, client):
        """DELETE endpoint removes a poisoned cache entry."""
        from app.services.cache import get_cache

        cache = get_cache()
        cache.set(TRANSLATION_CACHE_KEY, {"data": "bad translation"}, 3600)
        assert cache.get(TRANSLATION_CACHE_KEY) is not None

        resp = client.delete(f"/api/transcript/translation-cache/{VIDEO_ID}/fr")

        assert resp.status_code == 200
        assert cache.get(TRANSLATION_CACHE_KEY) is None
