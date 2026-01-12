"""
Gemini AI Client Service
Shared client for all Gemini API calls (summaries, questions, chat)

NOTE: Currently using fallback mode due to Python 3.14 incompatibility with google-generativeai.
To enable Gemini:
1. Use Python 3.11 or 3.12, OR
2. Wait for google-generativeai to support Python 3.14
"""

import os
import json
from typing import Optional, List

# Feature flag for Gemini availability
GEMINI_AVAILABLE = False

# Try to import google.generativeai, but gracefully handle Python 3.14 incompatibility
_genai = None
try:
    import google.generativeai as genai
    _genai = genai
    GEMINI_AVAILABLE = True
except (ImportError, TypeError) as e:
    print("=" * 80)
    print("WARNING: google.generativeai not available")
    print(f"Reason: {e}")
    print("Using fallback questions only. To enable Gemini:")
    print("  1. Use Python 3.11 or 3.12 (currently using 3.14)")
    print("  2. Or wait for protobuf/google-generativeai Python 3.14 support")
    print("=" * 80)
    GEMINI_AVAILABLE = False


class GeminiClient:
    """Wrapper for Google Gemini API with consistent error handling"""

    def __init__(self):
        self.model = None

        if not GEMINI_AVAILABLE:
            print("Gemini client not available (Python 3.14 incompatibility)")
            return

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY not set, Gemini features will not work")
            return

        try:
            _genai.configure(api_key=api_key)
            # Use Gemini 2.5 Flash Lite (bigger, faster, optimized for speed)
            self.model = _genai.GenerativeModel('gemini-2.5-flash-lite')
            print("Gemini client initialized successfully with gemini-2.5-flash-lite")
        except Exception as e:
            print(f"Failed to initialize Gemini client: {e}")
            self.model = None

    def generate_content(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Optional[str]:
        """
        Generate content using Gemini (synchronous)

        Args:
            prompt: The input prompt
            temperature: Creativity (0.0 = deterministic, 1.0 = creative)
            max_tokens: Maximum response length

        Returns:
            Generated text or None if error
        """
        if not self.model:
            print("Gemini model not initialized")
            return None

        try:
            if not GEMINI_AVAILABLE:
                return None

            response = self.model.generate_content(
                prompt,
                generation_config=_genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )

            if response.text:
                return response.text.strip()

            return None

        except Exception as e:
            print(f"Gemini API error: {e}")
            return None

    def generate_questions(self, transcript_preview: str) -> Optional[List[str]]:
        """
        Generate suggested questions from transcript (synchronous)

        Args:
            transcript_preview: First ~5000 chars of transcript

        Returns:
            List of 3 questions or None if error
        """
        from app.prompts.suggested_questions import build_few_shot_prompt, FALLBACK_QUESTIONS

        try:
            prompt = build_few_shot_prompt(transcript_preview)
            response_text = self.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=200,
            )

            if not response_text:
                return FALLBACK_QUESTIONS

            # Parse JSON array from response
            # Gemini might wrap it in markdown code blocks, so clean it
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            questions = json.loads(cleaned)

            # Validate we got exactly 3 questions
            if isinstance(questions, list) and len(questions) == 3:
                return questions
            else:
                print(f"Invalid question format: {questions}")
                return FALLBACK_QUESTIONS

        except json.JSONDecodeError as e:
            print(f"Failed to parse questions JSON: {e}")
            print(f"Raw response: {response_text}")
            return FALLBACK_QUESTIONS
        except Exception as e:
            print(f"Error generating questions: {e}")
            return FALLBACK_QUESTIONS

    def generate_summary(
        self,
        transcript: str,
        format: str = 'qa'
    ) -> Optional[str]:
        """
        Generate video summary (synchronous)

        Args:
            transcript: Full video transcript
            format: 'qa' or 'topic'

        Returns:
            Generated summary or None if error
        """
        from app.prompts.summary import get_summary_prompt

        try:
            prompt = get_summary_prompt(format, transcript)

            # Fixed max_tokens for summaries (up to 5 Q&As or 7 topics)
            max_tokens = 1500

            response_text = self.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=max_tokens,
            )

            return response_text

        except Exception as e:
            print(f"Error generating summary: {e}")
            return None

    def generate_chat_response(
        self,
        transcript: str,
        question: str,
        chat_history: list = None
    ) -> Optional[str]:
        """
        Generate conversational chat response (synchronous)

        Args:
            transcript: Full video transcript
            question: User's question
            chat_history: Previous messages [{"role": "user"/"assistant", "content": "..."}]

        Returns:
            Generated response or None if error
        """
        from app.prompts.chat import build_chat_prompt

        try:
            prompt = build_chat_prompt(transcript, question, chat_history)

            response_text = self.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=500,  # Concise responses
            )

            return response_text

        except Exception as e:
            print(f"Error generating chat response: {e}")
            return None

    def translate_to_english(self, text: str) -> Optional[str]:
        """
        Translate non-English text to English (synchronous)

        Args:
            text: Text to translate (any language)

        Returns:
            English translation or None if error
        """
        if not text or not text.strip():
            return None

        try:
            prompt = f"""Translate the following text to English. Preserve all timestamps in the format [MM:SS] or [HH:MM:SS] exactly as they appear. Only output the translation, nothing else.

Text to translate:
{text}"""

            response_text = self.generate_content(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more accurate translation
                max_tokens=4096,  # Allow for longer transcripts
            )

            return response_text

        except Exception as e:
            print(f"Error translating text: {e}")
            return None


# Global client instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create global Gemini client instance"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
