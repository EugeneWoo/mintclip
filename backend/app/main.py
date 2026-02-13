"""
Mintclip Backend API
FastAPI server for transcript extraction, summarization, and chat
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

from app.routes import transcript, summary, chat, auth, saved_items, admin
from app.scheduler import start_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transcript.router, prefix="/api/transcript", tags=["Transcript"])
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(saved_items.router, prefix="/api/saved-items", tags=["Saved Items"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    logger.info("Starting Mintclip API...")
    start_scheduler()
    logger.info("Mintclip API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Mintclip API...")
    shutdown_scheduler()
    logger.info("Mintclip API shutdown complete")


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


@app.get("/debug/proxy-config")
async def debug_proxy_config():
    """Debug endpoint to check proxy configuration"""
    ws_user = os.getenv("WS_USER")
    ws_pass = os.getenv("WS_PASS")

    return {
        "proxy_enabled": bool(ws_user and ws_pass),
        "ws_user_set": bool(ws_user),
        "ws_pass_set": bool(ws_pass),
        "ws_user_preview": ws_user[:8] + "..." if ws_user else None,
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }
