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

from app.services.cache import get_cache, TTL_CHAT_MESSAGE

EMBEDDING_CACHE_PREFIX = "embedding_chunks:"


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
    Get cached embeddings or compute new ones.
    Chunks and embedding vectors are cached with 24h TTL.

    Args:
        video_id: Video identifier
        transcript: Full transcript text

    Returns:
        Tuple of (chunks, embeddings)
    """
    cache = get_cache()
    cache_key = f"{EMBEDDING_CACHE_PREFIX}{video_id}"

    cached = cache.get(cache_key)
    if cached is not None:
        print(f"Using cached embeddings for {video_id}")
        chunks = cached["chunks"]
        embeddings = np.array(cached["embeddings"])
        return chunks, embeddings

    # Compute new embeddings
    print(f"Computing embeddings for {video_id}")
    chunks = chunk_transcript(transcript)
    embeddings = compute_embeddings(chunks)

    if embeddings is None:
        return chunks, None

    # Cache chunks + embedding vectors with 24h TTL
    cache.set(cache_key, {
        "chunks": chunks,
        "embeddings": embeddings.tolist()  # numpy → list for JSON serialization
    }, TTL_CHAT_MESSAGE)

    print(f"Cached {len(chunks)} chunks with embeddings for {video_id} (24h TTL)")
    return chunks, embeddings


def find_relevant_chunks(
    question: str,
    video_id: str,
    transcript: str,
    top_k: int = 5
) -> Optional[str]:
    """
    Find most relevant transcript chunks for a question using embeddings.
    Fetches cached embeddings (or computes fresh ones) then does cosine similarity.

    Args:
        question: User's question
        video_id: Video identifier
        transcript: Full transcript text (used if embeddings not cached)
        top_k: Number of chunks to retrieve

    Returns:
        Concatenated relevant chunks, or None if failed
    """
    pc = get_pinecone_client()
    if not pc:
        return None

    try:
        chunks, chunk_embeddings = get_or_compute_embeddings(video_id, transcript)

        if chunk_embeddings is None:
            return None

        # Embed the question
        question_embedding = pc.inference.embed(
            model="multilingual-e5-large",
            inputs=[question],
            parameters={"input_type": "query"}
        )

        question_vec = np.array(question_embedding[0].values)

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
    Clear embedding cache (TTL handles expiry automatically,
    but this allows manual invalidation).

    Args:
        video_id: Specific video to clear, or None to clear all
    """
    cache = get_cache()
    if video_id:
        cache.delete(f"{EMBEDDING_CACHE_PREFIX}{video_id}")
        print(f"Cleared embeddings for {video_id}")
    else:
        print("clear_cache(all) not supported for embeddings — TTL will handle expiry")
