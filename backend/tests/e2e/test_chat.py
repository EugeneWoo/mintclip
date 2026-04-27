"""E2E: chat — real Pinecone retrieval + Gemini response."""

import httpx
import pytest
from .conftest import STAGING_URL, EN_VIDEO_ID


def _get_full_text(base_url: str, auth_headers: dict) -> str:
    resp = httpx.post(
        f"{base_url}/api/transcript/extract",
        json={"video_url": f"https://www.youtube.com/watch?v={EN_VIDEO_ID}"},
        headers=auth_headers,
        timeout=60,
    )
    assert resp.status_code == 200
    return resp.json()["full_text"]


def test_chat_message_returns_answer(auth_headers, base_url):
    """Real Gemini chat response for a question about the video."""
    full_text = _get_full_text(base_url, auth_headers)
    resp = httpx.post(
        f"{base_url}/api/chat/message",
        json={
            "video_id": EN_VIDEO_ID,
            "transcript": full_text,
            "question": "What is this video about?",
            "chat_history": [],
            "language": "en",
        },
        headers=auth_headers,
        timeout=90,
    )
    assert resp.status_code == 200, f"Chat failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert data["success"] is True, f"Chat not successful: {data}"
    response_text = data.get("response", "")
    assert isinstance(response_text, str)
    assert len(response_text) > 10, f"Chat response too short: {repr(response_text)}"


def test_chat_with_history(auth_headers, base_url):
    """Chat with prior turn in history — response still returns."""
    full_text = _get_full_text(base_url, auth_headers)
    resp = httpx.post(
        f"{base_url}/api/chat/message",
        json={
            "video_id": EN_VIDEO_ID,
            "transcript": full_text,
            "question": "Tell me more.",
            "chat_history": [
                {"role": "user", "content": "What is this video about?"},
                {"role": "assistant", "content": "It is about a zoo."},
            ],
            "language": "en",
        },
        headers=auth_headers,
        timeout=90,
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_suggested_questions(auth_headers, base_url):
    """Suggested questions endpoint returns 3 items."""
    full_text = _get_full_text(base_url, auth_headers)
    resp = httpx.post(
        f"{base_url}/api/chat/suggested-questions",
        json={"video_id": EN_VIDEO_ID, "transcript": full_text},
        headers=auth_headers,
        timeout=60,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["questions"], list)
    assert len(data["questions"]) == 3
