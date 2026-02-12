"""
Cleanup Service for Expired Saved Items
Automatically deletes expired items based on expires_at timestamp
"""

from datetime import datetime, timezone
from app.services.supabase_client import get_supabase


async def cleanup_expired_items() -> int:
    """
    Delete expired saved items from the database

    Returns:
        Number of items deleted
    """
    try:
        supabase = get_supabase()

        # Delete items where expires_at < NOW() and expires_at IS NOT NULL
        # (NULL expires_at means premium user with no expiration)
        result = supabase.table('saved_items') \
            .delete() \
            .lt('expires_at', datetime.now(timezone.utc).isoformat()) \
            .execute()

        deleted_count = len(result.data) if result.data else 0
        print(f"[Cleanup] Deleted {deleted_count} expired items")
        return deleted_count

    except Exception as e:
        print(f"[Cleanup] Error deleting expired items: {e}")
        import traceback
        traceback.print_exc()
        return 0
