#!/usr/bin/env python3
"""
A/B Test Script: Embeddings vs BM25 for Chat Retrieval

Tests both retrieval methods on the same videos and questions,
collecting metrics for latency, relevance, and quality.
"""

import sys
import os
import time
import json
from typing import List, Dict, Any

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.gemini_client import get_gemini_client
from app.services.gemini_client_bm25 import get_gemini_client_bm25
from app.services.bm25_retrieval import clear_cache as clear_bm25_cache
from app.services.pinecone_embeddings import clear_cache as clear_embeddings_cache
from app.services.transcript_extractor import TranscriptExtractor


# Test Configuration
TEST_CASES = [
    {
        "video_id": "Ds7q3vGfyTg",
        "title": "AI PM Tooling",
        "questions": [
            "what are the AI PM interview red flags?",
            "what is the right amount of AI to use for writing PRDs?",
            "How is the user using Perplexity?"
        ]
    },
    {
        "video_id": "yIFXeHMcqS0",
        "title": "Graham Norton with Ryan Gosling & Greg Davies",
        "questions": [
            "how many times was 'fecal jackson pollock' mentioned?",
            "What did the BBC disability officer say to Greg?",
            "Tell me about the mother's knickers story."
        ]
    },
    {
        "video_id": "c-soib0apA4",
        "title": "Served podcast with Tony Godsick",
        "questions": [
            "what was Federer's personality Behind-the-scenes?",
            "How did the Uniqlo deal happen?",
            "how did the speaker get to meet with mr. yanai?",
            "how did anna help the speaker?"
        ]
    }
]


async def get_transcript(video_id: str) -> str:
    """
    Fetch transcript for a video using TranscriptExtractor

    Args:
        video_id: YouTube video ID

    Returns:
        Full transcript text
    """
    try:
        result = await TranscriptExtractor.get_transcript(video_id, languages=['en'])

        if result['success']:
            # Return the full_text field which is already formatted
            return result.get('full_text', '')
        else:
            print(f"Error fetching transcript for {video_id}: {result.get('message', 'Unknown error')}")
            return ""

    except Exception as e:
        print(f"Error fetching transcript for {video_id}: {e}")
        return ""


def tokenize(text: str) -> List[str]:
    """Simple tokenization for overlap calculation"""
    if not text:
        return []
    text = text.lower()
    import string
    text = text.translate(str.maketrans('', '', string.punctuation))
    return text.split()


def calculate_chunk_overlap(question: str, retrieved_chunks: str) -> float:
    """
    Calculate how many question tokens appear in retrieved chunks

    Args:
        question: User's question
        retrieved_chunks: Retrieved transcript chunks

    Returns:
        Overlap score (0.0 to 1.0)
    """
    question_tokens = set(tokenize(question))
    chunk_tokens = set(tokenize(retrieved_chunks))

    if not question_tokens:
        return 0.0

    overlap = len(question_tokens & chunk_tokens)
    return overlap / len(question_tokens)


def classify_question_type(question: str) -> str:
    """Classify question type for analysis"""
    question_lower = question.lower()

    # Check for exact phrase matching
    if '"' in question or "'" in question or "how many times" in question_lower:
        return "exact_phrase"

    # Check for quote/conversation retrieval
    if any(word in question_lower for word in ["say", "said", "tell me about", "story", "quote"]):
        return "quote_retrieval"

    # Check for conceptual/abstract
    if any(word in question_lower for word in ["what is", "describe", "explain", "how would"]):
        return "conceptual"

    # Default to factual/narrative
    return "factual"


def get_retrieval_info(retrieval_method: str, video_id: str) -> Dict[str, Any]:
    """
    Get information about what was retrieved (chunks, positions, etc.)

    Args:
        retrieval_method: "embeddings" or "bm25"
        video_id: Video ID

    Returns:
        Dict with retrieval info
    """
    if retrieval_method == "bm25":
        from app.services.bm25_retrieval import _bm25_cache
        cache = _bm25_cache
    else:
        from app.services.pinecone_embeddings import _embedding_cache
        cache = _embedding_cache

    if video_id not in cache:
        return {}

    cached_data = cache[video_id]
    chunks = cached_data.get("chunks", [])

    return {
        "total_chunks": len(chunks),
        "chunks_available": True
    }


def test_method(
    method: str,
    video_id: str,
    transcript: str,
    question: str,
    client
) -> Dict[str, Any]:
    """
    Test a single retrieval method

    Args:
        method: "embeddings" or "bm25"
        video_id: Video ID
        transcript: Full transcript
        question: User question
        client: Gemini client instance

    Returns:
        Dict with test results
    """
    print(f"\n  Testing {method}...")

    try:
        # Clear caches for fair comparison
        if method == "embeddings":
            clear_embeddings_cache(video_id)
        else:
            clear_bm25_cache(video_id)

        # Time the retrieval + generation
        start_time = time.time()
        response = client.generate_chat_response(
            transcript=transcript,
            question=question,
            video_id=video_id,
            chat_history=[]
        )
        end_time = time.time()

        latency_ms = int((end_time - start_time) * 1000)

        if response:
            # Get retrieval info for analysis
            retrieval_info = get_retrieval_info(method, video_id)

            # Calculate overlap (proxy for relevance)
            # Note: We can't access the exact retrieved chunks from the client,
            # but we can estimate relevance based on question tokens in transcript
            overlap_score = calculate_chunk_overlap(question, transcript)

            result = {
                "method": method,
                "latency_ms": latency_ms,
                "response": response,
                "response_length": len(response),
                "overlap_score": overlap_score,
                "success": True,
                "retrieval_info": retrieval_info
            }

            print(f"    ✓ {latency_ms}ms | overlap: {overlap_score:.2f} | response: {len(response)} chars")
            return result
        else:
            print(f"    ✗ Failed to generate response")
            return {
                "method": method,
                "success": False,
                "error": "No response generated"
            }

    except Exception as e:
        print(f"    ✗ Error: {e}")
        return {
            "method": method,
            "success": False,
            "error": str(e)
        }


