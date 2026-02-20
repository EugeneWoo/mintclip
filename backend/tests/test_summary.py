"""
test_summary.py - Tests for /api/summary/generate

Strategy:
- Patch app.routes.summary.get_gemini_client per-test.
- Cache (SimpleCache) is reset between tests by autouse fixture.
"""

import json
import pytest
from unittest.mock import patch

from tests.conftest import make_gemini_mock, MOCK_TRANSCRIPT_SEGMENTS, VIDEO_ID


TRANSCRIPT_TEXT = "Hello and welcome. Today we discuss Python. Let us begin."
STRUCTURED_TRANSCRIPT = json.dumps(MOCK_TRANSCRIPT_SEGMENTS)


class TestSummaryValidation:
    def test_invalid_format_returns_400(self, client):
        resp = client.post("/api/summary/generate", json={
            "video_id": VIDEO_ID,
            "transcript": TRANSCRIPT_TEXT,
            "format": "invalid_format",
        })
        assert resp.status_code == 400

    def test_empty_transcript_returns_error(self, client):
        mock_gemini = make_gemini_mock(summary=None)
        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/summary/generate", json={
                "video_id": VIDEO_ID,
                "transcript": "",
                "format": "short",
            })
        # Empty transcript should fail at validation or produce error response
        data = resp.json()
        assert resp.status_code in (400, 422) or data.get("success") is False


class TestSummaryFormats:
    def test_short_format_returns_summary(self, client):
        mock_gemini = make_gemini_mock(summary="Short summary content.")
        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/summary/generate", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["summary"] == "Short summary content."
        assert data["format"] == "short"

    def test_topic_format_returns_summary(self, client):
        mock_gemini = make_gemini_mock(summary="Topic summary content.")
        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/summary/generate", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "format": "topic",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["format"] == "topic"

    def test_qa_format_returns_summary(self, client):
        mock_gemini = make_gemini_mock(summary="Q&A summary content.")
        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/summary/generate", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "format": "qa",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["format"] == "qa"

    def test_gemini_unavailable_returns_error_response(self, client):
        """When Gemini returns None, summary endpoint returns error."""
        mock_gemini = make_gemini_mock(summary=None)
        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/summary/generate", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })
        data = resp.json()
        # Should either return 200 with error or non-200 status
        assert data.get("success") is False or resp.status_code >= 400


class TestSummaryCaching:
    def test_second_call_returns_cached_true(self, client):
        """Second request for same video+format returns cached=True."""
        call_count = 0

        def mock_generate_summary(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return "Generated summary."

        mock_gemini = make_gemini_mock()
        mock_gemini.generate_summary = mock_generate_summary

        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            resp1 = client.post("/api/summary/generate", json={
                "video_id": "cache_test_video",
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })
            resp2 = client.post("/api/summary/generate", json={
                "video_id": "cache_test_video",
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp2.json().get("cached") is True
        # Gemini was only called once
        assert call_count == 1

    def test_different_formats_have_independent_cache_keys(self, client):
        """short and topic formats are cached independently."""
        call_count = {"short": 0, "topic": 0}

        def mock_generate(*args, **kwargs):
            fmt = kwargs.get("format", args[1] if len(args) > 1 else "short")
            call_count[fmt] = call_count.get(fmt, 0) + 1
            return f"{fmt} summary content."

        mock_gemini = make_gemini_mock()
        mock_gemini.generate_summary = mock_generate

        with patch("app.routes.summary.get_gemini_client", return_value=mock_gemini):
            client.post("/api/summary/generate", json={
                "video_id": "format_test",
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })
            client.post("/api/summary/generate", json={
                "video_id": "format_test",
                "transcript": TRANSCRIPT_TEXT,
                "format": "topic",
            })
            # Second call for each format — should hit cache
            client.post("/api/summary/generate", json={
                "video_id": "format_test",
                "transcript": TRANSCRIPT_TEXT,
                "format": "short",
            })

        # short was called once (second call should be cached)
        assert call_count.get("short", 0) == 1
        # topic was called once
        assert call_count.get("topic", 0) == 1
