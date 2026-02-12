#!/usr/bin/env python3
"""
Test script for save functionality (transcript, summary, chat)
Tests the complete flow: Extension -> Backend -> Supabase

Usage:
    python backend/scripts/test_save_functionality.py

Requirements:
    - Backend server running on port 8000
    - Valid access token for authenticated user
    - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import requests
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_VIDEO_ID = "dQw4w9WgXcQ"  # Example YouTube video ID
TEST_VIDEO_TITLE = "Never Gonna Give You Up"

# You need to replace this with a valid access token from your auth flow
# Get it from: Extension popup -> Login -> Check chrome.storage.local.authState
ACCESS_TOKEN = os.getenv("TEST_ACCESS_TOKEN", "")

if not ACCESS_TOKEN:
    print("ERROR: TEST_ACCESS_TOKEN environment variable not set")
    print("To get your token:")
    print("1. Open Chrome extension popup")
    print("2. Login with Google")
    print("3. Open DevTools -> Application -> Storage -> Local Storage")
    print("4. Look for 'authState' key and copy the 'accessToken' value")
    print("5. Run: export TEST_ACCESS_TOKEN='your-token-here'")
    sys.exit(1)


def make_request(method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make authenticated API request"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")

        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return {"success": False, "error": str(e)}


def test_save_transcript():
    """Test saving a transcript"""
    print("\n" + "="*60)
    print("TEST 1: Save Transcript")
    print("="*60)

    payload = {
        "video_id": TEST_VIDEO_ID,
        "item_type": "transcript",
        "content": {
            "videoTitle": TEST_VIDEO_TITLE,
            "savedAt": datetime.now().isoformat(),
            "language": "en",
            "text": "This is a test transcript. It contains sample text from the video.",
            "segments": [
                {"timestamp": "00:00", "start_seconds": 0, "text": "This is a test transcript."},
                {"timestamp": "00:05", "start_seconds": 5, "text": "It contains sample text from the video."}
            ]
        }
    }

    result = make_request("POST", "/api/saved-items/save", payload)

    if result.get("success"):
        print("✅ Transcript saved successfully")
        print(f"Message: {result.get('message')}")
        return True
    else:
        print(f"❌ Failed to save transcript: {result.get('error')}")
        return False


def test_save_summary():
    """Test saving a summary"""
    print("\n" + "="*60)
    print("TEST 2: Save Summary")
    print("="*60)

    payload = {
        "video_id": TEST_VIDEO_ID,
        "item_type": "summary",
        "content": {
            "videoTitle": TEST_VIDEO_TITLE,
            "savedAt": datetime.now().isoformat(),
            "format": "short",
            "summary": "## Test Summary\n\n- This is a test summary\n- It has multiple bullet points\n- Generated for testing purposes",
            "is_structured": True
        }
    }

    result = make_request("POST", "/api/saved-items/save", payload)

    if result.get("success"):
        print("✅ Summary saved successfully")
        print(f"Message: {result.get('message')}")
        return True
    else:
        print(f"❌ Failed to save summary: {result.get('error')}")
        return False


def test_save_chat():
    """Test saving a chat"""
    print("\n" + "="*60)
    print("TEST 3: Save Chat")
    print("="*60)

    payload = {
        "video_id": TEST_VIDEO_ID,
        "item_type": "chat",
        "content": {
            "videoTitle": TEST_VIDEO_TITLE,
            "savedAt": datetime.now().isoformat(),
            "messages": 'user: "What is this video about?"\nsystem: "This is a test response about the video content."'
        }
    }

    result = make_request("POST", "/api/saved-items/save", payload)

    if result.get("success"):
        print("✅ Chat saved successfully")
        print(f"Message: {result.get('message')}")
        return True
    else:
        print(f"❌ Failed to save chat: {result.get('error')}")
        return False


def test_list_saved_items():
    """Test listing all saved items"""
    print("\n" + "="*60)
    print("TEST 4: List All Saved Items")
    print("="*60)

    result = make_request("GET", "/api/saved-items/list")

    if result.get("success"):
        items = result.get("items", [])
        print(f"✅ Retrieved {len(items)} saved items")

        if items:
            print("\nSaved items:")
            for item in items:
                print(f"  - {item['item_type']}: {item['video_id']} (saved at {item['created_at']})")
        else:
            print("  (No items found)")
        return True
    else:
        print(f"❌ Failed to list items: {result.get('error')}")
        return False


def test_get_specific_item():
    """Test getting a specific saved item"""
    print("\n" + "="*60)
    print("TEST 5: Get Specific Saved Item")
    print("="*60)

    item_type = "transcript"
    result = make_request("GET", f"/api/saved-items/{TEST_VIDEO_ID}/{item_type}")

    if result.get("success"):
        item = result.get("item")
        if item:
            print(f"✅ Retrieved {item_type} for video {TEST_VIDEO_ID}")
            print(f"Content keys: {list(item['content'].keys())}")
        else:
            print(f"✅ No {item_type} found for video {TEST_VIDEO_ID} (this is OK)")
        return True
    else:
        print(f"❌ Failed to get item: {result.get('error')}")
        return False


def test_delete_items():
    """Test deleting saved items"""
    print("\n" + "="*60)
    print("TEST 6: Delete Saved Items (Cleanup)")
    print("="*60)

    success_count = 0
    for item_type in ["transcript", "summary", "chat"]:
        result = make_request("DELETE", f"/api/saved-items/{TEST_VIDEO_ID}/{item_type}")

        if result.get("success"):
            print(f"✅ Deleted {item_type}")
            success_count += 1
        else:
            print(f"⚠️  Failed to delete {item_type} (might not exist): {result.get('error')}")

    return success_count > 0


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SAVE FUNCTIONALITY END-TO-END TEST")
    print("="*60)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Test Video ID: {TEST_VIDEO_ID}")
    print(f"Access Token: {ACCESS_TOKEN[:20]}..." if len(ACCESS_TOKEN) > 20 else "INVALID")

    results = []

    # Run tests
    results.append(("Save Transcript", test_save_transcript()))
    results.append(("Save Summary", test_save_summary()))
    results.append(("Save Chat", test_save_chat()))
    results.append(("List Saved Items", test_list_saved_items()))
    results.append(("Get Specific Item", test_get_specific_item()))
    results.append(("Delete Items (Cleanup)", test_delete_items()))

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
