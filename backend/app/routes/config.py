"""
Config endpoint for fetching client-safe configuration
Provides Supabase public credentials for Realtime subscriptions
"""

import logging
from fastapi import APIRouter

from app.services.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY, is_supabase_available

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/config/supabase")
async def get_supabase_config():
    """
    Get Supabase public configuration for client-side Realtime subscriptions

    Returns:
        - supabase_url: Supabase project URL
        - supabase_anon_key: Public anon key (safe for client-side use)
        - realtime_available: Whether Realtime is configured

    Note: The anon key is safe to expose - it only allows RLS-protected operations
    """
    if not is_supabase_available():
        return {
            "success": False,
            "realtime_available": False,
            "error": "Supabase not configured",
        }

    return {
        "success": True,
        "realtime_available": True,
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY,
    }
