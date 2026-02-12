"""
Chat API Routes
Endpoints for chatting with video content and generating suggested questions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

from app.services.cache import get_cache, TTL_SUGGESTED_QUESTIONS, TTL_CHAT_MESSAGE
from app.services.gemini_client import get_gemini_client
from app.prompts.suggested_questions import FALLBACK_QUESTIONS

router = APIRouter()


# Request/Response Models
class SuggestedQuestionsRequest(BaseModel):
    video_id: str
    transcript: str  # Full transcript text
    language: Optional[str] = 'en'  # Language code of the transcript


class SuggestedQuestionsResponse(BaseModel):
    success: bool
    questions: List[str]
    cached: bool = False
    error: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatMessageRequest(BaseModel):
    video_id: str
    transcript: str  # Full transcript text
    question: str  # User's question
    chat_history: List[Dict[str, str]] = []  # Previous messages
    language: Optional[str] = 'en'  # Language code of the transcript


class ChatMessageResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    cached: bool = False


@router.post("/suggested-questions", response_model=SuggestedQuestionsResponse)
async def generate_suggested_questions(request: SuggestedQuestionsRequest):
    """
    Generate 3 dynamic suggested questions using Gemini with few-shot prompting

    The questions are:
    - Specific to the video content
    - Contextual and engaging
    - Cached for 24 hours per video

    If transcript is not in English, it will be automatically translated to English first.

    Args:
        request: Contains video_id, full transcript, and optional language code

    Returns:
        3 suggested questions (or fallback questions if generation fails)
    """
    try:
        cache = get_cache()
        cache_key = f"suggested_questions:{request.video_id}"

        # Check cache first (24-hour TTL)
        cached_questions = cache.get(cache_key)
        if cached_questions:
            return SuggestedQuestionsResponse(
                success=True,
                questions=cached_questions,
                cached=True
            )

        # Use first 5000 chars for efficiency (Gemini context limits + cost)
        transcript_preview = request.transcript[:5000] if request.transcript else ""

        if not transcript_preview.strip():
            # No transcript provided, return generic fallback questions
            return SuggestedQuestionsResponse(
                success=True,
                questions=FALLBACK_QUESTIONS,
                cached=False
            )

        gemini_client = get_gemini_client()

        # Translate to English if not already in English
        if request.language and request.language != 'en':
            print(f"Translating transcript from {request.language} to English for suggested questions")

            # Check translation cache
            from app.services.cache import TTL_SUMMARY
            translation_cache_key = f"translation:{request.video_id}:{request.language}"
            cached_translation = cache.get(translation_cache_key)

            if cached_translation:
                print(f"Using cached translation for {request.language} transcript")
                # Use first 5000 chars of translation
                transcript_preview = cached_translation[:5000]
            else:
                # Translate preview using Gemini
                translated = gemini_client.translate_to_english(transcript_preview)

                if translated:
                    transcript_preview = translated
                else:
                    print(f"Failed to translate, using fallback questions")
                    return SuggestedQuestionsResponse(
                        success=True,
                        questions=FALLBACK_QUESTIONS,
                        cached=False,
                        error=f"Failed to translate from {request.language}"
                    )

        # Generate questions with Gemini (synchronous call)
        questions = gemini_client.generate_questions(transcript_preview)

        if not questions:
            # Generation failed, use fallback
            questions = FALLBACK_QUESTIONS

        # Cache the result for 24 hours
        cache.set(cache_key, questions, TTL_SUGGESTED_QUESTIONS)

        return SuggestedQuestionsResponse(
            success=True,
            questions=questions,
            cached=False
        )

    except Exception as e:
        print(f"Error generating suggested questions: {e}")
        # Return fallback questions instead of failing completely
        return SuggestedQuestionsResponse(
            success=True,
            questions=FALLBACK_QUESTIONS,
            cached=False,
            error=str(e)
        )


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(request: ChatMessageRequest):
    """
    Send a chat message and get AI response about the video

    Uses Gemini 2.0 Flash for conversational Q&A with:
    - Transcript context
    - Chat history (last 6 messages)
    - Timestamp citations when relevant

    Responses are cached for 24 hours based on video_id + question + language.

    If transcript is not in English, it will be automatically translated to English first.

    Args:
        request: Contains video_id, transcript, question, chat_history, and optional language code

    Returns:
        AI-generated response based on video content
    """
    try:
        # Validate inputs
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        if not request.transcript.strip():
            raise HTTPException(status_code=400, detail="Transcript is required")

        cache = get_cache()
        gemini_client = get_gemini_client()
        transcript_text = request.transcript

        # Create cache key based on video_id, question, and language
        # Hash the question to use in cache key (avoid special characters)
        import hashlib
        question_hash = hashlib.md5(request.question.strip().encode()).hexdigest()[:16]
        lang_code = request.language or 'en'
        chat_cache_key = f"chat_message:{request.video_id}:{question_hash}:{lang_code}"

        # Check cache first (24-hour TTL)
        cached_response = cache.get(chat_cache_key)
        if cached_response:
            print(f"Returning cached chat response for video {request.video_id}, question: {request.question[:50]}...")
            return ChatMessageResponse(
                success=True,
                response=cached_response,
                cached=True
            )

        # Translate to English if not already in English
        if request.language and request.language != 'en':
            print(f"Translating transcript from {request.language} to English for chat")

            # Check translation cache
            from app.services.cache import TTL_SUMMARY
            translation_cache_key = f"translation:{request.video_id}:{request.language}"
            cached_translation = cache.get(translation_cache_key)

            if cached_translation:
                print(f"Using cached translation for {request.language} transcript")
                transcript_text = cached_translation
            else:
                # Translate using Gemini
                translated = gemini_client.translate_to_english(request.transcript)

                if not translated:
                    return ChatMessageResponse(
                        success=False,
                        error=f"Failed to translate transcript from {request.language} to English. Gemini may not be available."
                    )

                transcript_text = translated
                # Cache translation for 7 days
                cache.set(translation_cache_key, translated, TTL_SUMMARY)
                print(f"Translation cached for {request.language} transcript")

        # Generate response with Gemini
        response_text = gemini_client.generate_chat_response(
            transcript=transcript_text,
            question=request.question,
            video_id=request.video_id,
            chat_history=request.chat_history
        )

        if not response_text:
            return ChatMessageResponse(
                success=False,
                error="Failed to generate response. Gemini may not be available."
            )

        # Cache the response for 24 hours
        cache.set(chat_cache_key, response_text, TTL_CHAT_MESSAGE)
        print(f"Cached chat response for video {request.video_id}")

        return ChatMessageResponse(
            success=True,
            response=response_text,
            cached=False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat message: {e}")
        return ChatMessageResponse(
            success=False,
            error=str(e)
        )
