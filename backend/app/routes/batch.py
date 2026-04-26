"""
Batch Processing API Routes
Endpoints for processing multiple YouTube videos at once
"""

import uuid
import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from app.middleware.auth import require_auth
from app.services.cache import (
    set_job_status, get_job_status, update_job_progress, TTL_BATCH_JOB
)
from app.services.pinecone_embeddings import get_or_compute_embeddings
from app.services.transcript_extractor import TranscriptExtractor
from app.services.gemini_client import get_gemini_client
from app.services.supabase_client import get_supabase_admin
import os

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_BATCH_URLS = 5


class BatchProcessRequest(BaseModel):
    urls: list[str]


class BatchProcessResponse(BaseModel):
    job_id: str
    total: int


class BatchStatusResponse(BaseModel):
    job_id: str
    status: str
    total: int
    completed: int
    failed: int
    results: list[dict]
    group_title: Optional[str] = None


def _is_shorts_url(url: str) -> bool:
    return bool(re.search(r'youtube\.com/shorts/', url, re.IGNORECASE))


def _is_valid_youtube_url(url: str) -> bool:
    return bool(re.search(r'(youtube\.com|youtu\.be)', url))


async def _process_batch(
    job_id: str,
    urls: list[str],
    user_id: str,
    is_premium: bool
):
    """Background task: extract transcript for each video, save to Supabase."""
    gemini = get_gemini_client()
    supabase = get_supabase_admin()
    max_items = int(os.getenv("FREE_TIER_MAX_SAVED_ITEMS", "25"))

    # --- Fix 2: count existing saved items ONCE before the loop ---
    remaining_slots: Optional[int] = None  # None = unlimited (premium)
    if not is_premium:
        try:
            count_resp = supabase.table("saved_items") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .execute()
            current_count = count_resp.count or 0
            remaining_slots = max(0, max_items - current_count)
            logger.info(
                f"Batch {job_id}: user {user_id} has {current_count}/{max_items} "
                f"saved items — {remaining_slots} slots remaining"
            )
        except Exception as e:
            logger.error(f"Batch {job_id}: failed to count saved items for user {user_id}: {e}")
            # Conservative fallback: treat as 0 slots to avoid over-saving
            remaining_slots = 0

    slots_used = 0  # tracks how many new upserts we've done this batch

    for url in urls:
        video_id = TranscriptExtractor.extract_video_id(url)
        result: dict = {"url": url, "video_id": video_id, "status": "failed", "error": None}

        if not video_id:
            result["error"] = "Could not extract video ID"
            update_job_progress(job_id, result)
            continue

        try:
            # Check free tier cap against the pre-fetched slot count
            if remaining_slots is not None and slots_used >= remaining_slots:
                result["error"] = "Saved items limit reached"
                update_job_progress(job_id, result)
                continue

            # Extract transcript
            transcript_data = await TranscriptExtractor.get_transcript(
                video_id, languages=["en"]
            )

            if not transcript_data.get("success"):
                result["error"] = transcript_data.get("error", "Transcript unavailable")
                update_job_progress(job_id, result)
                continue

            segments = transcript_data.get("transcript", [])
            full_text = " ".join(s.get("text", "") for s in segments)

            # Fix 1: get_transcript() never returns "video_title" — fetch it explicitly
            video_title = await TranscriptExtractor.get_video_title(video_id)
            video_title = video_title or f"Video {video_id}"
            result["title"] = video_title

            slots_used += 1
            result["status"] = "completed"
            result["segments"] = segments
            result["text"] = full_text

        except Exception as e:
            logger.error(f"Batch {job_id}: error processing video {video_id}: {e}")
            result["error"] = str(e)

        update_job_progress(job_id, result)

    # Generate group title from all video titles
    job = get_job_status(job_id)
    if job:
        titles_list = ", ".join(r.get("title", "") for r in job["results"] if r.get("title"))
        group_title = gemini.generate_content(
            f'Give a short 4-8 word title describing a collection of videos about: {titles_list}. Return only the title, no quotes.',
            temperature=0.7,
            max_tokens=30
        )
        job["group_title"] = group_title or "Batch Import"
        job["status"] = "complete"
        set_job_status(job_id, job)

        # Build combined transcript and save batch group row
        completed_results = [
            r for r in job["results"]
            if r.get("status") == "completed" and r.get("video_id")
        ]
        if completed_results:
            video_ids_list = [r["video_id"] for r in completed_results]
            # Comma-joined IDs as the row's video_id (unique per user+batch combo)
            batch_video_id = ",".join(video_ids_list)

            combined_segments = []
            combined_text_parts = []
            for r in completed_results:
                combined_segments.extend(r.get("segments", []))
                if r.get("text"):
                    combined_text_parts.append(r["text"])
            combined_text = " ".join(combined_text_parts)

            batch_expires_at = None if is_premium else (
                datetime.now(timezone.utc) + timedelta(days=30)
            ).isoformat()
            try:
                supabase.table("saved_items").upsert(
                    {
                        "user_id": user_id,
                        "video_id": batch_video_id,
                        "item_type": "batch",
                        "format": "batch",
                        "content": {
                            "groupTitle": job["group_title"],
                            "video_ids": video_ids_list,
                            "videos": [
                                {"video_id": r["video_id"], "title": r.get("title", "")}
                                for r in completed_results
                            ],
                            "text": combined_text,
                            "segments": combined_segments,
                            "language": "en",
                        },
                        "source": "batch",
                        "expires_at": batch_expires_at,
                    },
                    on_conflict="user_id,video_id,item_type,format",
                ).execute()
                logger.info(f"Batch {job_id}: saved group row {batch_video_id} ({len(combined_segments)} segments)")
            except Exception as e:
                logger.error(f"Batch {job_id}: failed to save group row: {e}")
                combined_text = ""  # skip embedding pre-compute on save failure

            # Pre-warm embedding cache for combined transcript
            if combined_text:
                try:
                    get_or_compute_embeddings(batch_video_id, combined_text)
                    logger.info(f"Batch {job_id}: embeddings pre-computed for {batch_video_id}")
                except Exception as e:
                    logger.warning(f"Batch {job_id}: embedding pre-compute failed (non-fatal): {e}")


