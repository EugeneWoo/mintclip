"""
URL Parser Utility for YouTube Video IDs

Parses and validates YouTube URLs/IDs from multi-line input.
Supports various YouTube URL formats and direct video IDs.
"""

import re
from typing import List, Set
from urllib.parse import urlparse, parse_qs


def parse_youtube_urls(input_text: str) -> List[str]:
    """Parse YouTube URLs/IDs from multi-line input.

    Supports:
    - https://www.youtube.com/watch?v={VIDEO_ID}
    - https://youtu.be/{VIDEO_ID}
    - https://m.youtube.com/watch?v={VIDEO_ID}
    - https://www.youtube.com/embed/{VIDEO_ID}
    - Direct video ID: {VIDEO_ID}

    Args:
        input_text: Multi-line string containing YouTube URLs/IDs (one per line)

    Returns:
        List of unique valid video IDs (duplicates removed, order preserved)

    Examples:
        >>> parse_youtube_urls("https://www.youtube.com/watch?v=dQw4w9WgXcQ\\nhttps://youtu.be/jNQXAC9IVRw")
        ['dQw4w9WgXcQ', 'jNQXAC9IVRw']

        >>> parse_youtube_urls("dQw4w9WgXcQ\\ndQw4w9WgXcQ")  # Removes duplicates
        ['dQw4w9WgXcQ']
    """
    if not input_text or not input_text.strip():
        return []

    lines = input_text.strip().split('\n')
    video_ids: List[str] = []
    seen_ids: Set[str] = set()

    for line in lines:
        line = line.strip()
        if not line:
            continue

        video_id = extract_video_id(line)

        # Add to list if valid and not already seen (preserve order, remove duplicates)
        if video_id and video_id not in seen_ids:
            video_ids.append(video_id)
            seen_ids.add(video_id)

    return video_ids


def is_shorts_url(url: str) -> bool:
    """Check if URL is a YouTube Shorts URL.

    Args:
        url: YouTube URL to check

    Returns:
        True if URL is a Shorts URL, False otherwise

    Examples:
        >>> is_shorts_url("https://www.youtube.com/shorts/dQw4w9WgXcQ")
        True

        >>> is_shorts_url("https://youtube.com/shorts/abc123")
        True

        >>> is_shorts_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        False
    """
    return '/shorts/' in url.lower()


def extract_video_id(url_or_id: str) -> str | None:
    """Extract video ID from YouTube URL or validate direct video ID.

    Args:
        url_or_id: YouTube URL or direct video ID

    Returns:
        Video ID if valid, None otherwise

    Examples:
        >>> extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        'dQw4w9WgXcQ'

        >>> extract_video_id("https://youtu.be/jNQXAC9IVRw")
        'jNQXAC9IVRw'

        >>> extract_video_id("dQw4w9WgXcQ")
        'dQw4w9WgXcQ'

        >>> extract_video_id("invalid")
        None
    """
    url_or_id = url_or_id.strip()

    # Check if it's a Shorts URL and reject it
    if is_shorts_url(url_or_id):
        raise ValueError("YouTube Shorts are not supported. Please paste a regular YouTube video URL.")

    # If it looks like a direct video ID (11 chars, alphanumeric + _ -), validate it
    if is_valid_video_id(url_or_id):
        return url_or_id

    # Otherwise, try to parse as URL
    try:
        # Handle youtu.be short URLs
        if 'youtu.be/' in url_or_id:
            parsed = urlparse(url_or_id)
            # Extract video ID from path (e.g., /dQw4w9WgXcQ)
            video_id = parsed.path.lstrip('/')
            if is_valid_video_id(video_id):
                return video_id

        # Handle youtube.com URLs (watch, embed, etc.)
        elif 'youtube.com/' in url_or_id:
            parsed = urlparse(url_or_id)

            # Standard watch URL: /watch?v={VIDEO_ID}
            if '/watch' in parsed.path:
                params = parse_qs(parsed.query)
                video_id = params.get('v', [None])[0]
                if video_id and is_valid_video_id(video_id):
                    return video_id

            # Embed URL: /embed/{VIDEO_ID}
            elif '/embed/' in parsed.path:
                video_id = parsed.path.split('/embed/')[-1]
                if is_valid_video_id(video_id):
                    return video_id

    except Exception:
        pass

    return None


def is_valid_video_id(video_id: str) -> bool:
    """Validate video ID format (11 characters, alphanumeric + _ -).

    YouTube video IDs are exactly 11 characters long and contain:
    - Uppercase letters (A-Z)
    - Lowercase letters (a-z)
    - Digits (0-9)
    - Underscore (_)
    - Hyphen (-)

    Args:
        video_id: String to validate as YouTube video ID

    Returns:
        True if valid YouTube video ID format, False otherwise

    Examples:
        >>> is_valid_video_id("dQw4w9WgXcQ")
        True

        >>> is_valid_video_id("jNQXAC9IVRw")
        True

        >>> is_valid_video_id("invalid")
        False

        >>> is_valid_video_id("dQw4w9WgXcQ123")  # Too long
        False
    """
    if not video_id or not isinstance(video_id, str):
        return False

    # YouTube video IDs are exactly 11 characters
    if len(video_id) != 11:
        return False

    # Valid characters: alphanumeric + underscore + hyphen
    pattern = r'^[A-Za-z0-9_-]{11}$'
    return bool(re.match(pattern, video_id))


def validate_batch_input(input_text: str, max_videos: int | None = 5) -> dict:
    """Validate batch input and return parsed video IDs with validation info.

    Args:
        input_text: Multi-line string containing YouTube URLs/IDs
        max_videos: Maximum number of videos allowed (default: 5 for free tier)

    Returns:
        Dictionary with:
        - video_ids: List of valid video IDs
        - total_valid: Number of valid videos found
        - total_invalid: Number of invalid lines
        - exceeds_limit: Boolean indicating if max_videos exceeded
        - error: Optional error message

    Examples:
        >>> validate_batch_input("https://www.youtube.com/watch?v=dQw4w9WgXcQ\\ninvalid_line", max_videos=5)
        {
            'video_ids': ['dQw4w9WgXcQ'],
            'total_valid': 1,
            'total_invalid': 1,
            'exceeds_limit': False,
            'error': None
        }
    """
    if not input_text or not input_text.strip():
        return {
            'video_ids': [],
            'total_valid': 0,
            'total_invalid': 0,
            'exceeds_limit': False,
            'error': 'No input provided'
        }

    lines = input_text.strip().split('\n')
    video_ids = parse_youtube_urls(input_text)

    total_lines = len([line for line in lines if line.strip()])
    total_valid = len(video_ids)
    total_invalid = total_lines - total_valid

    exceeds_limit = False
    error = None

    if max_videos and total_valid > max_videos:
        exceeds_limit = True
        error = f'Too many videos: {total_valid} detected, but limit is {max_videos}'

    return {
        'video_ids': video_ids,
        'total_valid': total_valid,
        'total_invalid': total_invalid,
        'exceeds_limit': exceeds_limit,
        'error': error
    }
