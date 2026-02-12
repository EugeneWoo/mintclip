#!/usr/bin/env python3
"""
Test script to measure FULL summary generation flow (end-to-end)
This mirrors the actual API call from extension button click to display
"""
import sys
import os
import time
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables from .env
backend_dir = os.path.join(os.path.dirname(__file__), '..')
load_dotenv(os.path.join(backend_dir, '.env'))

# Add parent directory to path
sys.path.insert(0, backend_dir)

from app.services.gemini_client import get_gemini_client
from app.services.transcript_extractor import TranscriptExtractor
from app.services.cache import get_cache, TTL_SUMMARY


async def test_full_summary_flow(video_id: str, format: str = 'qa', use_cache: bool = False):
    """
    Test the FULL summary generation flow from button click to display
    This includes:
    1. Transcript extraction
    2. Cache check
    3. JSON parsing (if structured)
    4. Translation (if non-English)
    5. Gemini summary generation
    6. Timestamp conversion
    7. Cache storage
    """
    print(f"Testing FULL summary flow for video: {video_id}")
    print(f"Format: {format}")
    print(f"Use cache: {use_cache}")
    print("=" * 80)

    total_start = time.time()

    # Step 1: Fetch transcript (what happens when user opens sidebar)
    print("\n[1/6] Fetching transcript from YouTube API...")
    step1_start = time.time()
    try:
        result = await TranscriptExtractor.get_transcript(video_id, languages=['en'])
        transcript_data = result.get('transcript', [])
        language = result.get('language', 'en')
        step1_time = time.time() - step1_start

        print(f"   ✓ Transcript fetched in {step1_time:.2f}s")
        print(f"   - Segments: {len(transcript_data)}")
        print(f"   - Language: {language}")

        # Convert to JSON (what the frontend sends)
        transcript_json = json.dumps(transcript_data)
        full_transcript_text = ' '.join([seg.get('text', '') for seg in transcript_data])
        print(f"   - Total text length: {len(full_transcript_text)} characters")
    except Exception as e:
        print(f"   ✗ Error fetching transcript: {e}")
        import traceback
        traceback.print_exc()
        return

    # Step 2: Check cache (what backend does first)
    print(f"\n[2/6] Checking cache for existing summary...")
    step2_start = time.time()
    cache = get_cache()
    cache_key = f"summary:{video_id}:{format}"

    if not use_cache:
        # Clear cache for testing
        cache.delete(cache_key)
        print(f"   ⚠ Cache cleared for testing")

    cached_summary = cache.get(cache_key)
    step2_time = time.time() - step2_start

    if cached_summary:
        print(f"   ✓ Cache HIT in {step2_time:.3f}s - returning cached summary")
        total_time = time.time() - total_start
        print("\n" + "=" * 80)
        print(f"TOTAL TIME (cached): {total_time:.2f}s")
        print("=" * 80)
        return
    else:
        print(f"   ✓ Cache MISS in {step2_time:.3f}s - will generate new summary")

    # Step 3: Parse JSON and convert to structured format
    print(f"\n[3/6] Parsing transcript JSON and structuring...")
    step3_start = time.time()
    try:
        transcript_segments = json.loads(transcript_json)
        # Convert to structured text with timestamps
        structured_text = "\n\n".join([
            f"{seg.get('text', '').strip()} ({seg.get('timestamp', '00:00')})"
            for seg in transcript_segments
        ])
        transcript_text = structured_text
        is_structured = True
        step3_time = time.time() - step3_start
        print(f"   ✓ Structured transcript created in {step3_time:.3f}s")
        print(f"   - Segments: {len(transcript_segments)}")
    except Exception as e:
        print(f"   ⚠ Using plain text (not structured): {e}")
        transcript_text = full_transcript_text
        is_structured = False
        step3_time = time.time() - step3_start

    # Step 4: Translation (if needed - skip for English)
    print(f"\n[4/6] Translation check...")
    step4_start = time.time()
    if language != 'en':
        print(f"   ⚠ Would translate from {language} to English")
        translation_cache_key = f"translation:{video_id}:{language}"
        cached_translation = cache.get(translation_cache_key)

        if cached_translation:
            print(f"   ✓ Using cached translation")
            transcript_text = cached_translation
        else:
            print(f"   ⚠ Would call Gemini translate_to_english()")
            gemini_client = get_gemini_client()
            translated = gemini_client.translate_to_english(full_transcript_text)
            if translated:
                transcript_text = translated
                cache.set(translation_cache_key, translated, TTL_SUMMARY)
    else:
        print(f"   ✓ Transcript is in English, no translation needed")
    step4_time = time.time() - step4_start
    print(f"   - Translation check took {step4_time:.3f}s")

    # Step 5: Generate summary with Gemini (THE KEY STEP)
    print(f"\n[5/6] Generating {format} summary with Gemini 2.5-flash-lite...")
    step5_start = time.time()
    try:
        gemini_client = get_gemini_client()
        if not gemini_client.model:
            print("   ✗ Gemini client not initialized")
            return

        summary = gemini_client.generate_summary(
            transcript=transcript_text,
            format=format
        )
        step5_time = time.time() - step5_start

        if summary:
            print(f"   ✓ Summary generated in {step5_time:.2f}s")
            print(f"   - Summary length: {len(summary)} characters")
            print(f"\n   Preview:\n   {summary[:250]}...")
        else:
            print(f"   ✗ No summary generated (took {step5_time:.2f}s)")
            return
    except Exception as e:
        step5_time = time.time() - step5_start
        print(f"   ✗ Error generating summary ({step5_time:.2f}s): {e}")
        import traceback
        traceback.print_exc()
        return

    # Step 6: Convert timestamps to clickable links
    print(f"\n[6/6] Converting timestamps to clickable links...")
    step6_start = time.time()
    if is_structured:
        import re
        timestamp_pattern = r'\((\d{1,2}:\d{2})\)|\[(\d{1,2}:\d{2})\]'
        matches = re.findall(timestamp_pattern, summary)
        timestamp_count = len(matches)

        # Simulate the conversion (don't actually do it to keep output clean)
        print(f"   ✓ Would convert {timestamp_count} timestamps to links")
    else:
        print(f"   ⚠ Not structured, skipping timestamp conversion")
    step6_time = time.time() - step6_start
    print(f"   - Conversion check took {step6_time:.3f}s")

    # Cache the result
    cache.set(cache_key, summary, TTL_SUMMARY)
    print(f"\n   ✓ Summary cached for 7 days")

    # Calculate total time
    total_time = time.time() - total_start

    print("\n" + "=" * 80)
    print(f"TIMING BREAKDOWN:")
    print(f"  [1] Transcript fetch:        {step1_time:>6.2f}s  ({step1_time/total_time*100:>5.1f}%)")
    print(f"  [2] Cache check:             {step2_time:>6.3f}s  ({step2_time/total_time*100:>5.1f}%)")
    print(f"  [3] JSON parsing/structure:  {step3_time:>6.3f}s  ({step3_time/total_time*100:>5.1f}%)")
    print(f"  [4] Translation check:       {step4_time:>6.3f}s  ({step4_time/total_time*100:>5.1f}%)")
    print(f"  [5] Gemini summary:          {step5_time:>6.2f}s  ({step5_time/total_time*100:>5.1f}%)")
    print(f"  [6] Timestamp conversion:    {step6_time:>6.3f}s  ({step6_time/total_time*100:>5.1f}%)")
    print(f"  " + "-" * 50)
    print(f"  TOTAL TIME:                  {total_time:>6.2f}s")
    print("=" * 80)


if __name__ == "__main__":
    video_id = sys.argv[1] if len(sys.argv) > 1 else "PmW_TMQ3l0I"
    format = sys.argv[2] if len(sys.argv) > 2 else "qa"
    use_cache = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else False

    asyncio.run(test_full_summary_flow(video_id, format, use_cache))
