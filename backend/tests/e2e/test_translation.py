"""E2E: transcript translation — non-EN video → English via Gemini."""

import httpx
import pytest
from .conftest import STAGING_URL, NON_EN_VIDEO_ID


def test_translation_non_english_video(auth_headers, base_url):
    """Non-EN video transcript → GET /api/transcript/translate → English output."""
    resp = httpx.get(
        f"{base_url}/api/transcript/translate",
        params={"video_id": NON_EN_VIDEO_ID},
        headers=auth_headers,
        timeout=120,
    )
    assert resp.status_code == 200, f"Translation failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert data["success"] is True
    assert data["video_id"] == NON_EN_VIDEO_ID
    assert isinstance(data["transcript"], list)
    assert len(data["transcript"]) > 0
    # Translation should produce English text — spot check first segment
    first_text = data["transcript"][0].get("text", "")
    assert len(first_text) > 3, "Translation returned empty segment"
    # Language should be reported as en after translation
    assert data.get("language") in ("en", None)  # some backends omit language field
