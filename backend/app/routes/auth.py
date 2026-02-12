"""
Authentication routes for signup, login, token refresh, and GDPR data management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.services.auth_service import auth_service, UserProfile
from app.services.supabase_client import get_supabase_admin, is_supabase_available

router = APIRouter()
security = HTTPBearer(auto_error=False)


# Request/Response Models

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    display_name: Optional[str] = None
    privacy_accepted: bool = Field(description="User must accept privacy policy")
    terms_accepted: bool = Field(description="User must accept terms of service")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserProfileResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    tier: str
    summaries_used: int
    chat_messages_used: int
    created_at: datetime


class AuthResponse(BaseModel):
    tokens: Optional[TokenResponse]
    user: Optional[UserProfileResponse]
    message: Optional[str]


class MessageResponse(BaseModel):
    message: str
    success: bool


class GoogleTokenRequest(BaseModel):
    google_token: str = Field(description="Google OAuth token from Chrome Identity API")


class GoogleAuthCodeRequest(BaseModel):
    code: str = Field(description="Google OAuth authorization code from web OAuth flow")
    redirect_uri: str = Field(description="Redirect URI used in OAuth flow")


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class DataExportResponse(BaseModel):
    user_profile: dict
    usage_data: dict
    consent_records: dict
    export_date: str


# Helper to get current user from token

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Extract and validate user from Authorization header"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
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


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None

    payload, _ = await auth_service.validate_access_token(credentials.credentials)
    return payload


# Auth Endpoints

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    Register a new user with email and password.
    Requires acceptance of privacy policy and terms of service (GDPR compliance).
    """
    tokens, error = await auth_service.signup_with_email(
        email=request.email,
        password=request.password,
        display_name=request.display_name,
        privacy_accepted=request.privacy_accepted,
        terms_accepted=request.terms_accepted
    )

    if error:
        if "check your email" in error.lower():
            # Email confirmation required - not an error
            return AuthResponse(tokens=None, user=None, message=error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    # Get user profile
    payload, _ = await auth_service.validate_access_token(tokens.access_token)
    profile = await auth_service.get_user_profile(payload["sub"]) if payload else None

    return AuthResponse(
        tokens=TokenResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in
        ),
        user=_profile_to_response(profile) if profile else None,
        message="Signup successful"
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate with email and password.
    Returns access token, refresh token, and user profile.
    """
    tokens, profile, error = await auth_service.login_with_email(
        email=request.email,
        password=request.password
    )

    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    return AuthResponse(
        tokens=TokenResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in
        ),
        user=_profile_to_response(profile) if profile else None,
        message="Login successful"
    )


@router.post("/google/token", response_model=AuthResponse)
async def verify_google_token(request: GoogleTokenRequest):
    """
    Verify Google OAuth token from Chrome Identity API and return backend JWT tokens.
    Used by Chrome extension after completing OAuth flow with chrome.identity.getAuthToken.
    """
    tokens, profile, error = await auth_service.verify_google_token(request.google_token)

    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    return AuthResponse(
        tokens=TokenResponse(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in
        ),
        user=_profile_to_response(profile) if profile else None,
        message="Google authentication successful"
    )


@router.post("/google/code", response_model=AuthResponse)
async def exchange_google_code(request: GoogleAuthCodeRequest):
    """
    Exchange Google OAuth authorization code for backend JWT tokens.
    Used by web app after completing OAuth flow with authorization code.
    """
    import httpx
    import os

    try:
        # Exchange authorization code for Google access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": request.code,
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "redirect_uri": request.redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=10.0
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to exchange authorization code: {token_response.text}"
                )

            token_data = token_response.json()
            google_access_token = token_data.get("access_token")

            if not google_access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No access token in response"
                )

        # Now verify the Google access token and create our JWT
        tokens, profile, error = await auth_service.verify_google_token(google_access_token)

        if error:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

        return AuthResponse(
            tokens=TokenResponse(
                access_token=tokens.access_token,
                refresh_token=tokens.refresh_token,
                token_type=tokens.token_type,
                expires_in=tokens.expires_in
            ),
            user=_profile_to_response(profile) if profile else None,
            message="Google authentication successful"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshRequest):
    """
    Refresh access token using refresh token.
    Use this when access token expires.
    """
    tokens, error = await auth_service.refresh_tokens(request.refresh_token)
    if error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.
    Note: Stateless JWTs remain valid until expiry.
    """
    await auth_service.logout(current_user["sub"])
    return MessageResponse(message="Logged out successfully", success=True)


@router.get("/me", response_model=UserProfileResponse)
async def get_current_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user's profile.
    Requires authentication.
    """
    profile = await auth_service.get_user_profile(current_user["sub"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    return _profile_to_response(profile)


# GDPR Endpoints

@router.get("/gdpr/export", response_model=DataExportResponse)
async def export_user_data(current_user: dict = Depends(get_current_user)):
    """
    GDPR Article 20: Export all user data in machine-readable format.
    Returns complete user data for portability.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    supabase_admin = get_supabase_admin()
    user_id = current_user["sub"]

    try:
        response = supabase_admin.table("users").select("*").eq("id", user_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User data not found")

        data = response.data

        return DataExportResponse(
            user_profile={
                "id": data["id"],
                "email": data["email"],
                "display_name": data.get("display_name"),
                "avatar_url": data.get("avatar_url"),
                "tier": data.get("tier"),
                "created_at": data.get("created_at"),
                "last_login_at": data.get("last_login_at")
            },
            usage_data={
                "summaries_used_this_month": data.get("summaries_used_this_month", 0),
                "chat_messages_used_this_month": data.get("chat_messages_used_this_month", 0),
                "quota_reset_date": data.get("quota_reset_date")
            },
            consent_records={
                "privacy_policy_accepted_at": data.get("privacy_policy_accepted_at"),
                "terms_accepted_at": data.get("terms_accepted_at"),
                "marketing_consent": data.get("marketing_consent", False),
                "marketing_consent_at": data.get("marketing_consent_at")
            },
            export_date=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to export data")


@router.post("/gdpr/delete", response_model=MessageResponse)
async def request_account_deletion(current_user: dict = Depends(get_current_user)):
    """
    GDPR Article 17: Request account deletion.
    Initiates 30-day grace period before permanent deletion.
    User can cancel within this period.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    supabase_admin = get_supabase_admin()
    user_id = current_user["sub"]

    try:
        response = supabase_admin.rpc("request_account_deletion", {"user_id": user_id}).execute()

        if response.data:
            return MessageResponse(
                message="Account deletion scheduled. Your account will be permanently deleted in 30 days. You can cancel this by logging in and visiting /gdpr/cancel-delete.",
                success=True
            )
        else:
            return MessageResponse(
                message="Deletion already requested or account not found",
                success=False
            )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process deletion request")


@router.post("/gdpr/cancel-delete", response_model=MessageResponse)
async def cancel_account_deletion(current_user: dict = Depends(get_current_user)):
    """
    Cancel pending account deletion request.
    Only works during 30-day grace period.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    supabase_admin = get_supabase_admin()
    user_id = current_user["sub"]

    try:
        response = supabase_admin.rpc("cancel_account_deletion", {"user_id": user_id}).execute()

        if response.data:
            return MessageResponse(
                message="Account deletion cancelled. Your account is now active.",
                success=True
            )
        else:
            return MessageResponse(
                message="No pending deletion request found",
                success=False
            )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to cancel deletion")


@router.put("/gdpr/marketing-consent", response_model=MessageResponse)
async def update_marketing_consent(
    consent: bool,
    current_user: dict = Depends(get_current_user)
):
    """
    Update marketing email consent (opt-in/opt-out).
    GDPR requires explicit consent for marketing communications.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    supabase_admin = get_supabase_admin()
    user_id = current_user["sub"]

    try:
        from datetime import datetime, timezone
        supabase_admin.table("users").update({
            "marketing_consent": consent,
            "marketing_consent_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()

        status_msg = "opted in to" if consent else "opted out of"
        return MessageResponse(
            message=f"Successfully {status_msg} marketing communications",
            success=True
        )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update consent")


# Password Reset Endpoint

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Send password reset email via Supabase Auth.
    Works for both extension and web app users.

    Always returns success to prevent email enumeration attacks.
    """
    if not is_supabase_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Service unavailable")

    try:
        import logging
        logger = logging.getLogger(__name__)

        supabase_admin = get_supabase_admin()

        # Send password reset email via Supabase
        # Note: Supabase handles email verification and sends the reset link
        supabase_admin.auth.reset_password_for_email(
            request.email,
            {
                "redirect_to": "https://app.mintclip.com/reset-password"
            }
        )

        logger.info(f"Password reset email requested for: {request.email}")

        # Always return success to prevent email enumeration
        return MessageResponse(
            message="If an account exists with this email, a password reset link has been sent.",
            success=True
        )

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Password reset error: {e}", exc_info=True)

        # Always return success to prevent email enumeration
        return MessageResponse(
            message="If an account exists with this email, a password reset link has been sent.",
            success=True
        )


# Helper functions

def _profile_to_response(profile: UserProfile) -> UserProfileResponse:
    """Convert UserProfile to response model"""
    return UserProfileResponse(
        id=profile.id,
        email=profile.email,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
        tier=profile.tier,
        summaries_used=profile.summaries_used,
        chat_messages_used=profile.chat_messages_used,
        created_at=profile.created_at
    )
