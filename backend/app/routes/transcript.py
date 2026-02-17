"""
Transcript API Routes
Endpoints for extracting YouTube video transcripts
"""

import logging
import uuid
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta

from app.services.transcript_extractor import TranscriptExtractor
from app.utils.url_parser import parse_youtube_urls, validate_batch_input
from app.services.cache import set_job_status, get_job_status, update_job_progress

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory cache (TTL: 1 hour)
_language_cache: Dict[str, Dict] = {}
_transcript_cache: Dict[Tuple[str, Optional[Tuple[str, ...]]], Dict] = {}
_cache_ttl = timedelta(hours=1)


class TranscriptRequest(BaseModel):
    """Request model for transcript extraction"""
    video_id: Optional[str] = None
    video_url: Optional[str] = None
    languages: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "languages": ["en"]
            }
        }


@router.post("/extract")
async def extract_transcript(request: TranscriptRequest):
    """
    Extract transcript from a YouTube video

    Accepts either video_id or video_url. If video_url is provided,
    the video ID will be extracted automatically.

    Args:
        request: TranscriptRequest containing video_id or video_url

    Returns:
        Transcript data with timestamps and full text
    """
    # Extract video ID from URL if provided
    if request.video_url:
        try:
            video_id = TranscriptExtractor.extract_video_id(request.video_url)
            if not video_id:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid YouTube URL. Please provide a valid YouTube video URL."
                )
        except ValueError as e:
            # Catch Shorts URL error with specific message
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
    elif request.video_id:
        video_id = request.video_id
    else:
        raise HTTPException(
            status_code=400,
            detail="Either video_id or video_url must be provided"
        )

    # Create a cache key based on video ID and requested languages
    lang_key = tuple(sorted(request.languages)) if request.languages else None
    cache_key = (video_id, lang_key)

    # Check cache first
    if cache_key in _transcript_cache:
        cached_entry = _transcript_cache[cache_key]
        if datetime.now() - cached_entry['timestamp'] < _cache_ttl:
            cached_response = cached_entry['data'].copy()

            # If English was requested but cached response is non-English, check AI translation cache
            if request.languages and 'en' in request.languages and cached_response.get('language') != 'en':
                from app.services.cache import get_cache
                cache = get_cache()
                for lang in [cached_response.get('language')]:
                    if not lang:
                        continue
                    translation_cache_key = f"transcript_translation:{video_id}:{lang}"
                    cached_translation = cache.get(translation_cache_key)
                    if cached_translation:
                        logger.info(f"Route cache: returning AI-translated English for {video_id}")
                        return {
                            'success': True,
                            'video_id': video_id,
                            'language': 'en',
                            'is_generated': True,
                            'transcript': cached_translation,
                            'full_text': ' '.join([s['text'] for s in cached_translation]),
                            'cached': True,
                            'video_title': cached_response.get('video_title', f"Video {video_id}")
                        }

            logger.info(f"Returning cached transcript for video: {video_id}, languages: {lang_key}")
            cached_response['cached'] = True
            # Ensure video_title is present in cached response
            if 'video_title' not in cached_response:
                video_title = await TranscriptExtractor.get_video_title(video_id)
                cached_response['video_title'] = video_title or f"Video {video_id}"
            return cached_response
        else:
            # Cache expired, remove it
            del _transcript_cache[cache_key]

    # Cache miss - extract transcript
    logger.info(f"Cache miss for transcript. Fetching for video: {video_id}, languages: {request.languages}")

    # Fetch video title
    video_title = await TranscriptExtractor.get_video_title(video_id)

    # Extract transcript
    result = await TranscriptExtractor.get_transcript(
        video_id=video_id,
        languages=request.languages
    )

    if not result['success']:
        if result['error'] == 'no_captions':
            raise HTTPException(
                status_code=404,
                detail=result['message']
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=result['message']
            )

    # Add video title to result
    if video_title:
        result['video_title'] = video_title
    else:
        result['video_title'] = f"Video {video_id}"

    # Store successful result in cache
    _transcript_cache[cache_key] = {
        'data': result,
        'timestamp': datetime.now()
    }

    # Add a 'cached' flag to the response for clarity
    result['cached'] = False

    # Eager translation: If transcript is not in English, trigger translation in background
    if result.get('language') and result['language'] != 'en':
        try:
            import asyncio
            from app.services.gemini_client import get_gemini_client
            from app.services.cache import get_cache, TTL_SUMMARY

            cache = get_cache()
            translation_cache_key = f"transcript_translation:{video_id}:{result['language']}"

            # Check if translation already exists
            if not cache.get(translation_cache_key):
                logger.info(f"Eagerly translating transcript from {result['language']} to English for video {video_id}")

                # Translate in background (non-blocking)
                async def translate_in_background():
                    try:
                        gemini_client = get_gemini_client()
                        transcript_text = ' '.join([seg.get('text', '') for seg in result['transcript']])
                        translated_text = gemini_client.translate_to_english(transcript_text)

                        if translated_text:
                            # Split translated text back into segments
                            original_segments = result['transcript']
                            translated_words = translated_text.split()
                            translated_segments = []
                            word_index = 0

                            for seg in original_segments:
                                original_word_count = len(seg.get('text', '').split())
                                segment_words = translated_words[word_index:word_index + max(1, original_word_count)]
                                word_index += len(segment_words)

                                translated_segments.append({
                                    'timestamp': seg.get('timestamp'),
                                    'start_seconds': seg.get('start_seconds'),
                                    'duration': seg.get('duration'),
                                    'text': ' '.join(segment_words)
                                })

                            # Cache the translated transcript
                            cache.set(translation_cache_key, translated_segments, TTL_SUMMARY)
                            logger.info(f"Successfully cached eager translation for video {video_id}")
                    except Exception as e:
                        logger.error(f"Error in background translation: {e}")

                # Fire and forget - don't await
                asyncio.create_task(translate_in_background())
            else:
                logger.info(f"Translation already cached for video {video_id}")
        except Exception as e:
            logger.error(f"Error setting up eager translation: {e}")

    return result


