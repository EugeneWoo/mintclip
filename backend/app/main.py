"""
Mintclip Backend API
FastAPI server for transcript extraction, summarization, and chat
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from dotenv import load_dotenv
import os
import logging

from app.routes import transcript, summary, chat, auth, saved_items, admin, config
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

# Custom CORS middleware to handle chrome-extension:// origins
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")

        # Handle preflight requests
        if request.method == "OPTIONS":
            from starlette.responses import Response
            response = Response(status_code=200)
            # Set CORS headers
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response

        # Process regular requests
        response = await call_next(request)

        # Allow chrome-extension:// and http(s):// origins
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response

# Add custom CORS middleware
app.add_middleware(CustomCORSMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transcript.router, prefix="/api/transcript", tags=["Transcript"])
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(saved_items.router, prefix="/api/saved-items", tags=["Saved Items"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(config.router, tags=["Config"])


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
    from app.services.cache import get_cache

    ws_user = os.getenv("WS_USER")
    ws_pass = os.getenv("WS_PASS")
    cache = get_cache()

    return {
        "proxy_enabled": bool(ws_user and ws_pass),
        "ws_user_set": bool(ws_user),
        "ws_pass_set": bool(ws_pass),
        "ws_user_preview": ws_user[:8] + "..." if ws_user else None,
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "cache_type": cache.__class__.__name__,
        "redis_url_set": bool(os.getenv("REDIS_URL"))
    }
