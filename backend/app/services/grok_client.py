"""
Grok (xAI) Client Service
Shared client for all LLM calls (summaries, questions, chat, translation).

Uses xAI's OpenAI-compatible REST API via httpx (no extra SDK dependency).
Env vars:
  GROK_API_KEY            required
  GROK_MODEL              default "grok-4.3"
  GROK_REASONING_EFFORT   default "none" (skips hidden reasoning tokens: faster,
                          cheaper, and max_tokens maps to visible output)
"""

import os
import json
from typing import Optional, List

import httpx

XAI_BASE_URL = "https://api.x.ai/v1"
DEFAULT_MODEL = "grok-4.3"
REQUEST_TIMEOUT_SECONDS = 120.0


class GrokClient:
    """Wrapper for the xAI Grok API with consistent error handling"""

    def __init__(self):
        self.api_key = os.getenv("GROK_API_KEY")
        self.model = os.getenv("GROK_MODEL", DEFAULT_MODEL)
        self.reasoning_effort = os.getenv("GROK_REASONING_EFFORT", "none")
        self._http: Optional[httpx.Client] = None

        if not self.api_key:
            print("WARNING: GROK_API_KEY not set, Grok features will not work")
            self.model = None
            return

        self._http = httpx.Client(
            base_url=XAI_BASE_URL,
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        print(f"Grok client initialized successfully with {self.model}")

    def generate_content(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Optional[str]:
        """
        Generate content using Grok (synchronous)

        Args:
            prompt: The input prompt
            temperature: Creativity (0.0 = deterministic, 1.0 = creative)
            max_tokens: Maximum response length

        Returns:
            Generated text or None if error
        """
        if not self.model or not self._http:
            print("Grok model not initialized")
            return None

        try:
            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if self.reasoning_effort and self.reasoning_effort != "default":
                payload["reasoning_effort"] = self.reasoning_effort

            response = self._http.post("/chat/completions", json=payload)
            if response.status_code != 200:
                print(f"Grok API error: {response.status_code} {response.text[:500]}")
                return None

            data = response.json()
            choice = data["choices"][0]
            text = (choice.get("message") or {}).get("content")
            if choice.get("finish_reason") == "length":
                print(f"WARNING: Grok response truncated at max_tokens={max_tokens}")

            return text.strip() if text and text.strip() else None

        except Exception as e:
            print(f"Grok API error: {e}")
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
            # The model might wrap it in markdown code blocks, so clean it
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
            # - qa: 4500 tokens for up to 10 questions with detailed answers and timestamps
            # - topic: 4500 tokens for up to 10 topics with descriptions, key insights, and timestamps
            max_tokens_by_format = {
                'short': 800,
                'qa': 4500,
                'topic': 4500,
            }
            max_tokens = max_tokens_by_format.get(format, 1500)

            response_text = self.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=max_tokens,
            )

            # Check if response appears truncated (ends with header or incomplete sentence)
            if response_text:
                lines = response_text.strip().split('\n')
                last_line = lines[-1] if lines else ''
                ends_with_header = last_line.startswith('#')

                if ends_with_header:
                    print(f"⚠️  WARNING: Summary for format '{format}' appears truncated (ends with header)")
                    print(f"   Last line: {last_line[:100]}")
                    print(f"   Response length: {len(response_text)} chars")
                    print(f"   Consider increasing max_tokens (current: {max_tokens})")

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
        Generate conversational chat response using embeddings retrieval with full transcript fallback

        Strategy:
        1. Try embeddings (semantic search via Pinecone)
        2. If response indicates "not discussed", fall back to full transcript
        3. If Pinecone unavailable, go straight to full transcript

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
        from app.services.pinecone_embeddings import find_relevant_chunks

        try:
            # Step 1: Try embeddings retrieval (semantic)
            embeddings_context = find_relevant_chunks(question, video_id, transcript, top_k=5)

            if embeddings_context:
                prompt = build_chat_prompt(embeddings_context, question, chat_history)
                embeddings_response = self.generate_content(
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=1500,
                )

                if embeddings_response and not is_empty_or_not_discussed(embeddings_response):
                    print(f"✓ Embeddings response successful - using it")
                    return embeddings_response
                else:
                    print(f"⚠ Embeddings response indicates topic not discussed, falling back to full transcript...")
            else:
                print(f"⚠ Embeddings unavailable, falling back to full transcript...")

            # Step 2: Full transcript fallback
            print(f"Sending full transcript to Grok ({len(transcript)} chars)")
            prompt = build_chat_prompt(transcript, question, chat_history)
            full_response = self.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=1500,
            )

            return full_response

        except Exception as e:
            print(f"Error generating chat response: {e}")
            import traceback
            traceback.print_exc()
            return None

    def translate_to_english(self, text: str) -> Optional[str]:
        """
        Translate non-English text to English using Grok.

        Args:
            text: Text to translate (any language)

        Returns:
            English translation or None if error
        """
        if not text or not text.strip():
            return None

        try:
            prompt = f"""Translate ALL of the following text into English. Every word must be in English in the output — even parts that are already in English must be included as-is or lightly cleaned up. Do not skip, omit, or summarize any portion. Output only the translated text, nothing else.

Text to translate:
{text}"""

            return self.generate_content(
                prompt=prompt,
                temperature=0.3,
                max_tokens=8192,
            )

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
            # Use Grok to find relevant passages via semantic matching
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
_grok_client: Optional[GrokClient] = None


def get_grok_client() -> GrokClient:
    """Get or create global Grok client instance"""
    global _grok_client
    if _grok_client is None:
        _grok_client = GrokClient()
    return _grok_client
