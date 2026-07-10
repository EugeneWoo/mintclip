"""
E2E test fixtures — hit real staging backend with real credentials.

Required env vars (set as GitHub secrets):
  STAGING_BACKEND_URL   e.g. https://mintclip-staging.up.railway.app
  TEST_REFRESH_TOKEN    extract from staging webapp local storage

All tests are skipped if either var is missing.
"""

import os
import pytest
import httpx

STAGING_URL = os.environ.get("STAGING_BACKEND_URL", "").rstrip("/")
TEST_REFRESH_TOKEN = os.environ.get("TEST_REFRESH_TOKEN", "")

# Skip entire module when secrets not present
if not STAGING_URL or not TEST_REFRESH_TOKEN:
    pytest.skip(
        "STAGING_BACKEND_URL and TEST_REFRESH_TOKEN required for e2e tests",
        allow_module_level=True,
    )


@pytest.fixture(scope="session")
def base_url() -> str:
    return STAGING_URL


@pytest.fixture(scope="session")
def access_token() -> str:
    """Exchange stored refresh token for a fresh access token."""
    resp = httpx.post(
        f"{STAGING_URL}/api/auth/refresh",
        json={"refresh_token": TEST_REFRESH_TOKEN},
        timeout=30,
    )
    assert resp.status_code == 200, f"Token refresh failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert "access_token" in data, f"No access_token in refresh response: {data}"
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


# Real YouTube video IDs used across tests
# Short, stable, well-known videos unlikely to be deleted
EN_VIDEO_ID = "jNQXAC9IVRw"        # "Me at the zoo" — first YouTube video, 19s, English
NON_EN_VIDEO_ID = "9bZkp7q19f0"    # PSY Gangnam Style — has Korean captions

# All video IDs that E2E tests may write to the DB — cleaned up after session
_TEST_VIDEO_IDS = [
    EN_VIDEO_ID,
    NON_EN_VIDEO_ID,
    "dQw4w9WgXcQ",  # Rick Astley — used in batch tests
]


def _saved_video_ids(base_url: str, auth_headers: dict) -> set[str]:
    """Return set of video_ids already in the user's saved items."""
    try:
        resp = httpx.get(
            f"{base_url}/api/saved-items/list",
            headers=auth_headers,
            timeout=15,
        )
        if resp.status_code == 200:
            return {item["video_id"] for item in resp.json().get("items", [])}
    except Exception:
        pass
    return set()


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_videos(base_url: str, auth_headers: dict):
    """Delete only video IDs that CI created — skip any the user had saved before."""
    pre_existing = _saved_video_ids(base_url, auth_headers) & set(_TEST_VIDEO_IDS)
    yield
    to_delete = set(_TEST_VIDEO_IDS) - pre_existing
    for video_id in to_delete:
        try:
            httpx.delete(
                f"{base_url}/api/saved-items/video/{video_id}",
                headers=auth_headers,
                timeout=15,
            )
        except Exception:
            pass  # best-effort; don't fail the suite on cleanup errors