@router.get("/languages/{video_id}")
async def get_available_languages(video_id: str):
    """
    Get available transcript languages for a video

    Args:
        video_id: YouTube video ID

    Returns:
        List of available languages with metadata
    """
    # Check cache first
    if video_id in _language_cache:
        cached_entry = _language_cache[video_id]
        if datetime.now() - cached_entry['timestamp'] < _cache_ttl:
            logger.info(f"Returning cached language data for video: {video_id}")
            # Add a 'cached' flag to the response for clarity
            cached_response = cached_entry['data'].copy()
            cached_response['cached'] = True
            return cached_response
        else:
            # Cache expired, remove it
            del _language_cache[video_id]

    # Cache miss - fetch from YouTube
    logger.info(f"Cache miss for languages. Fetching for video: {video_id}")
    result = await TranscriptExtractor.get_available_languages(video_id)

    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=result['error']
        )

    # Store successful result in cache
    _language_cache[video_id] = {
        'data': result,
        'timestamp': datetime.now()
    }

    # Add a 'cached' flag to the response for clarity
    result['cached'] = False
    return result


@router.get("/languages-with-translation/{video_id}")
async def get_languages_with_translation(video_id: str):
    """
    Get available transcript languages including AI-translated English option

    Returns native YouTube languages plus AI-translated English if available in cache

    Args:
        video_id: YouTube video ID

    Returns:
        List of languages with translation status
    """
    # First get the native YouTube languages
    result = await get_available_languages(video_id)

    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=result['error']
        )

    languages = result.get('languages', [])

    # Check if English is already available natively
    has_native_english = any(lang.get('code') == 'en' for lang in languages)

    # If not native English, check if we have an AI translation cached
    if not has_native_english:
        try:
            from app.services.cache import get_cache

            cache = get_cache()

            # Check all possible language codes for cached translations
            for lang in languages:
                lang_code = lang.get('code')
                translation_cache_key = f"transcript_translation:{video_id}:{lang_code}"

                if cache.get(translation_cache_key):
                    # We have a cached AI translation - add English option
                    languages.append({
                        'code': 'en',
                        'name': 'English (AI-translated)',
                        'is_generated': True,
                        'is_translatable': False,
                        'is_ai_translated': True
                    })
                    logger.info(f"Added AI-translated English option for video {video_id}")
                    break
        except Exception as e:
            logger.error(f"Error checking translation cache: {e}")

    return {
        'success': True,
        'video_id': video_id,
        'languages': languages,
        'cached': result.get('cached', False)
    }


