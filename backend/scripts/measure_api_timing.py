#!/usr/bin/env python3
"""
Measure actual API timing by calling the /api/summary/generate endpoint directly
This simulates the exact API call from the Chrome extension
"""
import sys
import os
import time
import requests
import json
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.join(os.path.dirname(__file__), '..')
load_dotenv(os.path.join(backend_dir, '.env'))

# Add parent directory to path
sys.path.insert(0, backend_dir)

from app.services.transcript_extractor import TranscriptExtractor
import asyncio


async def measure_api_timing(video_id: str, format: str = 'qa', api_url: str = 'http://localhost:8000'):
    """
    Measure actual API response time for summary generation
    """
    print(f"Measuring API timing for video: {video_id}")
    print(f"Format: {format}")
    print(f"API URL: {api_url}")
    print("=" * 80)

    # Step 1: Fetch transcript (simulating what extension does)
    print("\n[1] Fetching transcript...")
    fetch_start = time.time()
    try:
        result = await TranscriptExtractor.get_transcript(video_id, languages=['en'])
        transcript_data = result.get('transcript', [])
        language = result.get('language', 'en')
        fetch_time = time.time() - fetch_start

        print(f"   ✓ Transcript fetched in {fetch_time:.2f}s")
        print(f"   - Segments: {len(transcript_data)}")
        print(f"   - Language: {language}")

        # Convert to JSON (what the frontend sends)
        transcript_json = json.dumps(transcript_data)
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return

    # Step 2: Call API endpoint directly (measure network + backend processing)
    print(f"\n[2] Calling /api/summary/generate endpoint...")
    api_start = time.time()
    try:
        response = requests.post(
            f"{api_url}/api/summary/generate",
            json={
                "video_id": video_id,
                "transcript": transcript_json,
                "format": format,
                "language": language
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        api_time = time.time() - api_start

        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ API responded in {api_time:.2f}s")
            print(f"   - Success: {data.get('success')}")
            print(f"   - Cached: {data.get('cached', False)}")
            print(f"   - Summary length: {len(data.get('summary', ''))} characters")
            print(f"   - Is structured: {data.get('is_structured', False)}")

            if data.get('summary'):
                print(f"\n   Preview:\n   {data['summary'][:250]}...")
        else:
            print(f"   ✗ API error ({api_time:.2f}s): HTTP {response.status_code}")
            print(f"   {response.text}")
            return

    except requests.exceptions.Timeout:
        api_time = time.time() - api_start
        print(f"   ✗ Request timed out after {api_time:.2f}s")
        return
    except Exception as e:
        api_time = time.time() - api_start
        print(f"   ✗ Error ({api_time:.2f}s): {e}")
        return

    # Total time
    total_time = fetch_time + api_time

    print("\n" + "=" * 80)
    print(f"TIMING SUMMARY:")
    print(f"  [1] Transcript fetch (extension): {fetch_time:>6.2f}s  ({fetch_time/total_time*100:>5.1f}%)")
    print(f"  [2] API call (backend):           {api_time:>6.2f}s  ({api_time/total_time*100:>5.1f}%)")
    print(f"  " + "-" * 56)
    print(f"  TOTAL (button click to display):  {total_time:>6.2f}s")
    print("=" * 80)
    print(f"\nNote: This simulates the full flow from button click to display.")
    print(f"      If you're seeing 30+ seconds, check for:")
    print(f"      - Network latency between extension and backend")
    print(f"      - Backend startup time if server was sleeping")
    print(f"      - Multiple transcript fetches (check browser console)")


if __name__ == "__main__":
    video_id = sys.argv[1] if len(sys.argv) > 1 else "PmW_TMQ3l0I"
    format = sys.argv[2] if len(sys.argv) > 2 else "qa"
    api_url = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8000"

    asyncio.run(measure_api_timing(video_id, format, api_url))
