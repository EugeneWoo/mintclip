"""E2E: highlights — POST/GET/DELETE against real staging DB."""

import httpx
import pytest
from .conftest import STAGING_URL, EN_VIDEO_ID


def test_highlights_full_lifecycle(auth_headers, base_url):
    """Create highlight → fetch list → delete → confirm gone."""
    # POST — create
    create_resp = httpx.post(
        f"{base_url}/api/highlights",
        json={
            "video_id": EN_VIDEO_ID,
            "selected_text": "elephants in the zoo",
            "source_type": "transcript",
            "segment_index": 0,
            "char_start": 10,
            "char_end": 30,
        },
        headers=auth_headers,
        timeout=30,
    )
    assert create_resp.status_code == 200, f"Create failed: {create_resp.status_code} {create_resp.text}"
    cdata = create_resp.json()
    assert cdata["success"] is True
    highlight = cdata.get("highlight", {})
    assert "id" in highlight, f"No id in highlight: {highlight}"
    highlight_id = highlight["id"]

    # GET — appears in list
    get_resp = httpx.get(
        f"{base_url}/api/highlights/{EN_VIDEO_ID}",
        headers=auth_headers,
        timeout=30,
    )
    assert get_resp.status_code == 200, f"Get failed: {get_resp.status_code}"
    gdata = get_resp.json()
    assert gdata["success"] is True
    ids = [h["id"] for h in gdata.get("highlights", [])]
    assert highlight_id in ids, f"Created highlight not found in list: {ids}"

    # DELETE
    del_resp = httpx.delete(
        f"{base_url}/api/highlights/{highlight_id}",
        headers=auth_headers,
        timeout=30,
    )
    assert del_resp.status_code == 200, f"Delete failed: {del_resp.status_code}"
    ddata = del_resp.json()
    assert ddata["success"] is True

    # GET — confirm gone
    get_resp2 = httpx.get(
        f"{base_url}/api/highlights/{EN_VIDEO_ID}",
        headers=auth_headers,
        timeout=30,
    )
    assert get_resp2.status_code == 200
    remaining_ids = [h["id"] for h in get_resp2.json().get("highlights", [])]
    assert highlight_id not in remaining_ids, "Deleted highlight still in list"


def test_highlights_empty_video(auth_headers, base_url):
    """GET highlights for video with no highlights → empty list, not error."""
    resp = httpx.get(
        f"{base_url}/api/highlights/nonexistent_video_e2e_test",
        headers=auth_headers,
        timeout=30,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["highlights"] == []
