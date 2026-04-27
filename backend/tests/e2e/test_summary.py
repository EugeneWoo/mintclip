"""E2E: summary generation — all 3 formats."""

import json
import httpx
import pytest
from .conftest import STAGING_URL, EN_VIDEO_ID


def _get_transcript_text(base_url: str, auth_headers: dict) -> str:
    """Helper: fetch full_text string for EN_VIDEO_ID (cached after first call)."""
    resp = httpx.post(
        f"{base_url}/api/transcript/extract",
        json={"video_url": f"https://www.youtube.com/watch?v={EN_VIDEO_ID}"},
        headers=auth_headers,
        timeout=60,
    )
    assert resp.status_code == 200, f"Extract failed: {resp.status_code} {resp.text}"
    return resp.json()["full_text"]


@pytest.mark.parametrize("fmt", ["short", "topic", "qa"])
def test_summary_all_formats(auth_headers, base_url, fmt):
    """Real Gemini call for each summary format — returns non-empty string."""
    transcript_text = _get_transcript_text(base_url, auth_headers)
    resp = httpx.post(
        f"{base_url}/api/summary/generate",
        json={
            "video_id": EN_VIDEO_ID,
            "transcript": transcript_text,
            "format": fmt,
        },
        headers=auth_headers,
        timeout=90,
    )
    assert resp.status_code == 200, f"Summary {fmt} failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert data["success"] is True, f"Summary not successful: {data}"
    assert data["format"] == fmt
    summary = data.get("summary") or data.get("content", "")
    assert isinstance(summary, str)
    assert len(summary) > 20, f"Summary too short for format {fmt}: {repr(summary)}"


def test_summary_cached_on_second_call(auth_headers, base_url):
    """Second identical summary request returns cached=True."""
    transcript_text = _get_transcript_text(base_url, auth_headers)
    payload = {
        "video_id": EN_VIDEO_ID,
        "transcript": transcript_text,
        "format": "short",
    }
    httpx.post(f"{base_url}/api/summary/generate", json=payload, headers=auth_headers, timeout=90)
    resp = httpx.post(
        f"{base_url}/api/summary/generate",
        json=payload,
        headers=auth_headers,
        timeout=30,
    )
    assert resp.status_code == 200
    assert resp.json().get("cached") is True
