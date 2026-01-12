"""
Mintclip Backend API
FastAPI server for transcript extraction, summarization, and chat
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routes import transcript, summary, chat

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Mintclip API",
    description="Backend API for YouTube transcript extraction, AI summarization, and chat",
    version="0.1.0"
)

# Configure CORS for Chrome extension
allowed_origins = os.getenv("ALLOWED_ORIGINS", "chrome-extension://*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Chrome extensions (they use chrome-extension:// protocol)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcript.router, prefix="/api/transcript", tags=["Transcript"])
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Mintclip API is running",
        "version": "0.1.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "transcript_extraction": "available",
            "ai_summarization": "available",
            "chat": "available"
        }
    }
