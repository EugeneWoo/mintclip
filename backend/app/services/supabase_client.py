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
# New-style keys (sb_publishable_... / sb_secret_...) are preferred. The legacy JWT
# names are still read as a fallback so an environment can migrate independently.
# Legacy anon/service_role keys are retired by Supabase in early 2027.
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Flag to track if Supabase is available
SUPABASE_AVAILABLE = False
supabase_client = None
supabase_admin = None

try:
    from supabase import Client

    if SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY:
        # Public client for user-facing operations (respects RLS)
        supabase_client = Client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
        SUPABASE_AVAILABLE = True
        logger.info("Supabase client initialized successfully")

        # Admin client for server-side operations (bypasses RLS)
        if SUPABASE_SECRET_KEY:
            supabase_admin = Client(SUPABASE_URL, SUPABASE_SECRET_KEY)
            logger.info("Supabase admin client initialized")
        else:
            logger.warning("SUPABASE_SECRET_KEY not set - admin operations unavailable")
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
