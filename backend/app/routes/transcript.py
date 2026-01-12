"""
Transcript API Routes
Endpoints for extracting YouTube video transcripts
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta

from app.services.transcript_extractor import TranscriptExtractor

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
        video_id = TranscriptExtractor.extract_video_id(request.video_url)
        if not video_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube URL. Please provide a valid YouTube video URL."
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
            logger.info(f"Returning cached transcript for video: {video_id}, languages: {lang_key}")
            # Add a 'cached' flag to the response for clarity
            cached_response = cached_entry['data'].copy()
            cached_response['cached'] = True
            return cached_response
        else:
            # Cache expired, remove it
            del _transcript_cache[cache_key]

    # Cache miss - extract transcript
    logger.info(f"Cache miss for transcript. Fetching for video: {video_id}, languages: {request.languages}")

    # Special handling: If requesting English but AI translation exists, return that
    if request.languages == ['en']:
        from app.services.cache import get_cache
        cache = get_cache()

        # Try to get the original transcript first to determine its language
        temp_result = await TranscriptExtractor.get_transcript(
            video_id=video_id,
            languages=None  # Get any available language
        )

        if temp_result['success'] and temp_result.get('language') != 'en':
            # Original is not English - check for AI translation
            source_lang = temp_result['language']
            translation_cache_key = f"transcript_translation:{video_id}:{source_lang}"
            cached_translation = cache.get(translation_cache_key)

            if cached_translation:
                logger.info(f"Found AI-translated English for video {video_id}, returning from cache")
                result = {
                    'success': True,
                    'video_id': video_id,
                    'language': 'en',
                    'is_generated': True,  # Indicates AI translation
                    'transcript': cached_translation,
                    'full_text': ' '.join([seg.get('text', '') for seg in cached_translation])
                }
                # Store in transcript cache for future requests
                _transcript_cache[cache_key] = {
                    'data': result,
                    'timestamp': datetime.now()
                }
                result['cached'] = False
                return result

    # Normal flow: fetch from YouTube
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
