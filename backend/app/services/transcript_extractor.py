"""
Transcript Extraction Service
Extracts transcripts from YouTube videos using youtube-transcript-api (primary)
with Deepgram Nova-2 as fallback for videos without captions
"""

from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from youtube_transcript_api._errors import VideoUnavailable
from youtube_transcript_api.proxies import WebshareProxyConfig
from typing import List, Dict, Optional
import re
import logging
import os

logger = logging.getLogger(__name__)


class TranscriptExtractor:
    """Service for extracting transcripts from YouTube videos"""

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
            languages = ['en']  # Default to English

        try:
            logger.info(f"Attempting to extract transcript for video: {video_id}")

            # Instantiate the API with Webshare proxy configuration
            api = YouTubeTranscriptApi(
                proxy_config=WebshareProxyConfig(
                    proxy_username=os.getenv("WS_USER"),
                    proxy_password=os.getenv("WS_PASS"),
                    filter_ip_locations=["us"],
                )
            )
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
                    # Just get the first available transcript
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
            api = YouTubeTranscriptApi(
                proxy_config=WebshareProxyConfig(
                    proxy_username=os.getenv("WS_USER"),
                    proxy_password=os.getenv("WS_PASS"),
                    filter_ip_locations=["us"],
                )
            )
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
