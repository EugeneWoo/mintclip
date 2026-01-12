#!/usr/bin/env python3
"""
Terminal Test Script for YT Coach Backend API
Test transcript extraction, summarization, and suggested questions

Usage:
    python test_api.py
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

# Test video: Rick Astley - Never Gonna Give You Up
TEST_VIDEO_ID = "dQw4w9WgXcQ"
TEST_VIDEO_URL = f"https://www.youtube.com/watch?v={TEST_VIDEO_ID}"


def print_header(text):
    """Print formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def test_transcript_extraction():
    """Test 1: Extract transcript from YouTube video"""
    print_header("TEST 1: Transcript Extraction")

    payload = {
        "video_id": TEST_VIDEO_ID,
        "video_url": TEST_VIDEO_URL
    }

    print(f"Requesting transcript for: {TEST_VIDEO_URL}")
    print(f"Video ID: {TEST_VIDEO_ID}\n")

    try:
        response = requests.post(
            f"{API_BASE}/transcript/extract",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()

            if data.get("success"):
                transcript_entries = data.get("transcript", [])
                full_text = data.get("full_text", "")
                language = data.get("language", "en")

                print(f"✅ SUCCESS!")
                print(f"Language: {language}")
                print(f"Transcript entries: {len(transcript_entries)}")
                print(f"Full text length: {len(full_text)} characters\n")

                # Show first 3 entries
                print("First 3 transcript entries:")
                for i, entry in enumerate(transcript_entries[:3]):
                    print(f"  [{entry['timestamp']}] {entry['text']}")

                print(f"\nFull text preview (first 500 chars):")
                print(f"{full_text[:500]}...\n")

                return data  # Return for use in other tests
            else:
                print(f"❌ FAILED: {data.get('error', 'Unknown error')}\n")
                return None
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}\n")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}\n")
        return None


def test_summary_generation(transcript_data):
    """Test 2: Generate summary from transcript"""
    print_header("TEST 2: Summary Generation")

    if not transcript_data or not transcript_data.get("success"):
        print("⏭️  SKIPPED: No transcript data from previous test\n")
        return

    full_text = transcript_data.get("full_text", "")
    if not full_text:
        print("⏭️  SKIPPED: No full_text in transcript data\n")
        return

    # Test different summary configurations
    test_configs = [
        {"format": "qa", "detail": "short", "focus": "insightful", "name": "Q&A Short Insightful"},
        {"format": "listicle", "detail": "detailed", "focus": "actionable", "name": "Listicle Detailed Actionable"},
    ]

    for config in test_configs:
        print(f"Testing: {config['name']}")
        print(f"  Format: {config['format']}, Detail: {config['detail']}, Focus: {config['focus']}\n")

        payload = {
            "video_id": TEST_VIDEO_ID,
            "transcript": full_text,
            "format": config["format"],
            "detail": config["detail"],
            "focus": config["focus"]
        }

        try:
            response = requests.post(
                f"{API_BASE}/summary/generate",
                json=payload,
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()

                if data.get("success"):
                    summary = data.get("summary", "")
                    cached = data.get("cached", False)

                    print(f"✅ SUCCESS! {' (cached)' if cached else ''}")
                    print(f"Summary length: {len(summary)} characters\n")
                    print(f"Summary preview:")
                    print(f"{summary[:500]}...\n")
                else:
                    error = data.get("error", "Unknown error")
                    print(f"❌ FAILED: {error}\n")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}\n")

        except requests.exceptions.RequestException as e:
            print(f"❌ REQUEST ERROR: {e}\n")

        print("-" * 80 + "\n")


def test_suggested_questions(transcript_data):
    """Test 3: Generate suggested questions"""
    print_header("TEST 3: Suggested Questions Generation")

    if not transcript_data or not transcript_data.get("success"):
        print("⏭️  SKIPPED: No transcript data from previous test\n")
        return

    full_text = transcript_data.get("full_text", "")
    if not full_text:
        print("⏭️  SKIPPED: No full_text in transcript data\n")
        return

    payload = {
        "video_id": TEST_VIDEO_ID,
        "transcript": full_text
    }

    print(f"Requesting suggested questions for video: {TEST_VIDEO_ID}\n")

    try:
        response = requests.post(
            f"{API_BASE}/chat/suggested-questions",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()

            if data.get("success"):
                questions = data.get("questions", [])
                cached = data.get("cached", False)

                print(f"✅ SUCCESS! {' (cached)' if cached else ''}")
                print(f"Generated {len(questions)} questions:\n")

                for i, question in enumerate(questions, 1):
                    print(f"  {i}. {question}")

                print()
            else:
                error = data.get("error", "Unknown error")
                print(f"❌ FAILED: {error}\n")
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}\n")

    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}\n")


def test_chat_message(transcript_data):
    """Test 4: Send chat message and get AI response"""
    print_header("TEST 4: Chat Message")

    if not transcript_data or not transcript_data.get("success"):
        print("⏭️  SKIPPED: No transcript data from previous test\n")
        return

    full_text = transcript_data.get("full_text", "")
    if not full_text:
        print("⏭️  SKIPPED: No full_text in transcript data\n")
        return

    # Test a few different questions
    test_questions = [
        "What is this video about?",
        "What are the key takeaways?",
    ]

    for i, question in enumerate(test_questions, 1):
        print(f"Question {i}: {question}\n")

        payload = {
            "video_id": TEST_VIDEO_ID,
            "transcript": full_text,
            "question": question,
            "chat_history": []
        }

        try:
            response = requests.post(
                f"{API_BASE}/chat/message",
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()

                if data.get("success"):
                    response_text = data.get("response", "")

                    print(f"✅ SUCCESS!")
                    print(f"Response length: {len(response_text)} characters\n")
                    print(f"Response:")
                    print(f"{response_text}\n")
                else:
                    error = data.get("error", "Unknown error")
                    print(f"❌ FAILED: {error}\n")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}\n")

        except requests.exceptions.RequestException as e:
            print(f"❌ REQUEST ERROR: {e}\n")

        if i < len(test_questions):
            print("-" * 80 + "\n")


def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("  YT COACH BACKEND API TEST SUITE")
    print("=" * 80)
    print("\nTesting backend API endpoints...")
    print(f"API Base URL: {API_BASE}")
    print(f"Test Video: {TEST_VIDEO_URL}\n")

    # Run tests in sequence
    transcript_data = test_transcript_extraction()
    test_summary_generation(transcript_data)
    test_suggested_questions(transcript_data)
    test_chat_message(transcript_data)

    print_header("TESTS COMPLETE")
    print("Note: If Gemini features failed, it's due to Python 3.14 incompatibility.")
    print("Transcript extraction should work (uses youtube-transcript-api).")
    print("Summary, questions, and chat will return errors until you use Python 3.11/3.12.\n")


if __name__ == "__main__":
    main()
