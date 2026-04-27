"""
Cleanup Service for Expired Saved Items
Automatically deletes expired items based on expires_at timestamp
"""

from datetime import datetime, timezone
from app.services.supabase_client import get_supabase


async def cleanup_expired_items() -> int:
    """
    Delete expired saved items and highlights from the database

    Returns:
        Total number of items deleted across all tables
    """
    try:
        supabase = get_supabase()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Delete items where expires_at < NOW() and expires_at IS NOT NULL
        # (NULL expires_at means premium user with no expiration)
        result = supabase.table('saved_items') \
            .delete() \
            .lt('expires_at', now_iso) \
            .execute()

        deleted_count = len(result.data) if result.data else 0
        print(f"[Cleanup] Deleted {deleted_count} expired items")

        # Delete expired highlights in the same pass
        highlights_result = supabase.table('highlights') \
            .delete() \
            .lt('expires_at', now_iso) \
            .execute()

        highlights_deleted = len(highlights_result.data) if highlights_result.data else 0
        print(f"[Cleanup] Deleted {highlights_deleted} expired highlights")

        return deleted_count + highlights_deleted

    except Exception as e:
        print(f"[Cleanup] Error deleting expired items: {e}")
        import traceback
        traceback.print_exc()
        return 0
