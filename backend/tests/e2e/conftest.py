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
