"""
Saved Items API Routes
Endpoints for saving and retrieving user's saved summaries and transcripts
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import os

from app.services.supabase_client import get_supabase_admin
from app.middleware.auth import require_auth

router = APIRouter()


# Request/Response Models
class SaveItemRequest(BaseModel):
    video_id: str
    item_type: Literal['summary', 'transcript', 'summary_short', 'summary_topic', 'summary_qa']
    content: Dict[str, Any]  # Flexible JSONB content
    source: Optional[Literal['extension', 'upload']] = 'extension'  # Track where item came from


class SaveItemResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


class GetSavedItemsResponse(BaseModel):
    success: bool
    items: list[Dict[str, Any]] = []
    error: Optional[str] = None


class GetSavedItemResponse(BaseModel):
    success: bool
    item: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/save", response_model=SaveItemResponse)
async def save_item(request: SaveItemRequest, current_user: dict = Depends(require_auth)):
    """
    Save a summary or transcript to user's library

    Args:
        request: Contains video_id, item_type, and content (JSONB)
        user: Authenticated user from middleware

    Returns:
        Success status with message
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]
        is_premium = current_user.get('tier') == 'premium'

        # Extract format from content or derive from item_type FIRST
        format_value = None
        if request.item_type == 'transcript':
            format_value = 'transcript'
        elif request.item_type == 'summary':
            # Extract format from content JSON (short/topic/qa)
            format_value = request.content.get('format', 'short')  # Default to 'short'
        elif request.item_type in ['summary_short', 'summary_topic', 'summary_qa']:
            # Legacy support for item_type with format embedded
            format_value = request.item_type.replace('summary_', '')
            request.item_type = 'summary'  # Normalize to 'summary'

        # Check saved items limit for free tier users
        if not is_premium:
            MAX_SAVED_ITEMS = int(os.getenv("FREE_TIER_MAX_SAVED_ITEMS", "25"))

            # Check if this is a new item (not an update)
            existing = supabase.table('saved_items') \
                .select('id', count='exact') \
                .eq('user_id', user_id) \
                .eq('video_id', request.video_id) \
                .eq('item_type', request.item_type) \
                .eq('format', format_value) \
                .execute()

            # If item doesn't exist, check total count
            if not existing.data:
                total_count = supabase.table('saved_items') \
                    .select('id', count='exact') \
                    .eq('user_id', user_id) \
                    .execute()

                if total_count.count >= MAX_SAVED_ITEMS:
                    return SaveItemResponse(
                        success=False,
                        error="You have reached the limit for saved content."
                    )

        # Calculate expiration date (30 days for free tier, None for premium)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        if is_premium:
            expires_at = None  # Premium users have no expiration

        # Upsert saved item (insert or update if exists)
        data = {
            'user_id': user_id,
            'video_id': request.video_id,
            'item_type': request.item_type,
            'format': format_value,
            'content': request.content,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'source': request.source  # Track source: 'extension' or 'upload'
        }

        result = supabase.table('saved_items').upsert(
            data,
            on_conflict='user_id,video_id,item_type,format'
        ).execute()

        if result.data:
            return SaveItemResponse(
                success=True,
                message=f"{request.item_type.capitalize()} saved successfully"
            )
        else:
            return SaveItemResponse(
                success=False,
                error="Failed to save item"
            )

    except Exception as e:
        print(f"Error saving item: {e}")
        return SaveItemResponse(
            success=False,
            error=str(e)
        )


@router.get("/list", response_model=GetSavedItemsResponse)
async def list_saved_items(
    item_type: Optional[str] = None,
    current_user: dict = Depends(require_auth)
):
    """
    Get all saved items for the authenticated user

    Args:
        item_type: Optional filter by type ('summary', 'transcript')
        user: Authenticated user from middleware

    Returns:
        List of saved items
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        query = supabase.table('saved_items').select('*').eq('user_id', user_id)

        # Apply type filter if provided
        if item_type:
            query = query.eq('item_type', item_type)

        # Order by creation date (newest first)
        query = query.order('created_at', desc=True)

        result = query.execute()

        return GetSavedItemsResponse(
            success=True,
            items=result.data
        )

    except Exception as e:
        print(f"Error listing saved items: {e}")
        return GetSavedItemsResponse(
            success=False,
            error=str(e)
        )


@router.get("/{video_id}/{item_type}", response_model=GetSavedItemResponse)
async def get_saved_item(
    video_id: str,
    item_type: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get a specific saved item by video ID and type

    Args:
        video_id: Video identifier
        item_type: Type of item ('summary', 'transcript')
        user: Authenticated user from middleware

    Returns:
        Saved item if found
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        result = supabase.table('saved_items') \
            .select('*') \
            .eq('user_id', user_id) \
            .eq('video_id', video_id) \
            .eq('item_type', item_type) \
            .execute()

        if result.data and len(result.data) > 0:
            return GetSavedItemResponse(
                success=True,
                item=result.data[0]
            )
        else:
            return GetSavedItemResponse(
                success=True,
                item=None
            )

    except Exception as e:
        print(f"Error getting saved item: {e}")
        return GetSavedItemResponse(
            success=False,
            error=str(e)
        )


@router.delete("/video/{video_id}", response_model=SaveItemResponse)
async def delete_all_video_items(
    video_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Delete ALL saved items for a video (all item_types)

    Args:
        video_id: Video identifier
        user: Authenticated user from middleware

    Returns:
        Success status with count of deleted items
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        # First, count how many items will be deleted
        existing = supabase.table('saved_items') \
            .select('id', count='exact') \
            .eq('user_id', user_id) \
            .eq('video_id', video_id) \
            .execute()

        count = existing.count if existing.count is not None else 0

        # Delete all items for this video_id and user_id
        result = supabase.table('saved_items') \
            .delete() \
            .eq('user_id', user_id) \
            .eq('video_id', video_id) \
            .execute()

        return SaveItemResponse(
            success=True,
            message=f"Deleted {count} item(s) for video {video_id}"
        )

    except Exception as e:
        print(f"Error deleting all video items: {e}")
        return SaveItemResponse(
            success=False,
            error=str(e)
        )


@router.delete("/{video_id}/{item_type}", response_model=SaveItemResponse)
async def delete_saved_item(
    video_id: str,
    item_type: str,
    current_user: dict = Depends(require_auth)
):
    """
    Delete a saved item

    Args:
        video_id: Video identifier
        item_type: Type of item ('summary', 'transcript')
        user: Authenticated user from middleware

    Returns:
        Success status
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        result = supabase.table('saved_items') \
            .delete() \
            .eq('user_id', user_id) \
            .eq('video_id', video_id) \
            .eq('item_type', item_type) \
            .execute()

        return SaveItemResponse(
            success=True,
            message=f"{item_type.capitalize()} deleted successfully"
        )

    except Exception as e:
        print(f"Error deleting saved item: {e}")
        return SaveItemResponse(
            success=False,
            error=str(e)
        )
