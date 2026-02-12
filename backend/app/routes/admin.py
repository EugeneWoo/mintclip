"""
Admin API Routes
Internal endpoints for maintenance and cleanup tasks
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os

from app.services.cleanup_expired_items import cleanup_expired_items

router = APIRouter()


class CleanupResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str


@router.post("/cleanup-expired", response_model=CleanupResponse)
async def trigger_cleanup(x_admin_key: Optional[str] = Header(None)):
    """
    Manually trigger cleanup of expired saved items

    Requires X-Admin-Key header for authentication

    Returns:
        Number of items deleted
    """
    # Verify admin key
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        deleted_count = await cleanup_expired_items()
        return CleanupResponse(
            success=True,
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} expired items"
        )
    except Exception as e:
        print(f"Error in cleanup endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
