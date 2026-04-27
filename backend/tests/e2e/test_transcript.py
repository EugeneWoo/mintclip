"""E2E: transcript extraction against real staging backend."""

import httpx
import pytest
from .conftest import STAGING_URL, EN_VIDEO_ID


def test_transcript_extract_real_video(auth_headers, base_url):
    """Single English video → real YouTube fetch → valid transcript structure."""
    resp = httpx.post(
        f"{base_url}/api/transcript/extract",
        json={"url": f"https://www.youtube.com/watch?v={EN_VIDEO_ID}"},
        headers=auth_headers,
        timeout=60,
    )
    assert resp.status_code == 200, f"Extract failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert data["success"] is True
    assert data["video_id"] == EN_VIDEO_ID
    assert data["language"] == "en"
    assert isinstance(data["transcript"], list)
    assert len(data["transcript"]) > 0
    assert isinstance(data["full_text"], str)
    assert len(data["full_text"]) > 10

    seg = data["transcript"][0]
    assert "text" in seg
    assert "start_seconds" in seg
    assert "timestamp" in seg


def test_transcript_cached_on_second_call(auth_headers, base_url):
    """Second call for same video returns cached=True."""
    payload = {"url": f"https://www.youtube.com/watch?v={EN_VIDEO_ID}"}
    # First call (may or may not be cached depending on prior test)
    httpx.post(f"{base_url}/api/transcript/extract", json=payload, headers=auth_headers, timeout=60)
    # Second call must be cached
    resp = httpx.post(
        f"{base_url}/api/transcript/extract",
        json=payload,
        headers=auth_headers,
        timeout=30,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cached"] is True
