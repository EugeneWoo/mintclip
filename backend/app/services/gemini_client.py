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
            # Use Gemini 2.5 Flash Lite for speed and cost efficiency (switch to 'gemini-2.5-flash' for complex workflows)
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
            format: 'qa' (up to 10 questions), 'topic' (up to 10 topics), or 'short' (exactly 3 sections)

        Returns:
            Generated summary or None if error
        """
        from app.prompts.summary import get_summary_prompt

        try:
            prompt = get_summary_prompt(format, transcript)

            # Set max_tokens based on format to ensure complete output
            # - short: 800 tokens for concise 3-section summary
            # - qa: 3500 tokens for up to 10 questions with detailed answers and timestamps
            # - topic: 3500 tokens for up to 10 topics with descriptions and timestamps
            max_tokens_by_format = {
                'short': 800,
                'qa': 3500,
                'topic': 3500,
            }
            max_tokens = max_tokens_by_format.get(format, 1500)

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
        video_id: str,
        chat_history: list = None
    ) -> Optional[str]:
        """
        Generate conversational chat response using HYBRID retrieval (BM25 + embeddings fallback)

        Strategy:
        1. Try BM25 first (2.7x faster, works for ~80% of queries)
        2. Generate response with BM25 context
        3. If response indicates "not discussed", fall back to embeddings
        4. This gives us speed + semantic understanding when needed

        Args:
            transcript: Full video transcript
            question: User's question
            video_id: Video identifier for cache
            chat_history: Previous messages [{"role": "user"/"assistant", "content": "..."}]

        Returns:
            Generated response or None if error
        """
        from app.prompts.chat import build_chat_prompt
        from app.services.hybrid_retrieval import is_empty_or_not_discussed
        from app.services.bm25_retrieval import retrieve_relevant_chunks_with_transcript as bm25_retrieve
        from app.services.pinecone_embeddings import get_or_compute_embeddings, find_relevant_chunks

        try:
            # Step 1: Try BM25 retrieval (fast)
            from app.services import bm25_retrieval
            # Clear cache to ensure fresh retrieval
            bm25_retrieval.clear_cache(video_id)

            bm25_context = bm25_retrieve(
                transcript=transcript,
                question=question,
                video_id=video_id,
                top_k=3
            )

            if bm25_context:
                # Generate response with BM25 context
                prompt = build_chat_prompt(bm25_context, question, chat_history)
                bm25_response = self.generate_content(
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=500,
                )

                # Check if BM25 found a meaningful answer
                if bm25_response and not is_empty_or_not_discussed(bm25_response):
                    print(f"✓ BM25 response successful - using it")
                    return bm25_response
                else:
                    print(f"⚠ BM25 response indicates topic not discussed, falling back to embeddings...")

            # Step 2: Fall back to embeddings (slower but more semantic)
            chunks, embeddings = get_or_compute_embeddings(video_id, transcript)
            embeddings_context = find_relevant_chunks(question, video_id, top_k=3)

            if embeddings_context:
                prompt = build_chat_prompt(embeddings_context, question, chat_history)
                embeddings_response = self.generate_content(
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=500,
                )

                if embeddings_response:
                    return embeddings_response

            # Step 3: Last resort - return BM25 response even if it says "not discussed"
            return bm25_response if bm25_response else None

        except Exception as e:
            print(f"Error generating chat response: {e}")
            import traceback
            traceback.print_exc()
            return None

    def translate_to_english(self, text: str) -> Optional[str]:
        """
        Translate non-English text to English (synchronous)

        Handles long texts by chunking them to avoid Gemini returning the original text.

        Args:
            text: Text to translate (any language)

        Returns:
            English translation or None if error
        """
        if not text or not text.strip():
            return None

        # For very long texts, chunk them to avoid Gemini returning original
        MAX_CHARS = 8000  # Safe chunk size
        if len(text) > MAX_CHARS:
            # Process in chunks and combine
            chunks = []
            words = text.split()
            current_chunk = []
            current_length = 0

            for word in words:
                word_len = len(word) + 1  # +1 for space
                if current_length + word_len > MAX_CHARS and current_chunk:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = [word]
                    current_length = word_len
                else:
                    current_chunk.append(word)
                    current_length += word_len

            if current_chunk:
                chunks.append(' '.join(current_chunk))

            # Translate each chunk and combine
            translated_chunks = []
            for chunk in chunks:
                translated = self._translate_single(chunk)
                if translated:
                    translated_chunks.append(translated)

            return ' '.join(translated_chunks) if translated_chunks else None

        return self._translate_single(text)

    def _translate_single(self, text: str) -> Optional[str]:
        """
        Translate a single chunk of text to English

        Args:
            text: Text chunk to translate

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
                max_tokens=8192,  # Increased from 4096
            )

            return response_text

        except Exception as e:
            print(f"Error translating text: {e}")
            return None

    def retrieve_relevant_context(
        self,
        full_transcript: str,
        question: str,
        max_context_length: int = 12000
    ) -> str:
        """
        Intelligently retrieve relevant portions of transcript based on question

        Uses semantic search to find and extract the most relevant passages
        from the full transcript, ensuring the AI has access to information
        wherever it appears in the video.

        Args:
            full_transcript: Complete video transcript
            question: User's question to match against
            max_context_length: Maximum characters to return (default 12k)

        Returns:
            Most relevant transcript passages, or fallback to first N chars
        """
        if not full_transcript or not question:
            return full_transcript[:max_context_length]

        # If transcript is short enough, return it all
        if len(full_transcript) <= max_context_length:
            return full_transcript

        try:
            # Use Gemini to find relevant passages via semantic matching
            retrieval_prompt = f"""You are a semantic search engine. Given a transcript and a question,
identify the MOST RELEVANT passages that would help answer the question.

Extract 2-4 relevant passages from the transcript. Each passage should be:
- Directly related to answering the question
- 500-1500 characters long
- Include timestamps if present
- Sufficiently detailed to provide context

CRITICAL RULES:
- Return ONLY the extracted passages, separated by double newlines
- Do NOT add any explanations, summaries, or commentary
- Do NOT modify the transcript text
- Include timestamps exactly as they appear
- If no highly relevant passages exist, return the first 3000 characters

QUESTION: {question}

TRANSCRIPT:
{full_transcript}

RELEVANT PASSAGES:"""

            relevant_passages = self.generate_content(
                prompt=retrieval_prompt,
                temperature=0.3,  # Low temperature for focused extraction
                max_tokens=4000,
            )

            if relevant_passages and relevant_passages.strip():
                # Validate we got meaningful content (not just an error message)
                if len(relevant_passages) > 200 and not relevant_passages.lower().startswith("i cannot"):
                    print(f"Retrieved {len(relevant_passages)} chars of relevant context")
                    return relevant_passages[:max_context_length]

            # Fallback: return first chunk if retrieval failed
            print("Semantic retrieval failed, using fallback")
            return full_transcript[:max_context_length]

        except Exception as e:
            print(f"Error in semantic retrieval: {e}")
            # Fallback to simple truncation
            return full_transcript[:max_context_length]


# Global client instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create global Gemini client instance"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