class TranslateRequest(BaseModel):
    """Request model for translating transcript to English"""
    video_id: str
    transcript: List[Dict]  # Original transcript segments
    source_language: str  # Source language code


@router.post("/translate")
async def translate_transcript(request: TranslateRequest):
    """
    Translate transcript segments to English using Gemini

    Takes transcript in original language and returns AI-translated English version
    while preserving timestamps and segment structure.

    Args:
        request: Contains video_id, transcript segments, and source language

    Returns:
        Translated transcript in same format as original
    """
    try:
        from app.services.gemini_client import get_gemini_client
        from app.services.cache import get_cache, TTL_SUMMARY

        cache = get_cache()
        translation_cache_key = f"transcript_translation:{request.video_id}:{request.source_language}"

        # Check cache first
        cached_translation = cache.get(translation_cache_key)
        if cached_translation:
            logger.info(f"Returning cached translated transcript for {request.video_id}")
            return {
                'success': True,
                'cached': True,
                'transcript': cached_translation,
                'video_id': request.video_id,
                'language': 'en',
                'is_generated': True  # AI-translated
            }

        # Translate using Gemini
        gemini_client = get_gemini_client()

        # Combine transcript text for translation (preserve structure)
        transcript_text = ' '.join([seg.get('text', '') for seg in request.transcript])

        logger.info(f"Translating transcript for {request.video_id} from {request.source_language} to English")
        translated_text = gemini_client.translate_to_english(transcript_text)

        if not translated_text:
            return {
                'success': False,
                'error': 'Failed to translate transcript. Gemini may not be available.',
                'video_id': request.video_id
            }

        # Split translated text back into segments (approximate - maintain timing)
        # Use simple word-count based splitting to preserve timestamps
        original_segments = request.transcript
        translated_words = translated_text.split()

        translated_segments = []
        word_index = 0

        for seg in original_segments:
            original_word_count = len(seg.get('text', '').split())
            # Take proportional number of translated words
            segment_words = translated_words[word_index:word_index + max(1, original_word_count)]
            word_index += len(segment_words)

            translated_segments.append({
                'timestamp': seg.get('timestamp'),
                'start_seconds': seg.get('start_seconds'),
                'duration': seg.get('duration'),
                'text': ' '.join(segment_words)
            })

        # Cache the translated transcript
        cache.set(translation_cache_key, translated_segments, TTL_SUMMARY)
        logger.info(f"Cached translated transcript for {request.video_id}")

        return {
            'success': True,
            'cached': False,
            'transcript': translated_segments,
            'video_id': request.video_id,
            'language': 'en',
            'is_generated': True  # AI-translated
        }

    except Exception as e:
        logger.error(f"Error translating transcript: {e}")
        return {
            'success': False,
            'error': str(e),
            'video_id': request.video_id
        }


# ===== Batch Processing Endpoints =====
# DISABLED: Batch processing feature removed for MVP
# Re-enable in future if needed for bulk transcript extraction

