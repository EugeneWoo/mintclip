"""
Hybrid Retrieval Service
Uses BM25 as primary method with Pinecone embeddings as fallback

Strategy:
1. Try BM25 first (fast, 2.7x faster)
2. If BM25 returns low-confidence results or fails, fall back to embeddings
3. This gives us BM25's speed for most queries + embeddings' semantic understanding when needed
"""

import re
from typing import Optional, List


def is_empty_or_not_discussed(response: str) -> bool:
    """
    Check if a response indicates the topic wasn't found

    Args:
        response: AI-generated response text

    Returns:
        True if response suggests topic wasn't discussed
    """
    if not response or not response.strip():
        return True

    response_lower = response.lower()

    # Common phrases indicating the topic wasn't found
    not_discussed_phrases = [
        "not discussed in the video",
        "topic is not discussed",
        "does not mention",
        "transcript does not contain",
        "not mentioned in the video",
        "no information about",
        "video does not discuss"
    ]

    for phrase in not_discussed_phrases:
        if phrase in response_lower:
            return True

    # Also check if response is very short (might indicate failure)
    if len(response.strip()) < 50:
        return True

    return False


def retrieve_with_fallback(
    transcript: str,
    question: str,
    video_id: str,
    top_k: int = 3,
    bm25_threshold: float = 0.5
) -> Optional[str]:
    """
    Retrieve relevant chunks using BM25 with embeddings fallback

    Args:
        transcript: Full transcript text
        question: User's question
        video_id: Video identifier
        top_k: Number of chunks to retrieve
        bm25_threshold: Min BM25 score to trust results (0-1)

    Returns:
        Retrieved context, or None if both methods fail
    """
    from app.services.bm25_retrieval import retrieve_relevant_chunks_with_transcript as bm25_retrieve
    from app.services.pinecone_embeddings import get_or_compute_embeddings, find_relevant_chunks

    print(f"\n{'='*60}")
    print(f"Hybrid Retrieval for: {question[:60]}...")
    print(f"{'='*60}")

    # Step 1: Try BM25 (fast)
    print("\n[1/2] Trying BM25 retrieval...")
    try:
        bm25_context = bm25_retrieve(
            transcript=transcript,
            question=question,
            video_id=video_id,
            top_k=top_k
        )

        if bm25_context:
            print(f"✓ BM25 retrieved {len(bm25_context)} chars")

            # Check if BM25 found meaningful content
            if not is_empty_or_not_discussed(bm25_context):
                print(f"✓ BM25 found relevant content - using it")
                return bm25_context
            else:
                print(f"⚠ BM25 returned low-confidence result (topic may not be discussed)")
        else:
            print(f"✗ BM25 failed to retrieve context")

    except Exception as e:
        print(f"✗ BM25 error: {e}")

    # Step 2: Fall back to embeddings (slower but more semantic)
    print("\n[2/2] Falling back to embeddings...")
    try:
        # Get or compute embeddings
        chunks, embeddings = get_or_compute_embeddings(video_id, transcript)

        # Find relevant chunks using embeddings
        embeddings_context = find_relevant_chunks(question, video_id, top_k=top_k)

        if embeddings_context:
            print(f"✓ Embeddings retrieved {len(embeddings_context)} chars")

            # Check if embeddings found meaningful content
            if not is_empty_or_not_discussed(embeddings_context):
                print(f"✓ Embeddings found relevant content - using it")
                return embeddings_context
            else:
                print(f"⚠ Embeddings also couldn't find the topic")
        else:
            print(f"✗ Embeddings failed to retrieve context")

    except Exception as e:
        print(f"✗ Embeddings error: {e}")

    # Both methods failed
    print("\n✗ Both retrieval methods failed - using simple truncation fallback")
    return transcript[:12000] if len(transcript) > 12000 else transcript


async def retrieve_with_fallback_and_response(
    transcript: str,
    question: str,
    video_id: str,
    chat_history: list = None,
    gemini_client = None
) -> Optional[str]:
    """
    Complete pipeline: retrieve context + generate response with smart fallback

    This is the main entry point for the hybrid approach in production.
    Generates response, checks if it indicates "not discussed", and falls back if needed.

    Args:
        transcript: Full transcript text
        question: User's question
        video_id: Video identifier
        chat_history: Previous messages
        gemini_client: GeminiClient instance

    Returns:
        Generated response, or None if failed
    """
    if not gemini_client:
        from app.services.gemini_client import get_gemini_client
        gemini_client = get_gemini_client()

    from app.prompts.chat import build_chat_prompt
    from app.services.bm25_retrieval import retrieve_relevant_chunks_with_transcript as bm25_retrieve
    from app.services.pinecone_embeddings import get_or_compute_embeddings, find_relevant_chunks

    print(f"\n{'='*60}")
    print(f"Smart Hybrid Retrieval for: {question[:60]}...")
    print(f"{'='*60}")

    # Try BM25 first
    print("\n[1/3] Trying BM25 retrieval...")
    try:
        bm25_context = bm25_retrieve(
            transcript=transcript,
            question=question,
            video_id=video_id,
            top_k=3
        )

        if bm25_context:
            # Generate response with BM25 context
            print(f"[2/3] Generating response with BM25 context...")
            prompt = build_chat_prompt(bm25_context, question, chat_history)
            response_text = gemini_client.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=500,
            )

            if response_text and not is_empty_or_not_discussed(response_text):
                print(f"[3/3] ✓ BM25 response successful - using it")
                return response_text
            else:
                print(f"[3/3] ⚠ BM25 response indicates topic not discussed")
                if response_text:
                    print(f"      BM25 response: {response_text[:100]}...")
        else:
            print(f"[2/3] ✗ BM25 retrieval failed")

    except Exception as e:
        print(f"✗ BM25 error: {e}")

    # Fall back to embeddings
    print(f"\n[2/3] Falling back to embeddings...")
    try:
        chunks, embeddings = get_or_compute_embeddings(video_id, transcript)
        embeddings_context = find_relevant_chunks(question, video_id, top_k=3)

        if embeddings_context:
            # Generate response with embeddings context
            print(f"[3/3] Generating response with embeddings context...")
            prompt = build_chat_prompt(embeddings_context, question, chat_history)
            response_text = gemini_client.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=500,
            )

            if response_text:
                if is_empty_or_not_discussed(response_text):
                    print(f"[3/3] ⚠ Embeddings also couldn't find topic")
                else:
                    print(f"[3/3] ✓ Embeddings response successful - using it")
                return response_text
        else:
            print(f"[3/3] ✗ Embeddings retrieval failed")

    except Exception as e:
        print(f"✗ Embeddings error: {e}")

    print("\n✗ Both methods failed")
    return None


def clear_all_caches(video_id: Optional[str] = None):
    """
    Clear caches for both BM25 and embeddings

    Args:
        video_id: Specific video to clear, or None to clear all
    """
    from app.services.bm25_retrieval import clear_cache as clear_bm25
    from app.services.pinecone_embeddings import clear_cache as clear_embeddings

    if video_id:
        clear_bm25(video_id)
        clear_embeddings(video_id)
        print(f"Cleared hybrid caches for {video_id}")
    else:
        clear_bm25()
        clear_embeddings()
        print("Cleared all hybrid caches")
