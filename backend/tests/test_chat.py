"""
test_chat.py - Tests for /api/chat/* endpoints (suggested questions + messages)

Strategy:
- Patch app.routes.chat.get_gemini_client per-test.
- Cache (SimpleCache) reset between tests by autouse fixture.
"""

import pytest
from unittest.mock import patch

from tests.conftest import make_gemini_mock, VIDEO_ID

TRANSCRIPT_TEXT = "Hello and welcome. Today we discuss Python. Let us begin."


# ── Suggested Questions ───────────────────────────────────────────────────────

class TestSuggestedQuestions:
    def test_generates_three_questions(self, client):
        """Returns 3 contextual questions."""
        mock_gemini = make_gemini_mock(questions=[
            "What is Python?",
            "Who is the speaker?",
            "What are the key takeaways?",
        ])
        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/suggested-questions", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["questions"]) == 3

    def test_questions_cached_on_second_call(self, client):
        """Second call for same video returns cached=True without calling Gemini again."""
        call_count = 0

        def mock_gen_questions(transcript, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            return ["Q1?", "Q2?", "Q3?"]

        mock_gemini = make_gemini_mock()
        mock_gemini.generate_questions = mock_gen_questions

        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp1 = client.post("/api/chat/suggested-questions", json={
                "video_id": "cache_test_vid",
                "transcript": TRANSCRIPT_TEXT,
            })
            resp2 = client.post("/api/chat/suggested-questions", json={
                "video_id": "cache_test_vid",
                "transcript": TRANSCRIPT_TEXT,
            })

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp2.json().get("cached") is True
        assert call_count == 1

    def test_fallback_questions_on_gemini_failure(self, client):
        """When Gemini returns None, fallback questions are returned."""
        mock_gemini = make_gemini_mock()
        mock_gemini.generate_questions = lambda *a, **kw: None

        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/suggested-questions", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["questions"]) > 0  # Fallback questions still returned

    def test_empty_transcript_still_returns_questions(self, client):
        """Even with empty transcript, returns fallback or generated questions."""
        mock_gemini = make_gemini_mock()
        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/suggested-questions", json={
                "video_id": VIDEO_ID,
                "transcript": "",
            })

        assert resp.status_code == 200
        data = resp.json()
        assert "questions" in data


# ── Chat Message ──────────────────────────────────────────────────────────────

class TestChatMessage:
    def test_empty_question_returns_error(self, client):
        """Empty question string returns 400 or validation error."""
        resp = client.post("/api/chat/message", json={
            "video_id": VIDEO_ID,
            "transcript": TRANSCRIPT_TEXT,
            "question": "",
        })
        assert resp.status_code in (400, 422) or resp.json().get("success") is False

    def test_successful_chat_response(self, client):
        """Returns AI-generated chat response."""
        mock_gemini = make_gemini_mock(chat_response="Python is a programming language.")
        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/message", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "question": "What is Python?",
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["response"] == "Python is a programming language."

    def test_chat_response_cached_on_second_identical_question(self, client):
        """Same video+question returns cached=True on second call."""
        call_count = 0

        def mock_chat(transcript, question, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            return "Cached answer."

        mock_gemini = make_gemini_mock()
        mock_gemini.generate_chat_response = mock_chat

        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp1 = client.post("/api/chat/message", json={
                "video_id": "chat_cache_vid",
                "transcript": TRANSCRIPT_TEXT,
                "question": "What is Python?",
            })
            resp2 = client.post("/api/chat/message", json={
                "video_id": "chat_cache_vid",
                "transcript": TRANSCRIPT_TEXT,
                "question": "What is Python?",
            })

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp2.json().get("cached") is True
        assert call_count == 1

    def test_different_questions_have_separate_cache_entries(self, client):
        """Different questions for the same video don't share cache entries."""
        call_count = 0

        def mock_chat(transcript, question, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            return f"Answer to: {question}"

        mock_gemini = make_gemini_mock()
        mock_gemini.generate_chat_response = mock_chat

        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            client.post("/api/chat/message", json={
                "video_id": "diff_q_vid",
                "transcript": TRANSCRIPT_TEXT,
                "question": "What is Python?",
            })
            client.post("/api/chat/message", json={
                "video_id": "diff_q_vid",
                "transcript": TRANSCRIPT_TEXT,
                "question": "Who invented Python?",
            })

        assert call_count == 2  # Both questions called Gemini

    def test_gemini_unavailable_returns_error(self, client):
        """When Gemini returns None, chat endpoint returns error."""
        mock_gemini = make_gemini_mock()
        mock_gemini.generate_chat_response = lambda *a, **kw: None

        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/message", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "question": "What is this about?",
            })

        data = resp.json()
        assert data.get("success") is False or resp.status_code >= 400

    def test_chat_with_history(self, client):
        """Chat message accepts optional chat_history without error."""
        mock_gemini = make_gemini_mock(chat_response="Answer with context.")
        with patch("app.routes.chat.get_gemini_client", return_value=mock_gemini):
            resp = client.post("/api/chat/message", json={
                "video_id": VIDEO_ID,
                "transcript": TRANSCRIPT_TEXT,
                "question": "Tell me more",
                "chat_history": [
                    {"role": "user", "content": "What is Python?"},
                    {"role": "assistant", "content": "Python is a language."},
                ],
            })

        assert resp.status_code == 200
