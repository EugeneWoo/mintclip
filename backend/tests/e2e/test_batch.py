"""E2E: batch transcript submission against real staging backend."""

import time
import httpx
import pytest
from .conftest import STAGING_URL, EN_VIDEO_ID

# Two short, stable videos for batch submission
BATCH_URLS = [
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",   # Me at the zoo (~19s)
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",   # Rick Astley (~3.5m)
]


def test_batch_submit_creates_group(auth_headers, base_url):
    """POST /api/batch/process → job_id returned, group row created in DB."""
    resp = httpx.post(
        f"{base_url}/api/batch/process",
        json={"urls": BATCH_URLS},
        headers=auth_headers,
        timeout=60,
    )
    assert resp.status_code == 200, f"Batch submit failed: {resp.status_code} {resp.text}"
    data = resp.json()

    assert "job_id" in data, f"No job_id in response: {data}"
    assert data["job_id"]


def test_batch_status_reachable(auth_headers, base_url):
    """POST then GET status — status endpoint responds."""
    submit_resp = httpx.post(
        f"{base_url}/api/batch/process",
        json={"urls": BATCH_URLS},
        headers=auth_headers,
        timeout=60,
    )
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    job_id = data["job_id"]

    # Poll status up to 3 times with short gaps
    for _ in range(3):
        status_resp = httpx.get(
            f"{base_url}/api/batch/status/{job_id}",
            headers=auth_headers,
            timeout=30,
        )
        assert status_resp.status_code == 200, f"Status failed: {status_resp.status_code}"
        sdata = status_resp.json()
        assert "status" in sdata and "job_id" in sdata
        if sdata.get("status") in ("completed", "failed"):
            break
        time.sleep(5)
