"""
Summary API Routes
Endpoints for generating AI summaries using Gemini 1.5 Flash
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.cache import get_cache, TTL_SUMMARY
from app.services.gemini_client import get_gemini_client

router = APIRouter()


# Request/Response Models
class SummaryRequest(BaseModel):
    video_id: str
    transcript: str  # Can be either plain text string OR JSON string of transcript segments
    format: str = 'short'  # 'short', 'qa', or 'topic'
    language: Optional[str] = 'en'  # Language code of the transcript


class SummaryResponse(BaseModel):
    success: bool
    summary: Optional[str] = None
    cached: bool = False
    format: str
    error: Optional[str] = None
    is_structured: bool = False  # NEW: Indicates if this is a structured summary with clickable timestamps


@router.post("/generate", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate AI summary using Gemini 2.0 Flash with clickable timestamps

    Three formats available:
    - Short: Exactly 3 sections covering the most important high-level themes (quick overview)
    - Q&A: Up to 10 questions with answers about substantial topics discussed
    - By Topic: Up to 10 main topics/themes organized thematically

    All formats focus on quality over quantity, skipping superficial points.
    Summaries are cached for 7 days per video+format combination.

    If transcript is not in English, it will be automatically translated to English first.

    NEW: Timestamps in the summary are returned as clickable links in format (MM:SS).

    Args:
        request: Contains video_id, transcript (structured or plain text), format, and optional language code

    Returns:
        Generated summary with clickable timestamps (or cached summary if available)
    """
    try:
        # Validate inputs
        if request.format not in ['short', 'qa', 'topic']:
            raise HTTPException(status_code=400, detail="Format must be 'short', 'qa', or 'topic'")

        if not request.transcript.strip():
            raise HTTPException(status_code=400, detail="Transcript is required")

        # Check cache first (7-day TTL)
        cache = get_cache()
        cache_key = f"summary:{request.video_id}:{request.format}"

        cached_summary = cache.get(cache_key)
        if cached_summary:
            # Check if this is a structured summary (with clickable timestamp links)
            # Look for markdown link pattern that includes youtube.com/watch?v=
            is_structured = "youtube.com/watch?v=" in cached_summary
            return SummaryResponse(
                success=True,
                summary=cached_summary,
                cached=True,
                format=request.format,
                is_structured=is_structured
            )

        gemini_client = get_gemini_client()
        transcript_text = request.transcript
        is_structured = False

        # Check if transcript is JSON (structured data) or plain text
        try:
            # Try to parse as JSON array of transcript segments
            import json
            transcript_segments = json.loads(request.transcript)

            # Convert to structured text format with timestamps
            # Format: "Text text text... (MM:SS)\nText text text... (MM:SS)\n..."
            # Group segments into paragraphs for better context
            structured_text = "\n\n".join([
                f"{seg.get('text', '').strip()} ({seg.get('timestamp', '00:00')})"
                for seg in transcript_segments
            ])
            transcript_text = structured_text
            is_structured = True

            print(f"Using structured transcript with {len(transcript_segments)} segments")

        except json.JSONDecodeError:
            # Not JSON - treat as plain text
            transcript_text = request.transcript
            is_structured = False
        except Exception as e:
            print(f"Error parsing transcript as JSON: {e}")
            transcript_text = request.transcript
            is_structured = False

        # Translate to English if not already in English
        if request.language and request.language != 'en':
            print(f"Translating transcript from {request.language} to English for summary")

            # Check translation cache (separate from summary cache)
            translation_cache_key = f"translation:{request.video_id}:{request.language}"
            cached_translation = cache.get(translation_cache_key)

            if cached_translation:
                print(f"Using cached translation for {request.language} transcript")
                transcript_text = cached_translation
                # Keep is_structured flag from above
            else:
                # Translate using Gemini
                translated = gemini_client.translate_to_english(request.transcript)

                if not translated:
                    return SummaryResponse(
                        success=False,
                        error=f"Failed to translate transcript from {request.language} to English. Gemini may not be available.",
                        format=request.format,
                        is_structured=False
                    )

                transcript_text = translated
                # Cache translation for 7 days
                cache.set(translation_cache_key, translated, TTL_SUMMARY)
                print(f"Translation cached for {request.language} transcript")

        # Generate summary with Gemini
        summary = gemini_client.generate_summary(
            transcript=transcript_text,
            format=request.format
        )

        if not summary:
            return SummaryResponse(
                success=False,
                error="Failed to generate summary. Gemini may not be available.",
                format=request.format,
                is_structured=False
            )

        # If structured input, convert timestamps to clickable links
        final_is_structured = False
        if is_structured:
            summary = convert_timestamps_to_links(summary, request.video_id)
            final_is_structured = True

        # Cache the result for 7 days
        cache.set(cache_key, summary, TTL_SUMMARY)

        return SummaryResponse(
            success=True,
            summary=summary,
            cached=False,
            format=request.format,
            is_structured=final_is_structured
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating summary: {e}")
        return SummaryResponse(
            success=False,
            error=str(e),
            format=request.format,
            is_structured=False
        )


def convert_timestamps_to_links(summary_text: str, video_id: str) -> str:
    """
    Convert timestamps in (MM:SS) format to clickable markdown links

    Args:
        summary_text: Summary text with timestamps like (05:23)
        video_id: YouTube video ID for constructing URLs

    Returns:
        Summary text with clickable timestamp links
    """
    import re

    # Pattern to match timestamps in (MM:SS) format
    # Example: (05:23), (12:47)
    timestamp_pattern = r'\((\d{1,2}:\d{2})\)|\[(\d{1,2}:\d{2})\]'

    def replace_timestamp(match):
        timestamp = match.group(1) or match.group(2)  # Get the timestamp part
        # Convert timestamp to seconds for YouTube URL
        parts = timestamp.split(':')
        minutes = int(parts[0])
        seconds = int(parts[1])
        total_seconds = minutes * 60 + seconds

        # Create clickable markdown link
        return f"[({timestamp})](https://www.youtube.com/watch?v={video_id}&t={total_seconds}s)"

    result = re.sub(timestamp_pattern, replace_timestamp, summary_text)
    return result
