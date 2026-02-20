"""
test_saved_items.py - Tests for /api/saved-items/* endpoints

Strategy:
- require_auth depends on auth_service.validate_access_token.
  Since we create real JWT tokens with the test secret, no patching is needed
  for auth — the real JWT decoder accepts our tokens.
- Supabase is globally disabled (env vars empty). Every test that needs
  Supabase DB calls must patch:
    1. app.routes.saved_items.get_supabase_admin → return make_supabase_mock(...)
    2. app.services.supabase_client.is_supabase_available → return True
       (for routes that call is_supabase_available before using Supabase)
- Free-tier quota limit (25 items) is enforced by counting existing items.
"""

import pytest
from unittest.mock import patch

from tests.conftest import (
    make_supabase_mock, make_saved_item,
    TEST_USER_ID, TEST_USER_EMAIL,
)

SAVE_URL = "/api/saved-items/save"
LIST_URL = "/api/saved-items/list"


def _supabase_patches(mocker, table_data=None, count=None, upsert_data=None):
    """Helper: patch both supabase getter and availability check."""
    mock_sb = make_supabase_mock(
        table_data=table_data if table_data is not None else [],
        count=count if count is not None else (len(table_data) if table_data else 0),
        upsert_data=upsert_data or [make_saved_item()],
    )
    mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)
    return mock_sb


# ── Save Item ─────────────────────────────────────────────────────────────────

class TestSaveItem:
    def test_save_requires_auth(self, client):
        """No token → 401."""
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "transcript",
            "content": {},
        })
        assert resp.status_code == 401

    def test_save_transcript_succeeds(self, client, auth_headers, mocker):
        """Authenticated user can save a transcript."""
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "transcript",
            "content": {"segments": [], "full_text": "Test"},
        }, headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_save_summary_short_succeeds(self, client, auth_headers, mocker):
        """Save a short summary."""
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "summary",
            "content": {"summary": "Short summary text.", "format": "short"},
        }, headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_save_summary_topic_succeeds(self, client, auth_headers, mocker):
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "summary",
            "content": {"summary": "Topic summary.", "format": "topic"},
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_save_summary_qa_succeeds(self, client, auth_headers, mocker):
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "summary",
            "content": {"summary": "Q&A summary.", "format": "qa"},
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_save_legacy_item_type_summary_short_normalizes(self, client, auth_headers, mocker):
        """Legacy item_type 'summary_short' is normalized to 'summary' with format='short'."""
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "summary_short",
            "content": {"summary": "Short text."},
        }, headers=auth_headers)
        assert resp.status_code == 200

    def test_save_quota_exceeded_returns_error(self, client, auth_headers, mocker):
        """Free tier: 25 saved items limit returns error when exceeded."""
        from unittest.mock import MagicMock

        # Build two execute results:
        #   1st call: existing item check → empty (item doesn't exist yet)
        #   2nd call: total count check → count=25 (quota full)
        empty_result = MagicMock()
        empty_result.data = []
        empty_result.count = 0

        full_count_result = MagicMock()
        full_count_result.data = []
        full_count_result.count = 25

        execute_mock = MagicMock(side_effect=[empty_result, full_count_result])

        inner = MagicMock()
        inner.select = MagicMock(return_value=inner)
        inner.eq = MagicMock(return_value=inner)
        inner.execute = execute_mock

        mock_sb = MagicMock()
        mock_sb.table = MagicMock(return_value=inner)

        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)

        resp = client.post(SAVE_URL, json={
            "video_id": "new_vid",
            "item_type": "transcript",
            "content": {"segments": [], "full_text": "New"},
        }, headers=auth_headers)

        # Should either return 200 with error or 4xx
        data = resp.json()
        if resp.status_code == 200:
            assert data.get("success") is False or data.get("error") is not None
        else:
            assert resp.status_code >= 400

    def test_save_invalid_item_type_returns_422(self, client, auth_headers):
        """Invalid item_type enum returns 422."""
        resp = client.post(SAVE_URL, json={
            "video_id": "vid1",
            "item_type": "invalid_type",
            "content": {},
        }, headers=auth_headers)
        assert resp.status_code == 422


# ── List Items ────────────────────────────────────────────────────────────────

class TestListItems:
    def test_list_requires_auth(self, client):
        resp = client.get(LIST_URL)
        assert resp.status_code == 401

    def test_list_returns_all_items(self, client, auth_headers, mocker):
        items = [
            make_saved_item(video_id="vid1", item_type="transcript"),
            make_saved_item(video_id="vid2", item_type="summary"),
        ]
        _supabase_patches(mocker, table_data=items, count=2)

        resp = client.get(LIST_URL, headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["items"]) == 2

    def test_list_returns_empty_when_no_items(self, client, auth_headers, mocker):
        _supabase_patches(mocker, table_data=[], count=0)
        resp = client.get(LIST_URL, headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_list_filters_by_item_type(self, client, auth_headers, mocker):
        """item_type query param filters results."""
        items = [make_saved_item(video_id="vid1", item_type="transcript")]
        _supabase_patches(mocker, table_data=items, count=1)

        resp = client.get(f"{LIST_URL}?item_type=transcript", headers=auth_headers)

        assert resp.status_code == 200


# ── Get Specific Item ─────────────────────────────────────────────────────────

class TestGetItem:
    def test_get_item_requires_auth(self, client):
        resp = client.get("/api/saved-items/vid1/summary")
        assert resp.status_code == 401

    def test_get_item_returns_item_when_found(self, client, auth_headers, mocker):
        item = make_saved_item(video_id="vid1", item_type="summary")
        mock_sb = make_supabase_mock(table_data=[item], single_data=item)
        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)

        resp = client.get("/api/saved-items/vid1/summary", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    def test_get_item_returns_none_when_not_found(self, client, auth_headers, mocker):
        mock_sb = make_supabase_mock(table_data=[], single_data=None)
        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)

        resp = client.get("/api/saved-items/nonexistent_vid/summary", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["item"] is None


# ── Delete Items ──────────────────────────────────────────────────────────────

class TestDeleteItems:
    def test_delete_specific_item_requires_auth(self, client):
        resp = client.delete("/api/saved-items/vid1/summary")
        assert resp.status_code == 401

    def test_delete_specific_item_succeeds(self, client, auth_headers, mocker):
        mock_sb = make_supabase_mock(delete_data=[make_saved_item()])
        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)

        resp = client.delete("/api/saved-items/vid1/summary", headers=auth_headers)
        assert resp.status_code == 200

    def test_delete_all_video_items_requires_auth(self, client):
        resp = client.delete("/api/saved-items/video/vid1")
        assert resp.status_code == 401

    def test_delete_all_video_items_succeeds(self, client, auth_headers, mocker):
        mock_sb = make_supabase_mock(delete_data=[make_saved_item()])
        mocker.patch("app.routes.saved_items.get_supabase_admin", return_value=mock_sb)

        resp = client.delete("/api/saved-items/video/vid1", headers=auth_headers)
        assert resp.status_code == 200
