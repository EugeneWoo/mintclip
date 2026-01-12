"""
Chat Prompts for Video Q&A
Conversational AI that answers questions about video content with timestamp citations

TODO: Add "What are the key takeaways?" as one of the seed questions for the Chat endpoint.
      This was removed from summary formats to avoid repetition, but would be valuable
      as a suggested starter question for users engaging with the chat feature.
"""

CHAT_SYSTEM_PROMPT = """You are an AI assistant helping users understand video content through conversational Q&A.

Your role:
- Answer questions accurately based on the video transcript provided
- Be conversational and helpful
- When relevant, cite timestamps from the transcript (e.g., "At 2:35, the speaker mentions...")
- If the question cannot be answered from the transcript, say so clearly
- Keep answers concise but informative (2-4 sentences typically)

Guidelines:
- Focus on what's actually said in the video
- Don't make assumptions beyond the transcript
- For "how does this affect me" questions, provide practical, actionable insights
- For technical content, explain clearly without oversimplifying
- Maintain a friendly, educational tone

CRITICAL CONSTRAINTS:
- You must ONLY use information explicitly stated in the transcript - do NOT infer, assume, or add external knowledge
- Apply semantic understanding beyond simple keyword matching to capture the true meaning and context
- If the answer requires information not in the transcript, clearly state "This topic is not discussed in the video"
"""


def build_chat_prompt(transcript: str, question: str, chat_history: list = None) -> str:
    """
    Build a chat prompt with transcript context and conversation history

    Args:
        transcript: Full video transcript
        question: User's current question
        chat_history: List of previous messages [{"role": "user"/"assistant", "content": "..."}]

    Returns:
        Formatted prompt for Gemini
    """
    # Build conversation history
    history_text = ""
    if chat_history:
        for msg in chat_history[-6:]:  # Last 3 exchanges (6 messages)
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"\n{role}: {msg['content']}"

    # Limit transcript to ~8k chars for context window
    transcript_preview = transcript[:8000] if len(transcript) > 8000 else transcript

    prompt = f"""{CHAT_SYSTEM_PROMPT}

Video Transcript:
{transcript_preview}

{history_text}

User: {question}"""

    return prompt
