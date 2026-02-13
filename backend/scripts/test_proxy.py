#!/usr/bin/env python3
"""
Test Webshare proxy configuration and YouTube API access
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_direct_connection():
    """Test direct connection to YouTube (no proxy)"""
    print("\n=== Testing Direct Connection (No Proxy) ===")
    try:
        api = YouTubeTranscriptApi()
        transcript = api.list("dQw4w9WgXcQ")
        print("✓ Direct connection works!")
        return True
    except Exception as e:
        print(f"✗ Direct connection failed: {e}")
        return False

def test_proxy_connection():
    """Test connection through Webshare proxy"""
    print("\n=== Testing Webshare Proxy Connection ===")

    ws_user = os.getenv("WS_USER")
    ws_pass = os.getenv("WS_PASS")

    if not ws_user or not ws_pass:
        print("✗ WS_USER or WS_PASS not set in environment")
        return False

    print(f"Using proxy credentials: {ws_user[:8]}...@p.webshare.io")

    try:
        proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80/"
        proxy_config = GenericProxyConfig(
            http_url=proxy_url,
            https_url=proxy_url,
        )

        api = YouTubeTranscriptApi(proxy_config=proxy_config)
        transcript = api.list("dQw4w9WgXcQ")

        print("✓ Proxy connection works!")
        print(f"  Available languages: {[t.language_code for t in transcript]}")
        return True

    except Exception as e:
        print(f"✗ Proxy connection failed: {e}")
        return False

def test_multiple_requests():
    """Test multiple requests through proxy to verify rotation"""
    print("\n=== Testing Proxy IP Rotation (5 requests) ===")

    ws_user = os.getenv("WS_USER")
    ws_pass = os.getenv("WS_PASS")

    if not ws_user or not ws_pass:
        print("✗ WS_USER or WS_PASS not set")
        return False

    proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80/"
    proxy_config = GenericProxyConfig(
        http_url=proxy_url,
        https_url=proxy_url,
    )

    test_videos = ["dQw4w9WgXcQ", "jNQXAC9IVRw", "9bZkp7q19f0", "kJQP7kiw5Fk", "L_jWHffIx5E"]

    success_count = 0
    for i, video_id in enumerate(test_videos, 1):
        try:
            api = YouTubeTranscriptApi(proxy_config=proxy_config)
            transcript = api.list(video_id)
            print(f"  {i}/5 ✓ Video {video_id}")
            success_count += 1
        except Exception as e:
            print(f"  {i}/5 ✗ Video {video_id}: {e}")

    print(f"\nSuccess rate: {success_count}/5 ({success_count*20}%)")
    return success_count == 5

if __name__ == "__main__":
    print("Webshare Proxy Diagnostic Test")
    print("=" * 50)

    # Test direct connection
    direct_ok = test_direct_connection()

    # Test proxy connection
    proxy_ok = test_proxy_connection()

    # Test rotation
    if proxy_ok:
        rotation_ok = test_multiple_requests()

    print("\n" + "=" * 50)
    print("Summary:")
    print(f"  Direct connection: {'✓' if direct_ok else '✗'}")
    print(f"  Proxy connection: {'✓' if proxy_ok else '✗'}")
    if proxy_ok:
        print(f"  Proxy rotation: {'✓' if rotation_ok else '✗'}")

    if not proxy_ok:
        print("\n⚠️  Proxy is NOT working. Possible issues:")
        print("  1. Webshare credentials expired")
        print("  2. Webshare account out of bandwidth/requests")
        print("  3. Webshare proxy pool is rate-limited by YouTube")
        print("  4. Network firewall blocking proxy connections")
