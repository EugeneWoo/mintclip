"""E2E: transcript translation — non-EN video → English via Gemini."""

import httpx
import pytest
from .conftest import STAGING_URL, NON_EN_VIDEO_ID


def test_translation_non_english_video(auth_headers, base_url):
    """Non-EN video → extract native transcript → POST /translate → English output."""
    # Step 1: extract native transcript
    extract_resp = httpx.post(
        f"{base_url}/api/transcript/extract",
        json={"video_url": f"https://www.youtube.com/watch?v={NON_EN_VIDEO_ID}"},
        headers=auth_headers,
        timeout=60,
    )
    assert extract_resp.status_code == 200, f"Extract failed: {extract_resp.status_code} {extract_resp.text}"
    extract_data = extract_resp.json()
    source_language = extract_data.get("language", "ko")
    transcript_segments = extract_data["transcript"]

    if source_language == "en":
        pytest.skip("Video returned English transcript — no translation needed")

    # Step 2: translate to English
    resp = httpx.post(
        f"{base_url}/api/transcript/translate",
        json={
            "video_id": NON_EN_VIDEO_ID,
            "transcript": transcript_segments,
            "source_language": source_language,
        },
        headers=auth_headers,
        timeout=120,
    )
    assert resp.status_code == 200, f"Translation failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert data["success"] is True
    assert data["video_id"] == NON_EN_VIDEO_ID
    assert isinstance(data["transcript"], list)
    assert len(data["transcript"]) > 0
    first_text = data["transcript"][0].get("text", "")
    assert len(first_text) > 3, "Translation returned empty segment"
