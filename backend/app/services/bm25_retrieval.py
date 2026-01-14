"""
BM25 Lexical Retrieval Service
Alternative to Pinecone embeddings for semantic search over video transcripts
Uses BM25 algorithm for fast, keyword-based retrieval
"""

import re
import string
from typing import List, Tuple, Optional

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    print("WARNING: rank-bm25 package not installed. Run: pip install rank-bm25")
    BM25_AVAILABLE = False

# In-memory cache for video BM25 indexes
# Format: {video_id: {"chunks": [str], "tokenized": [[str]], "bm25": BM25Okapi}}
_bm25_cache = {}


def chunk_transcript(
    transcript: str,
    chunk_size: int = 1000,
    overlap: int = 100
) -> List[str]:
    """
    Split transcript into overlapping chunks

    Uses same strategy as pinecone_embeddings.py for consistency:
    - 1000 characters provides good balance of context and precision
    - 10% overlap prevents information loss at chunk boundaries

    Args:
        transcript: Full transcript text
        chunk_size: Target chunk size in characters (default: 1000)
        overlap: Overlap between chunks (default: 100, 10% of chunk_size)

    Returns:
        List of transcript chunks
    """
    chunks = []
    start = 0
    length = len(transcript)

    while start < length:
        end = start + chunk_size
        chunk = transcript[start:end]

        # Don't add tiny chunks at the end
        if len(chunk) > 100:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def tokenize(text: str) -> List[str]:
    """
    Tokenize text for BM25 indexing

    Uses simple whitespace + lowercase tokenization.
    Removes punctuation for cleaner matching.
    Works well across multiple languages.

    Args:
        text: Text to tokenize

    Returns:
        List of tokens
    """
    if not text:
        return []

    # Convert to lowercase
    text = text.lower()

    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))

    # Split on whitespace
    tokens = text.split()

    return tokens


def build_bm25_index(chunks: List[str]) -> Tuple[BM25Okapi, List[List[str]]]:
    """
    Build BM25 index from transcript chunks

    Args:
        chunks: List of transcript chunks

    Returns:
        Tuple of (BM25Okapi instance, tokenized chunks)
    """
    if not BM25_AVAILABLE:
        raise RuntimeError("rank-bm25 package not available")

    # Tokenize all chunks
    tokenized_chunks = [tokenize(chunk) for chunk in chunks]

    # Create BM25 index
    bm25 = BM25Okapi(tokenized_chunks)

    return bm25, tokenized_chunks


def get_or_build_bm25_index(
    video_id: str,
    transcript: str
) -> Tuple[List[str], BM25Okapi]:
    """
    Get cached BM25 index or build new one

    Args:
        video_id: Video identifier
        transcript: Full transcript text

    Returns:
        Tuple of (chunks, bm25_index)
    """
    global _bm25_cache

    # Check cache first
    if video_id in _bm25_cache:
        print(f"Using cached BM25 index for {video_id}")
        return (
            _bm25_cache[video_id]["chunks"],
            _bm25_cache[video_id]["bm25"]
        )

    # Build new index
    print(f"Building BM25 index for {video_id}")
    chunks = chunk_transcript(transcript)
    bm25_index, tokenized_chunks = build_bm25_index(chunks)

    # Cache in memory
    _bm25_cache[video_id] = {
        "chunks": chunks,
        "tokenized": tokenized_chunks,
        "bm25": bm25_index
    }

    print(f"Cached {len(chunks)} chunks with BM25 index for {video_id}")
    return chunks, bm25_index


def retrieve_relevant_chunks(
    question: str,
    video_id: str,
    top_k: int = 5
) -> Optional[str]:
    """
    Find most relevant transcript chunks for a question using BM25

    Args:
        question: User's question
        video_id: Video identifier
        top_k: Number of chunks to retrieve

    Returns:
        Concatenated relevant chunks, or None if failed
    """
    global _bm25_cache

    if not BM25_AVAILABLE:
        print("ERROR: rank-bm25 package not available")
        return None

    if video_id not in _bm25_cache:
        print(f"ERROR: No BM25 index found for {video_id}")
        return None

    try:
        # Get cached data
        chunks = _bm25_cache[video_id]["chunks"]
        bm25 = _bm25_cache[video_id]["bm25"]

        # Tokenize question
        question_tokens = tokenize(question)

        # Get BM25 scores for all chunks
        scores = bm25.get_scores(question_tokens)

        # Get top-k indices
        import numpy as np
        top_indices = np.argsort(scores)[-top_k:][::-1]

        # Combine chunks
        relevant_chunks = [chunks[i] for i in top_indices]
        combined = "\n\n".join(relevant_chunks)

        print(f"BM25 retrieved {len(relevant_chunks)} chunks (max score: {scores[top_indices[0]]:.3f})")
        return combined

    except Exception as e:
        print(f"Error retrieving BM25 chunks: {e}")
        return None


def retrieve_relevant_chunks_with_transcript(
    transcript: str,
    question: str,
    video_id: str,
    top_k: int = 3
) -> Optional[str]:
    """
    Retrieve relevant chunks without requiring pre-built index

    This is a convenience function that builds the index if needed.
    Used by gemini_client_bm25.py for on-the-fly retrieval.

    Args:
        transcript: Full transcript text
        question: User's question
        video_id: Video identifier
        top_k: Number of chunks to retrieve

    Returns:
        Concatenated relevant chunks, or None if failed
    """
    try:
        # Build or get cached index
        chunks, bm25_index = get_or_build_bm25_index(video_id, transcript)

        # Retrieve chunks
        relevant_context = retrieve_relevant_chunks(question, video_id, top_k=top_k)

        return relevant_context

    except Exception as e:
        print(f"Error in retrieve_relevant_chunks_with_transcript: {e}")
        return None


def clear_cache(video_id: Optional[str] = None):
    """
    Clear BM25 index cache

    Args:
        video_id: Specific video to clear, or None to clear all
    """
    global _bm25_cache

    if video_id:
        _bm25_cache.pop(video_id, None)
        print(f"Cleared BM25 index for {video_id}")
    else:
        _bm25_cache.clear()
        print("Cleared all BM25 indexes")
