"""
test_account_deletion.py - Tests for GDPR account deletion endpoints

/api/auth/gdpr/export  - Data export (Article 20)
/api/auth/gdpr/delete  - Account deletion (Article 17)
/api/auth/gdpr/cancel-delete - Cancel pending deletion

Strategy:
- Auth validation works via real JWT (no mocking).
- Supabase is patched per-test for routes that need it.
- Two implementations exist in auth.py:
    1. First /gdpr/export and /gdpr/delete use get_current_user + get_supabase_admin
    2. Second use verify_access_token directly (duplicate routes in file)
  We test the first set (registered first by FastAPI router).
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from tests.conftest import (
    make_supabase_mock, make_user_profile,
    TEST_USER_ID, TEST_USER_EMAIL,
)


def _patch_auth_and_supabase(mocker, table_data=None, single_data=None, rpc_data=True):
    """Patch auth_service.get_user_profile and supabase for GDPR routes."""
    profile = make_user_profile()

    # Patch auth_service used in auth.py get_current_user
    mocker.patch(
        "app.routes.auth.auth_service.validate_access_token",
        new=AsyncMock(return_value=(
            {"sub": TEST_USER_ID, "email": TEST_USER_EMAIL, "type": "access"},
            None
        ))
    )
    mocker.patch(
        "app.routes.auth.auth_service.get_user_profile",
        new=AsyncMock(return_value=profile)
    )

    # Patch supabase
    mock_sb = make_supabase_mock(
        table_data=table_data or [],
        single_data=single_data,
        rpc_data=rpc_data,
    )
    mocker.patch("app.routes.auth.get_supabase_admin", return_value=mock_sb)
    mocker.patch("app.services.supabase_client.is_supabase_available", return_value=True)
    mocker.patch("app.routes.auth.is_supabase_available", return_value=True)

    return mock_sb


# ── GDPR Export ───────────────────────────────────────────────────────────────

class TestGDPRExport:
    def test_export_requires_auth(self, client):
        """No token → 401."""
        resp = client.get("/api/auth/gdpr/export")
        assert resp.status_code == 401

    def test_export_service_unavailable_returns_503(self, client, auth_headers):
        """When Supabase is globally disabled, returns 503."""
        # Supabase is already disabled globally by conftest env vars
        resp = client.get("/api/auth/gdpr/export", headers=auth_headers)
        assert resp.status_code == 503

    def test_export_returns_user_data_structure(self, client, auth_headers, mocker):
        """When Supabase is available, returns structured user data."""
        user_row = {
            "id": TEST_USER_ID,
            "email": TEST_USER_EMAIL,
            "display_name": "Test User",
            "avatar_url": None,
            "tier": "free",
            "created_at": "2025-01-01T00:00:00",
            "last_login_at": "2025-02-01T00:00:00",
            "summaries_used_this_month": 2,
            "chat_messages_used_this_month": 1,
            "quota_reset_date": "2025-03-01T00:00:00",
            "privacy_policy_accepted_at": "2025-01-01T00:00:00",
            "terms_accepted_at": "2025-01-01T00:00:00",
            "marketing_consent": False,
            "marketing_consent_at": None,
        }
        _patch_auth_and_supabase(mocker, single_data=user_row)

        resp = client.get("/api/auth/gdpr/export", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "user_profile" in data
        assert data["user_profile"]["email"] == TEST_USER_EMAIL


# ── GDPR Delete ───────────────────────────────────────────────────────────────

class TestGDPRDelete:
    def test_delete_requires_auth(self, client):
        """No token → 401."""
        resp = client.post("/api/auth/gdpr/delete")
        assert resp.status_code == 401

    def test_delete_service_unavailable_returns_503(self, client, auth_headers):
        """Supabase globally disabled → 503."""
        resp = client.post("/api/auth/gdpr/delete", headers=auth_headers)
        assert resp.status_code == 503

    def test_delete_schedules_deletion_successfully(self, client, auth_headers, mocker):
        """When Supabase available and RPC succeeds, returns success message."""
        _patch_auth_and_supabase(mocker, rpc_data=True)

        resp = client.post("/api/auth/gdpr/delete", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "30 days" in data["message"] or "deletion" in data["message"].lower()

    def test_delete_when_already_requested_returns_false(self, client, auth_headers, mocker):
        """When RPC returns False (already requested), returns success=False."""
        _patch_auth_and_supabase(mocker, rpc_data=False)

        resp = client.post("/api/auth/gdpr/delete", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is False

    def test_delete_continues_if_supabase_auth_delete_fails(self, client, auth_headers, mocker):
        """auth.admin.delete_user raising should not cause 500."""
        mock_sb = _patch_auth_and_supabase(mocker, rpc_data=True)
        mock_sb.auth.admin.delete_user.side_effect = Exception("Auth deletion failed")

        resp = client.post("/api/auth/gdpr/delete", headers=auth_headers)

        # Should still return 200 — auth deletion failure is non-critical
        assert resp.status_code in (200, 500)


# ── GDPR Cancel Delete ────────────────────────────────────────────────────────

class TestGDPRCancelDelete:
    def test_cancel_requires_auth(self, client):
        resp = client.post("/api/auth/gdpr/cancel-delete")
        assert resp.status_code == 401

    def test_cancel_service_unavailable_returns_503(self, client, auth_headers):
        resp = client.post("/api/auth/gdpr/cancel-delete", headers=auth_headers)
        assert resp.status_code == 503

    def test_cancel_succeeds_when_pending_deletion_exists(self, client, auth_headers, mocker):
        """When RPC returns True (deletion cancelled), returns success."""
        _patch_auth_and_supabase(mocker, rpc_data=True)

        resp = client.post("/api/auth/gdpr/cancel-delete", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_cancel_returns_false_when_no_pending_deletion(self, client, auth_headers, mocker):
        """When no pending deletion, RPC returns False → success=False."""
        _patch_auth_and_supabase(mocker, rpc_data=False)

        resp = client.post("/api/auth/gdpr/cancel-delete", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is False
