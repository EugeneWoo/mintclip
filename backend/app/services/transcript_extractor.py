"""
Transcript Extraction Service
Extracts transcripts from YouTube videos using youtube-transcript-api (primary)
with Deepgram Nova-2 as fallback for videos without captions
"""

from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from youtube_transcript_api._errors import VideoUnavailable
from youtube_transcript_api.proxies import GenericProxyConfig
from typing import List, Dict, Optional
import re
import logging
import os
import urllib3
import httpx
from urllib.parse import quote
import asyncio

logger = logging.getLogger(__name__)


# Disable SSL warnings if we need to bypass corporate proxies
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class TranscriptExtractor:
    """Service for extracting transcripts from YouTube videos"""

    @staticmethod
    async def get_video_title(video_id: str) -> Optional[str]:
        """
        Fetch video title from YouTube using oEmbed API

        Args:
            video_id: YouTube video ID

        Returns:
            Video title or None if fetching fails
        """
        try:
            # YouTube oEmbed API - properly encode the URL
            watch_url = f"https://www.youtube.com/watch?v={video_id}"
            encoded_url = quote(watch_url, safe='')
            oembed_url = f"https://www.youtube.com/oembed?url={encoded_url}&format=json"

            logger.info(f"Fetching video title for {video_id} from oEmbed API")
            logger.info(f"oEmbed URL: {oembed_url}")

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(oembed_url, headers={
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

                logger.info(f"oEmbed response status for {video_id}: {response.status_code}")

                if response.status_code == 200:
                    data = response.json()
                    title = data.get('title')
                    logger.info(f"Successfully fetched video title for {video_id}: {title}")
                    return title
                else:
                    logger.warning(f"Failed to fetch video title for {video_id}: HTTP {response.status_code}, Body: {response.text[:200]}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching video title for {video_id}: {e}")
            return None

    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """
        Extract video ID from various YouTube URL formats

        Supported formats:
        - https://www.youtube.com/watch?v=VIDEO_ID
        - https://youtube.com/watch?v=VIDEO_ID
        - https://youtu.be/VIDEO_ID
        - https://www.youtube.com/shorts/VIDEO_ID
        - VIDEO_ID (direct ID)
        """
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'  # Direct video ID
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return None

    @staticmethod
    async def get_transcript(
        video_id: str,
        languages: Optional[List[str]] = None
    ) -> Dict:
        """
        Extract transcript from YouTube video

        Args:
            video_id: YouTube video ID
            languages: List of preferred language codes (e.g., ['en', 'es'])

        Returns:
            Dictionary containing transcript data with timestamps
        """
        if languages is None:
            languages = ['en']

        try:
            logger.info(f"Attempting to extract transcript for video: {video_id}")

            # Configure proxy - use Webshare if credentials provided, otherwise direct connection
            ws_user = os.getenv("WS_USER")
            ws_pass = os.getenv("WS_PASS")

            if ws_user and ws_pass:
                logger.info("Using IPRoyal/Webshare proxy configuration")
                # Use GenericProxyConfig to avoid username modification
                # WebshareProxyConfig incorrectly adds -rotate suffix to usernames ending with -rotate
                proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80/"
                proxy_config = GenericProxyConfig(
                    http_url=proxy_url,
                    https_url=proxy_url,
                )
                api = YouTubeTranscriptApi(proxy_config=proxy_config)
            else:
                logger.info("Using direct connection (no proxy)")
                api = YouTubeTranscriptApi()

            transcript_list = api.list(video_id)

            # Try to find transcript in preferred languages
            transcript = None
            transcript_language = None

            for lang in languages:
                try:
                    transcript = transcript_list.find_transcript([lang])
                    transcript_language = lang
                    logger.info(f"Found transcript in language: {lang}")
                    break
                except:
                    continue

            # If no preferred language found, get any available transcript
            if transcript is None:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    transcript_language = 'en'
                    logger.info("Using auto-generated English transcript")
                except:
                    # If English was requested but not available natively, check if we have AI translation cached
                    if 'en' in languages:
                        from app.services.cache import get_cache
                        cache = get_cache()

                        # Check all available languages for cached translations to English
                        available_transcripts = list(transcript_list)
                        for avail_transcript in available_transcripts:
                            translation_cache_key = f"transcript_translation:{video_id}:{avail_transcript.language_code}"
                            cached_translation = cache.get(translation_cache_key)

                            if cached_translation:
                                logger.info(f"Returning cached AI-translated English (from {avail_transcript.language_code})")
                                return {
                                    'success': True,
                                    'video_id': video_id,
                                    'language': 'en',
                                    'is_generated': True,  # AI-translated
                                    'transcript': cached_translation,
                                    'full_text': ' '.join([entry['text'] for entry in cached_translation])
                                }

                    # No English available (native or AI-translated) - get first available transcript
                    available_transcripts = list(transcript_list)
                    if available_transcripts:
                        transcript = available_transcripts[0]
                        transcript_language = transcript.language_code
                        logger.info(f"Using first available transcript: {transcript_language}")
                    else:
                        raise NoTranscriptFound(video_id, languages, transcript_list)

            # Fetch the actual transcript data
            transcript_data = transcript.fetch()

            # Format transcript with timestamps
            # Note: In the new API, entries are dataclass objects with attributes, not dicts
            formatted_transcript = [
                {
                    'timestamp': TranscriptExtractor._format_timestamp(entry.start),
                    'start_seconds': entry.start,
                    'duration': entry.duration,
                    'text': entry.text.strip()
                }
                for entry in transcript_data
            ]

            logger.info(f"Successfully extracted transcript with {len(formatted_transcript)} entries")

            return {
                'success': True,
                'video_id': video_id,
                'language': transcript_language or 'unknown',
                'is_generated': transcript.is_generated if transcript else True,
                'transcript': formatted_transcript,
                'full_text': ' '.join([entry['text'] for entry in formatted_transcript])
            }

        except NoTranscriptFound as e:
            logger.warning(f"No transcript found for video {video_id}: {str(e)}")
            return {
                'success': False,
                'error': 'no_captions',
                'message': 'This video does not have captions available.',
                'video_id': video_id,
                'details': str(e)
            }

        except TranscriptsDisabled as e:
            logger.warning(f"Transcripts disabled for video {video_id}: {str(e)}")
            return {
                'success': False,
                'error': 'transcripts_disabled',
                'message': 'Transcripts are disabled for this video.',
                'video_id': video_id,
                'details': str(e)
            }

        except VideoUnavailable as e:
            logger.error(f"Video unavailable {video_id}: {str(e)}")
            return {
                'success': False,
                'error': 'video_unavailable',
                'message': 'This video is unavailable or does not exist.',
                'video_id': video_id,
                'details': str(e)
            }

        except Exception as e:
            # Generic error - could be network, parsing, or YouTube blocking
            error_msg = str(e)
            logger.error(f"Error extracting transcript for {video_id}: {error_msg}")

            # Check for common error patterns
            if 'no element found' in error_msg.lower():
                return {
                    'success': False,
                    'error': 'parse_error',
                    'message': 'Failed to parse YouTube response. This may be due to YouTube blocking or regional restrictions. Try a different video.',
                    'video_id': video_id,
                    'details': error_msg
                }

            if 'could not retrieve a transcript' in error_msg.lower():
                # Check if it's an IP block vs genuinely missing captions
                if 'youtube is blocking requests' in error_msg.lower() or 'ip' in error_msg.lower():
                    return {
                        'success': False,
                        'error': 'ip_blocked',
                        'message': 'YouTube is temporarily blocking requests from your IP. This usually happens after making too many requests. Please wait a few minutes and try again, or try a different network.',
                        'video_id': video_id,
                        'details': error_msg
                    }
                else:
                    return {
                        'success': False,
                        'error': 'no_captions',
                        'message': 'Could not retrieve transcript. The video may not have captions available.',
                        'video_id': video_id,
                        'details': error_msg
                    }

            return {
                'success': False,
                'error': 'extraction_failed',
                'message': f'Failed to extract transcript: {error_msg}',
                'video_id': video_id
            }

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """
        Format seconds into HH:MM:SS or MM:SS format

        Args:
            seconds: Time in seconds

        Returns:
            Formatted timestamp string
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)

        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"

    @staticmethod
    async def get_available_languages(video_id: str) -> Dict:
        """
        Get list of available transcript languages for a video

        Args:
            video_id: YouTube video ID

        Returns:
            Dictionary with available languages
        """
        try:
            # Configure proxy - use Webshare if credentials provided, otherwise direct connection
            ws_user = os.getenv("WS_USER")
            ws_pass = os.getenv("WS_PASS")

            if ws_user and ws_pass:
                # Use GenericProxyConfig to avoid username modification
                proxy_url = f"http://{ws_user}:{ws_pass}@p.webshare.io:80/"
                proxy_config = GenericProxyConfig(
                    http_url=proxy_url,
                    https_url=proxy_url,
                )
                api = YouTubeTranscriptApi(proxy_config=proxy_config)
            else:
                api = YouTubeTranscriptApi()

            transcript_list = api.list(video_id)

            available_languages = []
            for transcript in transcript_list:
                available_languages.append({
                    'code': transcript.language_code,
                    'name': transcript.language,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })

            return {
                'success': True,
                'video_id': video_id,
                'languages': available_languages
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'video_id': video_id
            }
