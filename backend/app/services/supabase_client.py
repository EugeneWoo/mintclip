"""
Supabase client configuration and initialization
Handles database connections and Supabase Auth integration
"""

import os
import logging
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Flag to track if Supabase is available
SUPABASE_AVAILABLE = False
supabase_client = None
supabase_admin = None

try:
    from supabase import Client
    from supabase.lib.client_options import ClientOptions
    import httpx

    if SUPABASE_URL and SUPABASE_ANON_KEY:
        # Create httpx client without proxy argument to avoid compatibility issues
        # supabase 2.x has issues with newer httpx versions

        # Public client for user-facing operations (respects RLS)
        supabase_client = Client(SUPABASE_URL, SUPABASE_ANON_KEY)
        SUPABASE_AVAILABLE = True
        logger.info("Supabase client initialized successfully")

        # Admin client for server-side operations (bypasses RLS)
        if SUPABASE_SERVICE_ROLE_KEY:
            supabase_admin = Client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Supabase admin client initialized")
        else:
            logger.warning("SUPABASE_SERVICE_ROLE_KEY not set - admin operations unavailable")
    else:
        logger.warning("Supabase credentials not configured - database features disabled")

except ImportError as e:
    logger.warning(f"supabase-py not installed or import error: {e}")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")


def get_supabase() -> Optional["Client"]:
    """Get the public Supabase client (respects RLS)"""
    if not SUPABASE_AVAILABLE:
        return None
    return supabase_client


def get_supabase_admin() -> Optional["Client"]:
    """Get the admin Supabase client (bypasses RLS)"""
    if not SUPABASE_AVAILABLE or supabase_admin is None:
        return None
    return supabase_admin


def is_supabase_available() -> bool:
    """Check if Supabase is configured and available"""
    return SUPABASE_AVAILABLE
