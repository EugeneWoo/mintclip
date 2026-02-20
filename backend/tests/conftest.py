"""
conftest.py - Shared pytest fixtures for Mintclip backend tests

Mocking strategy:
- Supabase: Disabled via empty env vars (is_supabase_available() returns False at module load).
  For tests needing Supabase success paths, patch app.routes.<module>.get_supabase_admin
  and app.services.supabase_client.is_supabase_available with mocker.patch().
- Gemini: GEMINI_API_KEY not set → GeminiClient.model is None → all methods return None.
  For tests needing Gemini output, patch app.routes.<module>.get_gemini_client.
- Redis: No REDIS_URL → SimpleCache used automatically. Zero infrastructure needed.
- JWT: Real crypto — tokens signed with JWT_SECRET env var. No mocking needed for auth.
"""

import os

# ── Env setup BEFORE any app imports ────────────────────────────────────────
# This ensures supabase_client.py initializes with SUPABASE_AVAILABLE=False
# and cache.py uses SimpleCache (no REDIS_URL).
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-ci-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "1")
os.environ.setdefault("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30")
os.environ.setdefault("LOG_LEVEL", "WARNING")

# Set external service credentials to empty strings BEFORE any module import.
# dotenv.load_dotenv() (called inside supabase_client.py, auth_service.py, etc.)
# does NOT override already-set env vars — so these empty values stick,
# ensuring SUPABASE_AVAILABLE=False, GeminiClient.model=None, SimpleCache used.
for _key in ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
             "GEMINI_API_KEY", "REDIS_URL", "PINECONE_API_KEY"]:
    os.environ[_key] = ""

# ── Now import app (module-level code runs here) ─────────────────────────────
import pytest
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.cache import get_cache, _cache_instance, SimpleCache


# ── Core test client ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient — wraps ASGI app, no real HTTP."""
    with TestClient(app) as c:
        yield c


# ── Cache isolation ───────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_cache():
    """Clear the in-memory SimpleCache before and after each test."""
    cache = get_cache()
    if hasattr(cache, "clear_all"):
        cache.clear_all()
    yield
    if hasattr(cache, "clear_all"):
        cache.clear_all()


# ── JWT helpers ───────────────────────────────────────────────────────────────

JWT_SECRET = "test-jwt-secret-for-ci-only"
JWT_ALGORITHM = "HS256"

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_USER_EMAIL = "testuser@example.com"


def _make_access_token(
    user_id: str = TEST_USER_ID,
    email: str = TEST_USER_EMAIL,
    expires_delta: timedelta = timedelta(hours=1),
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _make_refresh_token(
    user_id: str = TEST_USER_ID,
    email: str = TEST_USER_EMAIL,
    expires_delta: timedelta = timedelta(days=30),
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "refresh",
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def access_token() -> str:
    return _make_access_token()


@pytest.fixture
def expired_access_token() -> str:
    return _make_access_token(expires_delta=timedelta(seconds=-1))


@pytest.fixture
def refresh_token() -> str:
    return _make_refresh_token()


@pytest.fixture
def expired_refresh_token() -> str:
    return _make_refresh_token(expires_delta=timedelta(seconds=-1))


@pytest.fixture
def auth_headers(access_token) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


# ── Supabase mock factory ─────────────────────────────────────────────────────

def make_supabase_mock(
    table_data: list = None,
    single_data: dict = None,
    count: int = None,
    rpc_data=None,
    upsert_data: list = None,
    delete_data: list = None,
):
    """
    Build a MagicMock mimicking the Supabase PostgREST chained query builder.
    Usage:
        mock_sb = make_supabase_mock(table_data=[{"id": "abc", ...}])
        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)
        mocker.patch("app.services.supabase_client.is_supabase_available", return_value=True)
    """
    execute_result = MagicMock()
    execute_result.data = table_data if table_data is not None else []
    execute_result.count = count if count is not None else (len(table_data) if table_data else 0)

    single_result = MagicMock()
    single_result.data = single_data

    upsert_result = MagicMock()
    upsert_result.data = upsert_data if upsert_data is not None else [{"id": "new-id"}]

    delete_result = MagicMock()
    delete_result.data = delete_data if delete_data is not None else []

    # Build chained query builder: .table().select().eq().execute()
    inner = MagicMock()
    inner.execute = MagicMock(return_value=execute_result)
    inner.select = MagicMock(return_value=inner)
    inner.eq = MagicMock(return_value=inner)
    inner.neq = MagicMock(return_value=inner)
    inner.order = MagicMock(return_value=inner)
    inner.limit = MagicMock(return_value=inner)
    inner.single = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=single_result)))
    inner.insert = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=upsert_result)))
    inner.upsert = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=upsert_result)))
    inner.update = MagicMock(return_value=inner)

    delete_chain = MagicMock()
    delete_chain.execute = MagicMock(return_value=delete_result)
    delete_chain.eq = MagicMock(return_value=delete_chain)
    inner.delete = MagicMock(return_value=delete_chain)

    rpc_result = MagicMock()
    rpc_result.data = rpc_data if rpc_data is not None else True

    mock_client = MagicMock()
    mock_client.table = MagicMock(return_value=inner)
    mock_client.rpc = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=rpc_result)))

    mock_client.auth = MagicMock()
    mock_client.auth.admin = MagicMock()
    mock_client.auth.admin.delete_user = MagicMock(return_value=None)
    mock_client.auth.sign_up = MagicMock(return_value=MagicMock(
        user=MagicMock(id=TEST_USER_ID, email=TEST_USER_EMAIL),
        session=MagicMock()
    ))
    mock_client.auth.sign_in_with_password = MagicMock(return_value=MagicMock(
        user=MagicMock(id=TEST_USER_ID, email=TEST_USER_EMAIL)
    ))

    return mock_client


