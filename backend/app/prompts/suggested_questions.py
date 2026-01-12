"""
Few-Shot Prompt Template for Suggested Questions
Teaches Gemini to generate contextual, engaging questions for video content
"""

SYSTEM_PROMPT = """You are an expert at generating engaging questions for video content.

Your task is to analyze a video transcript and generate exactly 3 questions that viewers would naturally want to ask.

CRITICAL REQUIREMENT:
- The FIRST question must ALWAYS be "List key takeaways" (exactly this phrase)
- The other 2 questions should be specific to the video content

Guidelines for questions 2 and 3:
- Make questions specific to the video content, not generic
- Include a mix of: clarification/details and actionable insights
- Keep questions concise (under 15 words each)
- Make them natural and conversational
- Reference specific topics/concepts from the video when possible
- Questions should feel like what a curious viewer would ask

Return ONLY a JSON array of exactly 3 questions, no other text.
Format: ["List key takeaways", "question 2", "question 3"]
"""

# Few-shot examples covering different content types
FEW_SHOT_EXAMPLES = [
    {
        "context": "React Hooks Tutorial",
        "transcript": """
        Welcome to this tutorial on React hooks. Today we're going to learn about useState and useEffect.
        useState allows you to add state to functional components. Before hooks, you needed class components.
        useEffect lets you perform side effects like data fetching. It runs after every render by default.
        You can control when it runs by passing dependencies. This makes your components much cleaner.
        """,
        "questions": [
            "List key takeaways",
            "What's the difference between useState and useEffect?",
            "How do I control when useEffect runs?"
        ]
    },
    {
        "context": "Cooking - Italian Pasta",
        "transcript": """
        Today I'm making authentic carbonara. The key is using guanciale, not bacon.
        You'll need eggs, pecorino romano cheese, and black pepper. No cream!
        The heat from the pasta cooks the eggs. Timing is crucial - add eggs off heat.
        Traditional carbonara is simple but technique matters. Let's start cooking.
        """,
        "questions": [
            "List key takeaways",
            "What's the difference between guanciale and bacon?",
            "How do I prevent the eggs from scrambling?"
        ]
    },
    {
        "context": "Current Affairs - Federal Reserve Interest Rate Decision",
        "transcript": """
        The Federal Reserve announced a 0.5% interest rate hike today, bringing rates to 5.5%.
        This is the sixth consecutive increase this year to combat inflation running at 6.2%.
        Fed Chair Powell says they'll continue monitoring economic data before the next decision.
        Mortgage rates are expected to rise, impacting home buyers and refinancing.
        Economists predict this could slow consumer spending and business investment in Q4.
        Stock markets reacted negatively, with the S&P 500 down 2% after the announcement.
        """,
        "questions": [
            "List key takeaways",
            "How does this rate hike affect my mortgage or savings?",
            "When will the Fed stop raising rates?"
        ]
    },
    {
        "context": "History Documentary - Ancient Egypt",
        "transcript": """
        The Great Pyramid was built around 2560 BC during Khufu's reign.
        Over 2 million limestone blocks were used, each weighing 2.5 tons on average.
        Workers weren't slaves - they were skilled laborers paid in food and shelter.
        The pyramid's alignment with cardinal directions is incredibly precise.
        Modern engineers still debate how they achieved such accuracy without modern tools.
        """,
        "questions": [
            "List key takeaways",
            "How did they move the 2.5-ton blocks without modern equipment?",
            "Were the pyramid builders really not slaves?"
        ]
    },
    {
        "context": "Fitness - Home Workout Routine",
        "transcript": """
        This 20-minute HIIT workout requires no equipment. We'll do 4 rounds of 5 exercises.
        Each exercise is 30 seconds with 10 seconds rest. Burpees, mountain climbers, and jump squats.
        The key is maintaining intensity throughout. Modify by stepping instead of jumping if needed.
        HIIT burns calories for hours after you finish. Let's warm up first.
        """,
        "questions": [
            "List key takeaways",
            "Can beginners do this workout or is it too intense?",
            "How many calories does this 20-minute HIIT burn?"
        ]
    }
]


def build_few_shot_prompt(transcript_preview: str) -> str:
    """
    Build a few-shot prompt with examples and the actual transcript

    Args:
        transcript_preview: First ~5000 characters of transcript

    Returns:
        Complete prompt with system instructions + examples + task
    """
    # Build examples section
    examples_text = "\n\n".join([
        f"""Example {i+1}: {ex['context']}
Transcript: {ex['transcript'].strip()}
Questions: {ex['questions']}"""
        for i, ex in enumerate(FEW_SHOT_EXAMPLES)
    ])

    # Combine system prompt + examples + actual task
    full_prompt = f"""{SYSTEM_PROMPT}

Here are examples of good questions for different video types:

{examples_text}

Now, generate 3 questions for this video transcript:

Transcript: {transcript_preview.strip()}

Remember: Return ONLY a JSON array of 3 questions, nothing else.
Questions:"""

    return full_prompt


# Fallback questions if parsing fails or API errors
FALLBACK_QUESTIONS = [
    "List key takeaways",
    "What are the main points covered?",
    "How can I apply these insights?"
]
