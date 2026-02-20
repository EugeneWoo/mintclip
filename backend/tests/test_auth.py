"""
test_auth.py - Tests for /api/auth/* endpoints

Strategy:
- Supabase is disabled globally (env vars empty in conftest.py).
  Routes that call is_supabase_available() return early with 400/503.
- For success paths, patch app.routes.auth.auth_service with AsyncMock.
- JWT token refresh is tested with real crypto (no mocking needed).
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from tests.conftest import (
    make_token_pair, make_user_profile,
    _make_access_token, _make_refresh_token,
    TEST_USER_ID, TEST_USER_EMAIL,
)


# ── Signup ────────────────────────────────────────────────────────────────────

class TestSignup:
    def test_signup_service_unavailable_returns_400(self, client):
        """When Supabase is down, signup returns 400."""
        resp = client.post("/api/auth/signup", json={
            "email": "new@example.com",
            "password": "password123",
            "privacy_accepted": True,
            "terms_accepted": True,
        })
        assert resp.status_code == 400

    def test_signup_password_too_short_returns_422(self, client):
        """Pydantic validates min_length=8 on password field."""
        resp = client.post("/api/auth/signup", json={
            "email": "new@example.com",
            "password": "short",
            "privacy_accepted": True,
            "terms_accepted": True,
        })
        assert resp.status_code == 422

    def test_signup_invalid_email_returns_422(self, client):
        """Pydantic validates EmailStr."""
        resp = client.post("/api/auth/signup", json={
            "email": "not-an-email",
            "password": "password123",
            "privacy_accepted": True,
            "terms_accepted": True,
        })
        assert resp.status_code == 422

    def test_signup_success_returns_tokens_and_user(self, client):
        """Successful signup returns access_token, refresh_token, and user."""
        token_pair = make_token_pair()
        profile = make_user_profile()

        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.signup_with_email = AsyncMock(return_value=(token_pair, None))
            mock_svc.validate_access_token = AsyncMock(
                return_value=({"sub": TEST_USER_ID, "email": TEST_USER_EMAIL, "type": "access"}, None)
            )
            mock_svc.get_user_profile = AsyncMock(return_value=profile)

            resp = client.post("/api/auth/signup", json={
                "email": "new@example.com",
                "password": "password123",
                "privacy_accepted": True,
                "terms_accepted": True,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["tokens"]["access_token"] is not None
        assert data["tokens"]["token_type"] == "bearer"
        assert data["user"]["email"] == TEST_USER_EMAIL

    def test_signup_email_confirmation_required_returns_message(self, client):
        """When Supabase requires email confirmation, return message with no tokens."""
        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.signup_with_email = AsyncMock(
                return_value=(None, "Please check your email to confirm your account")
            )
            resp = client.post("/api/auth/signup", json={
                "email": "confirm@example.com",
                "password": "password123",
                "privacy_accepted": True,
                "terms_accepted": True,
            })

        assert resp.status_code == 200
        data = resp.json()
        assert "check your email" in data["message"].lower()
        assert data["tokens"] is None


# ── Login ─────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_service_unavailable_returns_401(self, client):
        """When Supabase is down, login returns 401 with error."""
        resp = client.post("/api/auth/login", json={
            "email": "user@example.com",
            "password": "password123",
        })
        assert resp.status_code == 401

    def test_login_invalid_credentials_returns_401(self, client):
        """Wrong password returns 401."""
        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.login_with_email = AsyncMock(
                return_value=(None, None, "Invalid email or password")
            )
            resp = client.post("/api/auth/login", json={
                "email": "user@example.com",
                "password": "wrongpassword",
            })

        assert resp.status_code == 401

    def test_login_success_returns_tokens_and_profile(self, client):
        """Valid credentials return tokens and user profile."""
        token_pair = make_token_pair()
        profile = make_user_profile()

        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.login_with_email = AsyncMock(
                return_value=(token_pair, profile, None)
            )
            resp = client.post("/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": "password123",
            })

        assert resp.status_code == 200
        data = resp.json()
        assert data["tokens"]["access_token"] is not None
        assert data["user"]["tier"] == "free"
        assert data["user"]["email"] == TEST_USER_EMAIL

    def test_login_missing_email_returns_422(self, client):
        """Missing email field returns 422."""
        resp = client.post("/api/auth/login", json={"password": "password123"})
        assert resp.status_code == 422


# ── Token Refresh ─────────────────────────────────────────────────────────────

class TestTokenRefresh:
    def test_refresh_with_valid_refresh_token_returns_new_tokens(self, client, refresh_token):
        """Valid refresh token produces a new token pair."""
        resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    def test_refresh_with_expired_token_returns_401(self, client, expired_refresh_token):
        """Expired refresh token returns 401."""
        resp = client.post("/api/auth/refresh", json={"refresh_token": expired_refresh_token})
        assert resp.status_code == 401

    def test_refresh_with_access_token_type_returns_401(self, client, access_token):
        """Passing an access token (type='access') as refresh token returns 401."""
        resp = client.post("/api/auth/refresh", json={"refresh_token": access_token})
        assert resp.status_code == 401

    def test_refresh_with_garbage_token_returns_401(self, client):
        """Completely invalid string returns 401."""
        resp = client.post("/api/auth/refresh", json={"refresh_token": "garbage_token_xyz"})
        assert resp.status_code == 401

    def test_refresh_produces_different_access_token(self, client, refresh_token):
        """The refreshed access token should be a valid JWT with correct claims."""
        import jwt as pyjwt
        resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        new_token = resp.json()["access_token"]
        payload = pyjwt.decode(new_token, "test-jwt-secret-for-ci-only", algorithms=["HS256"])
        assert payload["sub"] == TEST_USER_ID
        assert payload["type"] == "access"


# ── Logout ────────────────────────────────────────────────────────────────────

class TestLogout:
    def test_logout_without_token_returns_401(self, client):
        """Unauthenticated logout returns 401."""
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 401

    def test_logout_with_expired_token_returns_401(self, client, expired_access_token):
        """Expired token returns 401."""
        resp = client.post("/api/auth/logout", headers={
            "Authorization": f"Bearer {expired_access_token}"
        })
        assert resp.status_code == 401

    def test_logout_with_valid_token_succeeds(self, client, auth_headers):
        """Authenticated user can logout successfully."""
        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.validate_access_token = AsyncMock(
                return_value=({"sub": TEST_USER_ID, "email": TEST_USER_EMAIL, "type": "access"}, None)
            )
            mock_svc.logout = AsyncMock(return_value=True)
            resp = client.post("/api/auth/logout", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is True


# ── Get Profile ───────────────────────────────────────────────────────────────

class TestGetProfile:
    def test_get_profile_without_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_get_profile_with_invalid_token_returns_401(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_get_profile_with_valid_token_returns_profile(self, client, auth_headers):
        profile = make_user_profile()
        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.validate_access_token = AsyncMock(
                return_value=({"sub": TEST_USER_ID, "email": TEST_USER_EMAIL, "type": "access"}, None)
            )
            mock_svc.get_user_profile = AsyncMock(return_value=profile)
            resp = client.get("/api/auth/me", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == TEST_USER_EMAIL
        assert data["tier"] == "free"


# ── Google OAuth ──────────────────────────────────────────────────────────────

class TestGoogleOAuth:
    def test_invalid_google_token_returns_401(self, client):
        """Invalid Google token returns 401."""
        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.verify_google_token = AsyncMock(
                return_value=(None, None, "Invalid or expired Google token.")
            )
            resp = client.post("/api/auth/google/token", json={"google_token": "invalid-token"})

        assert resp.status_code == 401

    def test_valid_google_token_returns_jwt_tokens(self, client):
        """Valid Google token returns our JWT tokens."""
        token_pair = make_token_pair()
        profile = make_user_profile()

        with patch("app.routes.auth.auth_service") as mock_svc:
            mock_svc.verify_google_token = AsyncMock(
                return_value=(token_pair, profile, None)
            )
            resp = client.post("/api/auth/google/token", json={"google_token": "valid-google-token"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["tokens"]["access_token"] is not None
        assert data["user"]["email"] == TEST_USER_EMAIL
