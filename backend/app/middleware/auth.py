"""
Authentication middleware and dependencies for protected routes
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.services.auth_service import auth_service
from app.services.supabase_client import get_supabase_admin, is_supabase_available

security = HTTPBearer(auto_error=False)


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency that requires valid authentication.
    Use for protected endpoints.

    Returns the decoded JWT payload with user info.
    Raises 401 if not authenticated or token invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload, error = await auth_service.validate_access_token(credentials.credentials)
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )

    return payload


async def optional_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[dict]:
    """
    Dependency that optionally validates authentication.
    Use for endpoints that work differently for authenticated vs anonymous users.

    Returns the decoded JWT payload if authenticated, None otherwise.
    """
    if not credentials:
        return None

    payload, _ = await auth_service.validate_access_token(credentials.credentials)
    return payload


async def require_tier(required_tier: str):
    """
    Factory for tier-based access control.
    Usage: Depends(require_tier("pro"))
    """
    async def check_tier(current_user: dict = Depends(require_auth)) -> dict:
        if not is_supabase_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service unavailable"
            )

        supabase_admin = get_supabase_admin()
        user_id = current_user["sub"]

        try:
            response = supabase_admin.table("users").select("tier").eq("id", user_id).single().execute()

            if not response.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            user_tier = response.data.get("tier", "free")

            # Tier hierarchy: enterprise > pro > free
            tier_levels = {"free": 0, "pro": 1, "enterprise": 2}
            if tier_levels.get(user_tier, 0) < tier_levels.get(required_tier, 0):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"This feature requires {required_tier} tier or higher"
                )

            current_user["tier"] = user_tier
            return current_user

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to verify tier")

    return check_tier


class QuotaChecker:
    """
    Check and enforce usage quotas for free tier users.
    """

    def __init__(self, quota_type: str):
        """
        Initialize quota checker.
        quota_type: "summary" or "chat"
        """
        self.quota_type = quota_type
        self.limits = {
            "free": {"summary": 10, "chat": 5},
            "pro": {"summary": -1, "chat": -1},  # -1 = unlimited
            "enterprise": {"summary": -1, "chat": -1}
        }

    async def __call__(
        self,
        current_user: dict = Depends(require_auth)
    ) -> dict:
        """Check if user has quota remaining"""
        if not is_supabase_available():
            # Graceful degradation: allow action if DB unavailable
            return current_user

        supabase_admin = get_supabase_admin()
        user_id = current_user["sub"]

        try:
            response = supabase_admin.table("users").select(
                "tier, summaries_used_this_month, chat_messages_used_this_month"
            ).eq("id", user_id).single().execute()

            if not response.data:
                return current_user

            data = response.data
            tier = data.get("tier", "free")
            limit = self.limits.get(tier, {}).get(self.quota_type, 0)

            # Unlimited tiers
            if limit == -1:
                current_user["tier"] = tier
                return current_user

            # Check current usage
            if self.quota_type == "summary":
                used = data.get("summaries_used_this_month", 0)
            else:
                used = data.get("chat_messages_used_this_month", 0)

            if used >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Monthly {self.quota_type} limit reached ({limit}). Upgrade to Pro for unlimited access."
                )

            current_user["tier"] = tier
            current_user["quota_remaining"] = limit - used
            return current_user

        except HTTPException:
            raise
        except Exception:
            # Graceful degradation
            return current_user


async def increment_quota(user_id: str, quota_type: str) -> bool:
    """
    Increment usage counter after successful operation.
    Call this after summary generation or chat message.
    """
    if not is_supabase_available():
        return False

    supabase_admin = get_supabase_admin()

    try:
        column = "summaries_used_this_month" if quota_type == "summary" else "chat_messages_used_this_month"

        # Use RPC for atomic increment
        supabase_admin.rpc("increment_quota", {
            "user_id": user_id,
            "column_name": column
        }).execute()

        return True

    except Exception:
        # Non-critical failure
        return False


# Pre-configured quota checkers
require_summary_quota = QuotaChecker("summary")
require_chat_quota = QuotaChecker("chat")
