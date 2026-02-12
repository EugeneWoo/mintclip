#!/usr/bin/env python3
"""
Test script to measure summary generation time for a specific video
"""
import sys
import os
import time
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env
backend_dir = os.path.join(os.path.dirname(__file__), '..')
load_dotenv(os.path.join(backend_dir, '.env'))

# Add parent directory to path
sys.path.insert(0, backend_dir)

from app.services.gemini_client import get_gemini_client
from app.services.transcript_extractor import TranscriptExtractor


async def test_summary_timing(video_id: str, format: str = 'qa'):
    """Measure time to generate summary for a video"""
    print(f"Testing summary generation for video: {video_id}")
    print(f"Format: {format}")
    print("-" * 60)

    # Step 1: Fetch transcript
    print("\n1. Fetching transcript...")
    start_fetch = time.time()
    try:
        result = await TranscriptExtractor.get_transcript(video_id, languages=['en'])
        transcript_text = result.get('full_transcript', '')
        fetch_time = time.time() - start_fetch
        print(f"   ✓ Transcript fetched in {fetch_time:.2f}s")
        print(f"   Transcript length: {len(transcript_text)} characters")
        print(f"   Language: {result.get('language', 'unknown')}")
    except Exception as e:
        print(f"   ✗ Error fetching transcript: {e}")
        import traceback
        traceback.print_exc()
        return

    # Step 2: Generate summary
    print(f"\n2. Generating {format} summary with Gemini...")
    start_summary = time.time()
    try:
        client = get_gemini_client()
        if not client.model:
            print("   ✗ Gemini client not initialized")
            return

        summary = client.generate_summary(transcript_text, format=format)
        summary_time = time.time() - start_summary

        if summary:
            print(f"   ✓ Summary generated in {summary_time:.2f}s")
            print(f"   Summary length: {len(summary)} characters")
            print(f"\n   Preview:\n   {summary[:300]}...")
        else:
            print(f"   ✗ No summary generated (took {summary_time:.2f}s)")
    except Exception as e:
        summary_time = time.time() - start_summary
        print(f"   ✗ Error generating summary ({summary_time:.2f}s): {e}")
        import traceback
        traceback.print_exc()

    # Total time
    total_time = fetch_time + summary_time
    print("\n" + "=" * 60)
    print(f"TIMING SUMMARY:")
    print(f"  Transcript fetch: {fetch_time:.2f}s")
    print(f"  Summary generation: {summary_time:.2f}s")
    print(f"  Total time: {total_time:.2f}s")
    print("=" * 60)


if __name__ == "__main__":
    video_id = sys.argv[1] if len(sys.argv) > 1 else "PmW_TMQ3l0I"
    format = sys.argv[2] if len(sys.argv) > 2 else "qa"

    asyncio.run(test_summary_timing(video_id, format))
