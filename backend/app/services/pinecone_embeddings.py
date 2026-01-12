"""
Pinecone Embeddings Service
Free embedding API for semantic search over video transcripts
"""

import os
import numpy as np
from typing import List, Tuple, Optional

try:
    from pinecone import Pinecone
    PINEcone_AVAILABLE = True
except ImportError:
    print("WARNING: pinecone package not installed. Run: pip install pinecone")
    PINEcone_AVAILABLE = False

# In-memory cache for video embeddings
# Format: {video_id: {"chunks": [str], "embeddings": np.array}}
_embedding_cache = {}


def get_pinecone_client():
    """Get Pinecone client for free embeddings"""
    if not PINEcone_AVAILABLE:
        print("WARNING: pinecone package not installed")
        return None

    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("WARNING: PINECONE_API_KEY not set, embeddings disabled")
        return None

    try:
        return Pinecone(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Pinecone: {e}")
        return None


def chunk_transcript(
    transcript: str,
    chunk_size: int = 1000,
    overlap: int = 100
) -> List[str]:
    """
    Split transcript into overlapping chunks

    Uses industry-standard chunk size for RAG systems:
    - 1000 characters provides good balance of context and precision
    - 10% overlap prevents information loss at chunk boundaries
    - Aligns with Pinecone and LangChain best practices

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


def compute_embeddings(chunks: List[str]) -> Optional[np.ndarray]:
    """
    Compute embeddings for text chunks using Pinecone

    Args:
        chunks: List of text chunks

    Returns:
        numpy array of embeddings (shape: [n_chunks, embedding_dim])
    """
    pc = get_pinecone_client()
    if not pc:
        return None

    try:
        # Use Pinecone's free embedding model
        # multilingual-e5-large supports 100+ languages and is free
        embeddings = pc.inference.embed(
            model="multilingual-e5-large",
            inputs=chunks,
            parameters={"input_type": "passage"}
        )

        # Convert to numpy array for fast similarity search
        return np.array([e.values for e in embeddings])

    except Exception as e:
        print(f"Error computing embeddings: {e}")
        return None


def get_or_compute_embeddings(
    video_id: str,
    transcript: str
) -> Tuple[List[str], Optional[np.ndarray]]:
    """
    Get cached embeddings or compute new ones

    Args:
        video_id: Video identifier
        transcript: Full transcript text

    Returns:
        Tuple of (chunks, embeddings)
    """
    global _embedding_cache

    # Check cache first
    if video_id in _embedding_cache:
        print(f"Using cached embeddings for {video_id}")
        return (
            _embedding_cache[video_id]["chunks"],
            _embedding_cache[video_id]["embeddings"]
        )

    # Compute new embeddings
    print(f"Computing embeddings for {video_id}")
    chunks = chunk_transcript(transcript)
    embeddings = compute_embeddings(chunks)

    if embeddings is None:
        return chunks, None

    # Cache in memory
    _embedding_cache[video_id] = {
        "chunks": chunks,
        "embeddings": embeddings
    }

    print(f"Cached {len(chunks)} chunks with embeddings for {video_id}")
    return chunks, embeddings


def find_relevant_chunks(
    question: str,
    video_id: str,
    top_k: int = 3
) -> Optional[str]:
    """
    Find most relevant transcript chunks for a question

    Args:
        question: User's question
        video_id: Video identifier
        top_k: Number of chunks to retrieve

    Returns:
        Concatenated relevant chunks, or None if failed
    """
    global _embedding_cache

    if video_id not in _embedding_cache:
        print(f"No embeddings found for {video_id}")
        return None

    pc = get_pinecone_client()
    if not pc:
        return None

    try:
        # Embed the question
        question_embedding = pc.inference.embed(
            model="multilingual-e5-large",
            inputs=[question],
            parameters={"input_type": "query"}
        )

        question_vec = np.array(question_embedding[0].values)

        # Get cached data
        chunks = _embedding_cache[video_id]["chunks"]
        chunk_embeddings = _embedding_cache[video_id]["embeddings"]

        # Compute cosine similarity
        similarities = np.dot(chunk_embeddings, question_vec) / (
            np.linalg.norm(chunk_embeddings, axis=1) * np.linalg.norm(question_vec)
        )

        # Get top-k indices
        top_indices = np.argsort(similarities)[-top_k:][::-1]

        # Combine chunks
        relevant_chunks = [chunks[i] for i in top_indices]
        combined = "\n\n".join(relevant_chunks)

        print(f"Retrieved {len(relevant_chunks)} chunks (max similarity: {similarities[top_indices[0]]:.3f})")
        return combined

    except Exception as e:
        print(f"Error finding relevant chunks: {e}")
        return None


def clear_cache(video_id: Optional[str] = None):
    """
    Clear embedding cache

    Args:
        video_id: Specific video to clear, or None to clear all
    """
    global _embedding_cache

    if video_id:
        _embedding_cache.pop(video_id, None)
        print(f"Cleared embeddings for {video_id}")
    else:
        _embedding_cache.clear()
        print("Cleared all embeddings")
