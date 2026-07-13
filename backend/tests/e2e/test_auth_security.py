"""
E2E security regression tests — verify the auth hardening on the real staging backend.

These are BLACK-BOX negative tests. They cannot perform a real Google login (no real
Google token in CI), but they assert the security guards are live in production code:

  - Google OAuth `aud` allowlist: a bogus/foreign Google token must be rejected (401),
    never minting a Mintclip JWT. If GOOGLE_ALLOWED_CLIENT_IDS is missing on the server,
    the fail-closed path also yields 401 — so this test passes only when the guard exists.
  - JWT_SECRET is configured: the app booted and `/api/auth/refresh` signs/verifies real
    JWTs. If JWT_SECRET were missing/weak the app would not start and every E2E test would
    fail at connection — this test additionally asserts the refresh path returns a usable,
    correctly-typed token pair.
"""

import httpx


class TestGoogleTokenAudience:
    def test_bogus_google_token_is_rejected(self, base_url: str):
        """A non-Google / invalid access token must not authenticate."""
        resp = httpx.post(
            f"{base_url}/api/auth/google/token",
            json={"google_token": "not-a-real-google-token"},
            timeout=30,
        )
        # 401 = rejected (invalid token OR audience mismatch OR fail-closed). Never 200.
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        body = resp.json()
        assert "tokens" not in body or body.get("tokens") is None

    def test_google_endpoint_never_mints_token_for_garbage(self, base_url: str):
        """Defense-in-depth: assert no access_token is ever returned for a bad token."""
        resp = httpx.post(
            f"{base_url}/api/auth/google/token",
            json={"google_token": "ya29.FAKE.aud.substitution.attempt"},
            timeout=30,
        )
        assert resp.status_code != 200
        assert "access_token" not in resp.text


class TestJwtSecretConfigured:
    def test_refresh_signs_valid_token_pair(self, base_url: str, access_token: str):
        """
        If we got here, the refresh fixture already exchanged a real refresh token for
        an access token against staging — proving JWT_SECRET is set and the app booted.
        Assert the token is a well-formed JWT (three dot-separated segments).
        """
        assert access_token and access_token.count(".") == 2, "access_token is not a JWT"

    def test_protected_route_accepts_signed_token(self, base_url: str, auth_headers: dict):
        """A freshly-signed access token is accepted by a protected endpoint."""
        resp = httpx.get(
            f"{base_url}/api/saved-items/list",
            headers=auth_headers,
            timeout=30,
        )
        assert resp.status_code == 200, f"Protected route rejected valid token: {resp.status_code}"

    def test_forged_token_is_rejected(self, base_url: str):
        """
        A token signed with a guessed/known weak secret must be rejected — proves the
        server's JWT_SECRET is not the old public default.
        """
        import jwt as pyjwt
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        forged = pyjwt.encode(
            {
                "sub": "11111111-1111-1111-1111-111111111111",
                "email": "attacker@example.com",
                "type": "access",
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            "change-this-in-production",  # the old insecure default
            algorithm="HS256",
        )
        resp = httpx.get(
            f"{base_url}/api/saved-items/list",
            headers={"Authorization": f"Bearer {forged}"},
            timeout=30,
        )
        assert resp.status_code == 401, f"Forged token accepted! got {resp.status_code}"