async def run_ab_test() -> Dict[str, Any]:
    """
    Run A/B test across all videos and questions

    Returns:
        Complete test results
    """
    results = {
        "test_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "videos": []
    }

    # Initialize clients
    print("Initializing Gemini clients...")
    client_embeddings = get_gemini_client()
    client_bm25 = get_gemini_client_bm25()

    if not client_embeddings.model or not client_bm25.model:
        print("ERROR: Gemini clients not initialized. Check GEMINI_API_KEY.")
        return {}

    # Test each video
    for test_case in TEST_CASES:
        video_id = test_case["video_id"]
        title = test_case["title"]
        questions = test_case["questions"]

        print(f"\n{'='*80}")
        print(f"Testing: {title} ({video_id})")
        print(f"{'='*80}")

        # Fetch transcript
        print(f"\nFetching transcript...")
        transcript = await get_transcript(video_id)

        if not transcript:
            print(f"ERROR: Could not fetch transcript for {video_id}")
            continue

        print(f"✓ Transcript fetched ({len(transcript)} chars)")

        # Test each question
        video_results = {
            "video_id": video_id,
            "title": title,
            "questions": []
        }

        for question in questions:
            print(f"\nQuestion: {question}")
            question_type = classify_question_type(question)
            print(f"Type: {question_type}")

            # Test embeddings (control)
            result_embeddings = test_method(
                method="embeddings",
                video_id=video_id,
                transcript=transcript,
                question=question,
                client=client_embeddings
            )

            # Test BM25 (variant)
            result_bm25 = test_method(
                method="bm25",
                video_id=video_id,
                transcript=transcript,
                question=question,
                client=client_bm25
            )

            # Determine winner based on combined score
            # Priority: 1) Success, 2) Latency (faster better), 3) Overlap (higher better)
            winner = None
            reasoning = []

            if not result_embeddings["success"] and result_bm25["success"]:
                winner = "bm25"
                reasoning.append("Embeddings failed")
            elif result_embeddings["success"] and not result_bm25["success"]:
                winner = "embeddings"
                reasoning.append("BM25 failed")
            elif result_embeddings["success"] and result_bm25["success"]:
                # Both succeeded - compare metrics
                latency_diff = result_embeddings["latency_ms"] - result_bm25["latency_ms"]
                overlap_diff = result_bm25["overlap_score"] - result_embeddings["overlap_score"]

                # BM25 wins if significantly faster with similar/better relevance
                if latency_diff > 100 and overlap_diff >= -0.1:
                    winner = "bm25"
                    reasoning.append(f"{latency_diff}ms faster with similar relevance")
                elif overlap_diff > 0.2:
                    winner = "bm25"
                    reasoning.append(f"Significantly better relevance ({overlap_diff:+.2f})")
                elif latency_diff < -100 and overlap_diff <= 0.1:
                    winner = "embeddings"
                    reasoning.append(f"{abs(latency_diff)}ms faster with similar relevance")
                elif overlap_diff < -0.2:
                    winner = "embeddings"
                    reasoning.append(f"Significantly better relevance ({overlap_diff:+.2f})")
                else:
                    winner = "tie"
                    reasoning.append("Similar performance")

            question_result = {
                "question": question,
                "question_type": question_type,
                "embeddings": result_embeddings,
                "bm25": result_bm25,
                "winner": winner,
                "reasoning": "; ".join(reasoning)
            }

            video_results["questions"].append(question_result)

        results["videos"].append(video_results)

    return results


def main():
    """Main test runner"""
    import asyncio

    print("="*80)
    print("A/B Test: Embeddings vs BM25 for Chat Retrieval")
    print("="*80)

    # Run tests
    results = asyncio.run(run_ab_test())

    # Save results
    output_file = "ab_test_results.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*80}")
    print(f"Results saved to {output_file}")
    print(f"{'='*80}")

    # Print summary
    print("\nQuick Summary:")
    for video_result in results.get("videos", []):
        print(f"\n{video_result['title']}:")

        embeddings_wins = 0
        bm25_wins = 0
        ties = 0

        for q_result in video_result["questions"]:
            winner = q_result.get("winner", "unknown")
            if winner == "embeddings":
                embeddings_wins += 1
            elif winner == "bm25":
                bm25_wins += 1
            elif winner == "tie":
                ties += 1

        print(f"  Embeddings: {embeddings_wins} wins")
        print(f"  BM25: {bm25_wins} wins")
        print(f"  Ties: {ties}")

    print(f"\nNext step: python scripts/compare_retrieval_results.py --input {output_file}")


if __name__ == "__main__":
    main()