# class BatchTranscriptRequest(BaseModel):
#     """Request model for batch transcript extraction"""
#     video_ids: List[str]
#     languages: Optional[List[str]] = None
#
#     class Config:
#         json_schema_extra = {
#             "example": {
#                 "video_ids": ["dQw4w9WgXcQ", "jNQXAC9IVRw", "9bZkp7q19f0"],
#                 "languages": ["en"]
#             }
#         }
#
#
# async def process_batch_job(job_id: str, video_ids: List[str], languages: Optional[List[str]] = None):
#     """Background task to process batch transcript extraction.
#
#     Args:
#         job_id: Unique job identifier
#         video_ids: List of YouTube video IDs to process
#         languages: Optional list of preferred languages
#     """
#     logger.info(f"Starting batch job {job_id} for {len(video_ids)} videos")
#
#     # Use semaphore to limit concurrent requests (max 3 at a time)
#     semaphore = asyncio.Semaphore(3)
#
#     async def fetch_single_transcript(video_id: str, index: int):
#         """Fetch transcript for a single video with semaphore control"""
#         async with semaphore:
#             try:
#                 logger.info(f"[Job {job_id}] Processing video {index + 1}/{len(video_ids)}: {video_id}")
#
#                 # Fetch transcript
#                 result = await TranscriptExtractor.get_transcript(
#                     video_id=video_id,
#                     languages=languages
#                 )
#
#                 if result['success']:
#                     # Success - update job with completed video
#                     update_job_progress(job_id, {
#                         'video_id': video_id,
#                         'title': f"Video {video_id}",  # Could fetch from YouTube API if available
#                         'status': 'completed',
#                         'transcript': result.get('transcript'),
#                         'language': result.get('language'),
#                         'full_text': result.get('full_text')
#                     })
#                     logger.info(f"[Job {job_id}] Successfully processed {video_id}")
#                 else:
#                     # Failed - update job with error
#                     error_message = result.get('message', 'Unknown error')
#                     if result.get('error') == 'no_captions':
#                         error_message = "No captions available"
#                     elif 'private' in error_message.lower():
#                         error_message = "Private video"
#                     elif 'not found' in error_message.lower():
#                         error_message = "Video not found"
#
#                     update_job_progress(job_id, {
#                         'video_id': video_id,
#                         'title': f"Video {video_id}",
#                         'status': 'failed',
#                         'error': error_message
#                     })
#                     logger.warning(f"[Job {job_id}] Failed to process {video_id}: {error_message}")
#
#             except Exception as e:
#                 # Unexpected error
#                 logger.error(f"[Job {job_id}] Exception processing {video_id}: {e}")
#                 update_job_progress(job_id, {
#                     'video_id': video_id,
#                     'title': f"Video {video_id}",
#                     'status': 'failed',
#                     'error': str(e)
#                 })
#
#     # Process all videos concurrently (with semaphore limit)
#     tasks = [fetch_single_transcript(vid, idx) for idx, vid in enumerate(video_ids)]
#     await asyncio.gather(*tasks)
#
#     logger.info(f"Batch job {job_id} completed")
#
#
# @router.post("/batch")
# async def create_batch_job(request: BatchTranscriptRequest, background_tasks: BackgroundTasks):
#     """
#     Submit a batch transcript extraction job
#
#     Processes multiple videos concurrently (max 3 at a time) and returns immediately
#     with a job_id that can be used to check progress.
#
#     V1 Limit: 5 videos per batch (free tier hard limit)
#
#     Args:
#         request: BatchTranscriptRequest containing list of video IDs
#
#     Returns:
#         Job details with job_id, total_videos, and initial status
#     """
#     # Validate input
#     if not request.video_ids:
#         raise HTTPException(
#             status_code=400,
#             detail="No video IDs provided"
#         )
#
#     # V1 Hard limit: 5 videos per batch
#     MAX_BATCH_SIZE = 5
#     if len(request.video_ids) > MAX_BATCH_SIZE:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Batch size exceeds limit. Maximum {MAX_BATCH_SIZE} videos allowed per batch (free tier). You submitted {len(request.video_ids)} videos."
#         )
#
#     # Generate unique job ID
#     job_id = str(uuid.uuid4())
#
#     # Initialize job status
#     initial_status = {
#         'job_id': job_id,
#         'status': 'pending',
#         'total': len(request.video_ids),
#         'completed': 0,
#         'failed': 0,
#         'results': []
#     }
#
#     # Store initial job status
#     set_job_status(job_id, initial_status)
#
#     # Start background processing
#     background_tasks.add_task(process_batch_job, job_id, request.video_ids, request.languages)
#
#     logger.info(f"Created batch job {job_id} for {len(request.video_ids)} videos")
#
#     return {
#         'job_id': job_id,
#         'total_videos': len(request.video_ids),
#         'status': 'pending'
#     }
#
#
# @router.get("/batch/{job_id}/status")
# async def get_batch_job_status(job_id: str):
#     """
#     Get status of a batch transcript extraction job
#
#     Poll this endpoint to check progress. Updates every 2-3 seconds on the client.
#
#     Args:
#         job_id: Unique job identifier returned from /batch endpoint
#
#     Returns:
#         Job status with progress details and results
#     """
#     job_status = get_job_status(job_id)
#
#     if not job_status:
#         raise HTTPException(
#             status_code=404,
#             detail=f"Job {job_id} not found or expired (jobs expire after 24 hours)"
#         )
#
#     return job_status