# ── Gemini mock factory ───────────────────────────────────────────────────────

def make_gemini_mock(
    summary: str = "Mock summary content.",
    questions: list = None,
    chat_response: str = "Mock chat answer.",
    translation: str = "Translated English text.",
):
    """Build a mock GeminiClient with canned responses."""
    mock = MagicMock()
    mock.generate_summary = MagicMock(return_value=summary)
    mock.generate_questions = MagicMock(return_value=questions or [
        "What is the main topic?",
        "Who is the speaker?",
        "What are the key takeaways?",
    ])
    mock.generate_chat_response = MagicMock(return_value=chat_response)
    mock.translate_to_english = MagicMock(return_value=translation)
    mock.generate_content = MagicMock(return_value=summary)
    return mock


# ── Auth service mock factory ─────────────────────────────────────────────────

def make_token_pair(user_id=TEST_USER_ID, email=TEST_USER_EMAIL):
    from app.services.auth_service import TokenPair
    return TokenPair(
        access_token=_make_access_token(user_id, email),
        refresh_token=_make_refresh_token(user_id, email),
        expires_in=3600,
    )


def make_user_profile(user_id=TEST_USER_ID, email=TEST_USER_EMAIL, tier="free"):
    from app.services.auth_service import UserProfile
    return UserProfile(
        id=user_id,
        email=email,
        display_name="Test User",
        avatar_url=None,
        tier=tier,
        summaries_used=0,
        chat_messages_used=0,
        created_at=datetime.now(timezone.utc),
    )


# ── Transcript fixture data ───────────────────────────────────────────────────

# ── Shared test constants ─────────────────────────────────────────────────────

VIDEO_ID = "test_video_id"

# ── Transcript fixture data ───────────────────────────────────────────────────

MOCK_TRANSCRIPT_SEGMENTS = [
    {"timestamp": "0:00", "start_seconds": 0, "duration": 5.0, "text": "Hello and welcome."},
    {"timestamp": "0:05", "start_seconds": 5, "duration": 5.0, "text": "Today we discuss Python."},
    {"timestamp": "0:10", "start_seconds": 10, "duration": 5.0, "text": "Let us begin."},
]

MOCK_TRANSCRIPT_FULL_TEXT = "Hello and welcome. Today we discuss Python. Let us begin."

MOCK_TRANSCRIPT_RESPONSE = {
    "success": True,
    "video_id": "test_video_id",
    "language": "en",
    "is_generated": False,
    "transcript": MOCK_TRANSCRIPT_SEGMENTS,
    "full_text": MOCK_TRANSCRIPT_FULL_TEXT,
    "video_title": "Test Video Title",
    "cached": False,
}

MOCK_FRENCH_TRANSCRIPT_RESPONSE = {
    "success": True,
    "video_id": "test_video_id_fr",
    "language": "fr",
    "is_generated": False,
    "transcript": [
        {"timestamp": "0:00", "start_seconds": 0, "duration": 5.0, "text": "Bonjour tout le monde."},
    ],
    "full_text": "Bonjour tout le monde.",
    "video_title": "Test French Video",
    "cached": False,
}


# ── Saved item fixture data ───────────────────────────────────────────────────

def make_saved_item(
    user_id=TEST_USER_ID,
    video_id="test_video_id",
    item_type="summary",
    format_value="short",
    content=None,
):
    return {
        "id": "saved-item-uuid-1",
        "user_id": user_id,
        "video_id": video_id,
        "item_type": item_type,
        "format": format_value,
        "content": content or {"summary": "A test summary.", "format": format_value},
        "created_at": "2025-01-01T00:00:00+00:00",
        "expires_at": "2025-02-01T00:00:00+00:00",
        "source": "extension",
    }


# ── pytest marks ─────────────────────────────────────────────────────────────

def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (skipped in fast CI mode)")
    config.addinivalue_line("markers", "integration: requires real network access")