@router.post("/process", response_model=BatchProcessResponse)
async def batch_process(
    request: BatchProcessRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_auth),
):
    urls = [u.strip() for u in request.urls if u.strip()]

    if not urls:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="No URLs provided")

    if len(urls) > MAX_BATCH_URLS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_BATCH_URLS} URLs per batch"
        )

    invalid = [u for u in urls if not _is_valid_youtube_url(u)]
    if invalid:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Invalid YouTube URLs: {', '.join(invalid)}"
        )

    shorts = [u for u in urls if _is_shorts_url(u)]
    if shorts:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="YouTube Shorts are not supported"
        )

    # Deduplicate preserving order
    seen: set[str] = set()
    unique_urls = [u for u in urls if not (u in seen or seen.add(u))]  # type: ignore[func-returns-value]

    job_id = str(uuid.uuid4())
    set_job_status(job_id, {
        "job_id": job_id,
        "status": "processing",
        "total": len(unique_urls),
        "completed": 0,
        "failed": 0,
        "results": [],
    })

    user_id = current_user["sub"]
    is_premium = current_user.get("tier") == "premium"

    background_tasks.add_task(
        _process_batch, job_id, unique_urls, user_id, is_premium
    )

    return BatchProcessResponse(job_id=job_id, total=len(unique_urls))


@router.get("/status/{job_id}", response_model=BatchStatusResponse)
async def batch_status(
    job_id: str,
    current_user: dict = Depends(require_auth),
):
    job = get_job_status(job_id)
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found or expired")

    return BatchStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        total=job["total"],
        completed=job["completed"],
        failed=job["failed"],
        results=job["results"],
        group_title=job.get("group_title"),
    )
