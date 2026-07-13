"""
test_auth_service.py - Unit tests for auth_service internals.

Covers security-critical logic that the route-level tests in test_auth.py mock
away entirely:
  - Google OAuth token AUDIENCE validation (blocks token-substitution / confused deputy)
  - JWT_SECRET fail-fast at module import (blocks forged-token auth bypass)

Google network calls are faked by patching httpx.AsyncClient so no real Google
request is made and no manual OAuth login is required.
"""

import os
import importlib
import contextlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.services.auth_service as auth_module
from app.services.auth_service import auth_service


# ── Test constants ────────────────────────────────────────────────────────────

ALLOWED_CLIENT_ID = "test-client-id.apps.googleusercontent.com"  # matches conftest env
FOREIGN_CLIENT_ID = "attacker-app.apps.googleusercontent.com"
GOOGLE_SUB = "1234567890"
GOOGLE_EMAIL = "victim@example.com"


def _make_response(status_code=200, json_body=None, text=""):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json = MagicMock(return_value=json_body or {})
    resp.text = text
    return resp


@contextlib.contextmanager
def _mock_google(tokeninfo=None, userinfo=None, tokeninfo_status=200, userinfo_status=200):
    """
    Patch httpx.AsyncClient so calls to tokeninfo/userinfo return canned data.
    Routing is by URL so the audience check (tokeninfo) and profile fetch
    (userinfo) get their respective responses.
    """
    async def fake_get(url, *args, **kwargs):
        if "tokeninfo" in url:
            return _make_response(tokeninfo_status, tokeninfo)
        return _make_response(userinfo_status, userinfo)

    fake_client = MagicMock()
    fake_client.get = AsyncMock(side_effect=fake_get)
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.auth_service.httpx.AsyncClient", return_value=fake_client):
        yield fake_client


# ── Google token audience validation ──────────────────────────────────────────

class TestGoogleTokenAudience:
    @pytest.mark.asyncio
    async def test_foreign_audience_is_rejected(self):
        """A Google access token minted for ANOTHER app must be rejected."""
        tokeninfo = {"aud": FOREIGN_CLIENT_ID, "azp": FOREIGN_CLIENT_ID,
                     "sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}
        with _mock_google(tokeninfo=tokeninfo,
                          userinfo={"sub": GOOGLE_SUB, "email": GOOGLE_EMAIL, "name": "V"}):
            tokens, profile, error = await auth_service.verify_google_token("foreign-token")

        assert tokens is None
        assert profile is None
        assert error is not None

    @pytest.mark.asyncio
    async def test_matching_audience_is_accepted(self, mocker):
        """A token whose aud matches an allowlisted client authenticates."""
        # Avoid Supabase: stub profile lookup/creation.
        mocker.patch.object(auth_service, "get_user_profile", AsyncMock(return_value=None))
        mocker.patch.object(
            auth_service, "_create_user_profile",
            AsyncMock(return_value=MagicMock(id="uid", email=GOOGLE_EMAIL)),
        )
        mocker.patch.object(auth_service, "_is_deletion_pending", AsyncMock(return_value=False))

        tokeninfo = {"aud": ALLOWED_CLIENT_ID, "azp": ALLOWED_CLIENT_ID,
                     "sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}
        userinfo = {"sub": GOOGLE_SUB, "email": GOOGLE_EMAIL, "name": "Victim", "picture": None}
        with _mock_google(tokeninfo=tokeninfo, userinfo=userinfo):
            tokens, profile, error = await auth_service.verify_google_token("valid-token")

        assert error is None
        assert tokens is not None
        assert tokens.access_token

    @pytest.mark.asyncio
    async def test_azp_match_is_accepted(self, mocker):
        """Some flows carry the client only in `azp`; that must also pass."""
        mocker.patch.object(auth_service, "get_user_profile", AsyncMock(return_value=None))
        mocker.patch.object(
            auth_service, "_create_user_profile",
            AsyncMock(return_value=MagicMock(id="uid", email=GOOGLE_EMAIL)),
        )
        mocker.patch.object(auth_service, "_is_deletion_pending", AsyncMock(return_value=False))

        tokeninfo = {"aud": "unrelated", "azp": ALLOWED_CLIENT_ID,
                     "sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}
        userinfo = {"sub": GOOGLE_SUB, "email": GOOGLE_EMAIL, "name": "V", "picture": None}
        with _mock_google(tokeninfo=tokeninfo, userinfo=userinfo):
            tokens, _, error = await auth_service.verify_google_token("valid-token")

        assert error is None
        assert tokens is not None

    @pytest.mark.asyncio
    async def test_missing_allowlist_fails_closed(self, monkeypatch):
        """If GOOGLE_ALLOWED_CLIENT_IDS is unset, reject everything (fail closed)."""
        monkeypatch.setenv("GOOGLE_ALLOWED_CLIENT_IDS", "")
        tokeninfo = {"aud": ALLOWED_CLIENT_ID, "sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}
        with _mock_google(tokeninfo=tokeninfo,
                          userinfo={"sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}):
            tokens, profile, error = await auth_service.verify_google_token("any-token")

        assert tokens is None
        assert error is not None

    @pytest.mark.asyncio
    async def test_tokeninfo_http_error_is_rejected(self):
        """If tokeninfo endpoint fails, the token cannot be validated → reject."""
        with _mock_google(tokeninfo={}, tokeninfo_status=400,
                          userinfo={"sub": GOOGLE_SUB, "email": GOOGLE_EMAIL}):
            tokens, profile, error = await auth_service.verify_google_token("bad-token")

        assert tokens is None
        assert error is not None


# ── JWT_SECRET fail-fast ───────────────────────────────────────────────────────

class TestJwtSecretFailFast:
    def test_missing_secret_raises_on_import(self, monkeypatch):
        # Empty (not delenv): load_dotenv() inside the module won't override an
        # already-set env var, so an empty string reliably triggers the guard even
        # when a real .env file is present.
        monkeypatch.setenv("JWT_SECRET", "")
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            importlib.reload(auth_module)

    def test_short_secret_raises_on_import(self, monkeypatch):
        monkeypatch.setenv("JWT_SECRET", "too-short")
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            importlib.reload(auth_module)

    def test_valid_secret_imports_cleanly(self, monkeypatch):
        monkeypatch.setenv("JWT_SECRET", "a" * 32)
        # Should not raise.
        importlib.reload(auth_module)

    @classmethod
    def teardown_class(cls):
        # Restore the module to the CI secret so other test modules keep working.
        os.environ["JWT_SECRET"] = "test-jwt-secret-for-ci-only-32chars"
        importlib.reload(auth_module)
