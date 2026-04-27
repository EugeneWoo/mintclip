"""
Highlights API Routes
Endpoints for saving, retrieving, and deleting text highlights from transcripts and summaries.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.services.supabase_client import get_supabase_admin
from app.middleware.auth import require_auth

router = APIRouter()


# Request/Response Models
class SaveHighlightRequest(BaseModel):
    video_id: str
    selected_text: str
    source_type: str  # 'transcript' | 'summary'
    segment_index: Optional[int] = None
    char_start: int
    char_end: int
    summary_format: Optional[str] = None  # 'short' | 'topic' | 'qa'
    expires_at: Optional[datetime] = None


class HighlightResponse(BaseModel):
    success: bool
    highlight: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class HighlightsListResponse(BaseModel):
    success: bool
    highlights: List[Dict[str, Any]] = []
    error: Optional[str] = None


class DeleteHighlightResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


@router.post("", response_model=HighlightResponse)
async def save_highlight(
    request: SaveHighlightRequest,
    current_user: dict = Depends(require_auth)
):
    """
    Save a text highlight from a transcript or summary.

    Args:
        request: Highlight data including video_id, selected_text, source_type, and character offsets
        current_user: Authenticated user from middleware

    Returns:
        Created highlight row
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        data: Dict[str, Any] = {
            "user_id": user_id,
            "video_id": request.video_id,
            "selected_text": request.selected_text,
            "source_type": request.source_type,
            "char_start": request.char_start,
            "char_end": request.char_end,
        }

        if request.segment_index is not None:
            data["segment_index"] = request.segment_index

        if request.summary_format is not None:
            data["summary_format"] = request.summary_format

        if request.expires_at is not None:
            data["expires_at"] = request.expires_at.isoformat()

        result = supabase.table("highlights").insert(data).execute()

        if result.data:
            return HighlightResponse(success=True, highlight=result.data[0])
        else:
            return HighlightResponse(success=False, error="Failed to save highlight")

    except Exception as e:
        print(f"Error saving highlight: {e}")
        return HighlightResponse(success=False, error=str(e))


@router.get("/{video_id}", response_model=HighlightsListResponse)
async def get_highlights(
    video_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get all highlights for the authenticated user for a specific video.

    Args:
        video_id: YouTube video identifier
        current_user: Authenticated user from middleware

    Returns:
        List of highlights ordered by created_at ASC
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        result = supabase.table("highlights") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("video_id", video_id) \
            .order("created_at", desc=False) \
            .execute()

        return HighlightsListResponse(success=True, highlights=result.data)

    except Exception as e:
        print(f"Error fetching highlights: {e}")
        return HighlightsListResponse(success=False, error=str(e))


@router.delete("/{id}", response_model=DeleteHighlightResponse)
async def delete_highlight(
    id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Delete a highlight by ID, scoped to the authenticated user.

    Args:
        id: Highlight UUID
        current_user: Authenticated user from middleware

    Returns:
        404 if not found or not owned by the current user, otherwise success
    """
    try:
        supabase = get_supabase_admin()
        user_id = current_user["sub"]

        # Verify the highlight exists and belongs to this user before deleting
        existing = supabase.table("highlights") \
            .select("id") \
            .eq("id", id) \
            .eq("user_id", user_id) \
            .execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Highlight not found")

        supabase.table("highlights") \
            .delete() \
            .eq("id", id) \
            .eq("user_id", user_id) \
            .execute()

        return DeleteHighlightResponse(success=True, message="Highlight deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting highlight: {e}")
        return DeleteHighlightResponse(success=False, error=str(e))
