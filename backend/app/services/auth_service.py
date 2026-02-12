"""
Authentication service with JWT token management
Handles Supabase Auth integration, token validation, and user management
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from dataclasses import dataclass

import jwt
import httpx
from dotenv import load_dotenv

from app.services.supabase_client import get_supabase, get_supabase_admin, is_supabase_available

load_dotenv()

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "1"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))


@dataclass
class TokenPair:
    """Access and refresh token pair"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # seconds


@dataclass
class UserProfile:
    """User profile data"""
    id: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    tier: str
    summaries_used: int
    chat_messages_used: int
    created_at: datetime


class AuthService:
    """Handles authentication operations with Supabase Auth + custom JWT"""

    def __init__(self):
        self.supabase = get_supabase()
        self.supabase_admin = get_supabase_admin()

    async def signup_with_email(
        self,
        email: str,
        password: str,
        display_name: Optional[str] = None,
        privacy_accepted: bool = False,
        terms_accepted: bool = False
    ) -> Tuple[Optional[TokenPair], Optional[str]]:
        """
        Register new user with email/password via Supabase Auth
        Returns (TokenPair, None) on success or (None, error_message) on failure
        """
        if not is_supabase_available():
            return None, "Authentication service unavailable"

        if not privacy_accepted or not terms_accepted:
            return None, "You must accept the privacy policy and terms of service"

        try:
            # Sign up via Supabase Auth with metadata for consent tracking
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": display_name,
                        "privacy_accepted": "true" if privacy_accepted else "false",
                        "terms_accepted": "true" if terms_accepted else "false"
                    }
                }
            })

            if response.user is None:
                return None, "Signup failed - please try again"

            # Check if email confirmation is required
            if response.session is None:
                # Email confirmation required - return success but no tokens yet
                return None, "Please check your email to confirm your account"

            # Generate our own JWT tokens for the session
            tokens = self._create_token_pair(response.user.id, email)
            return tokens, None

        except Exception as e:
            logger.error(f"Signup error: {e}", exc_info=True)
            error_msg = str(e)
            if "already registered" in error_msg.lower():
                return None, "Email already registered"
            # Return actual error for debugging
            return None, f"Signup failed: {error_msg}"

    async def login_with_email(
        self,
        email: str,
        password: str
    ) -> Tuple[Optional[TokenPair], Optional[UserProfile], Optional[str]]:
        """
        Authenticate user with email/password
        Returns (TokenPair, UserProfile, None) on success or (None, None, error_message) on failure
        """
        if not is_supabase_available():
            return None, None, "Authentication service unavailable"

        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            if response.user is None:
                return None, None, "Invalid email or password"

            # Update last login timestamp
            await self._update_last_login(response.user.id)

            # Get user profile
            profile = await self.get_user_profile(response.user.id)

            # Check if account is pending deletion
            if profile and await self._is_deletion_pending(response.user.id):
                return None, None, "Account is scheduled for deletion. Contact support to restore."

            # Generate tokens
            tokens = self._create_token_pair(response.user.id, email)
            return tokens, profile, None

        except Exception as e:
            logger.error(f"Login error: {e}")
            return None, None, "Invalid email or password"

    async def verify_google_token(
        self,
        google_token: str
    ) -> Tuple[Optional[TokenPair], Optional[UserProfile], Optional[str]]:
        """
        Verify a Google OAuth token from Chrome Identity API and return our JWT tokens.
        Used by Chrome extension after completing OAuth flow with chrome.identity.getAuthToken.
        """
        try:
            # Log token info for debugging (first 20 chars only)
            logger.info(f"Verifying Google token (prefix): {google_token[:20]}...")

            # Verify the Google token and get user info
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {google_token}"},
                    timeout=10.0
                )

                if response.status_code != 200:
                    logger.error(f"Google token verification failed: {response.status_code} {response.text}")
                    # Try alternative endpoint
                    logger.info("Attempting tokeninfo endpoint as fallback...")
                    response = await client.get(
                        f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={google_token}",
                        timeout=10.0
                    )
                    if response.status_code != 200:
                        logger.error(f"Tokeninfo endpoint also failed: {response.status_code} {response.text}")
                        return None, None, "Invalid or expired Google token. Please try signing in again."

                    # If tokeninfo worked, get userinfo
                    token_info = response.json()
                    logger.info(f"Token info retrieved: {token_info}")

                    # Get user info using the token
                    response = await client.get(
                        "https://www.googleapis.com/oauth2/v2/userinfo",
                        headers={"Authorization": f"Bearer {google_token}"},
                        timeout=10.0
                    )
                    if response.status_code != 200:
                        logger.error(f"V2 userinfo also failed: {response.status_code} {response.text}")
                        return None, None, "Failed to retrieve user information from Google"

                google_user = response.json()
                logger.info(f"Successfully retrieved Google user info for: {google_user.get('email')}")

            email = google_user.get("email")
            if not email:
                return None, None, "No email associated with this Google account"

            # Use email as user_id for simplicity (or generate a UUID)
            # We'll use the Google sub (subject) as a stable user identifier
            google_sub = google_user.get("sub")
            if not google_sub:
                return None, None, "Invalid Google user data"

            # Create a deterministic user_id from Google sub
            # Format as proper UUID with dashes for consistency
            import hashlib
            hash_hex = hashlib.sha256(f"google:{google_sub}".encode()).hexdigest()[:32]
            user_id = f"{hash_hex[0:8]}-{hash_hex[8:12]}-{hash_hex[12:16]}-{hash_hex[16:20]}-{hash_hex[20:32]}"

            display_name = google_user.get("name")
            avatar_url = google_user.get("picture")

            # Get or create user profile in our database
            profile = await self.get_user_profile(user_id)

            if not profile:
                # First-time user - create profile
                profile = await self._create_user_profile(
                    user_id=user_id,
                    email=email,
                    display_name=display_name,
                    avatar_url=avatar_url
                )
            else:
                # Update last login for existing user
                await self._update_last_login(user_id)

            # Check if account is pending deletion
            if profile and await self._is_deletion_pending(user_id):
                return None, None, "Account is scheduled for deletion. Contact support to restore."

            # Generate our JWT tokens
            tokens = self._create_token_pair(user_id, email)
            return tokens, profile, None

        except httpx.RequestError as e:
            logger.error(f"Google API request error: {e}")
            return None, None, "Failed to verify Google token"
        except Exception as e:
            logger.error(f"Google token verification error: {e}", exc_info=True)
            return None, None, f"Failed to verify authentication: {str(e)}"

    async def _create_user_profile(
        self,
        user_id: str,
        email: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Optional[UserProfile]:
        """Create a new user profile in the database"""
        if not self.supabase_admin:
            return None

        try:
            now = datetime.now(timezone.utc)
            data = {
                "id": user_id,
                "email": email,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "tier": "free",
                "summaries_used_this_month": 0,
                "chat_messages_used_this_month": 0,
                "created_at": now.isoformat(),
                "last_login_at": now.isoformat()
            }

            self.supabase_admin.table("users").insert(data).execute()

            return UserProfile(
                id=user_id,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url,
                tier="free",
                summaries_used=0,
                chat_messages_used=0,
                created_at=now
            )
        except Exception as e:
            logger.error(f"Failed to create user profile: {e}")
            return None

    async def refresh_tokens(
        self,
        refresh_token: str
    ) -> Tuple[Optional[TokenPair], Optional[str]]:
        """
        Refresh access token using refresh token
        Returns (TokenPair, None) on success or (None, error_message) on failure
        """
        try:
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

            if payload.get("type") != "refresh":
                return None, "Invalid refresh token"

            user_id = payload.get("sub")
            email = payload.get("email")

            if not user_id or not email:
                return None, "Invalid refresh token"

            # Check if user still exists and is not deleted
            if await self._is_deletion_pending(user_id):
                return None, "Account is scheduled for deletion"

            # Generate new token pair
            tokens = self._create_token_pair(user_id, email)
            return tokens, None

        except jwt.ExpiredSignatureError:
            return None, "Refresh token expired - please login again"
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid refresh token: {e}")
            return None, "Invalid refresh token"

    async def validate_access_token(
        self,
        token: str
    ) -> Tuple[Optional[dict], Optional[str]]:
        """
        Validate access token and return payload
        Returns (payload, None) on success or (None, error_message) on failure
        """
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

            if payload.get("type") != "access":
                return None, "Invalid token type"

            return payload, None

        except jwt.ExpiredSignatureError:
            return None, "Token expired"
        except jwt.InvalidTokenError as e:
            logger.error(f"Token validation error: {e}")
            return None, "Invalid token"

    async def logout(self, user_id: str) -> bool:
        """
        Logout user (Supabase session invalidation)
        Note: Our stateless JWTs will still be valid until expiry
        """
        if not is_supabase_available():
            return False

        try:
            self.supabase.auth.sign_out()
            return True
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile from database"""
        if not is_supabase_available():
            return None

        try:
            response = self.supabase_admin.table("users").select("*").eq("id", user_id).single().execute()

            if response.data:
                data = response.data
                return UserProfile(
                    id=data["id"],
                    email=data["email"],
                    display_name=data.get("display_name"),
                    avatar_url=data.get("avatar_url"),
                    tier=data.get("tier", "free"),
                    summaries_used=data.get("summaries_used_this_month", 0),
                    chat_messages_used=data.get("chat_messages_used_this_month", 0),
                    created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
                )
            return None

        except Exception as e:
            logger.error(f"Get profile error: {e}")
            return None

    def _create_token_pair(self, user_id: str, email: str) -> TokenPair:
        """Create access and refresh token pair"""
        now = datetime.now(timezone.utc)

        # Access token (short-lived)
        access_payload = {
            "sub": user_id,
            "email": email,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(hours=JWT_ACCESS_TOKEN_EXPIRE_HOURS)
        }
        access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        # Refresh token (long-lived)
        refresh_payload = {
            "sub": user_id,
            "email": email,
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        }
        refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600
        )

    async def _update_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        if not self.supabase_admin:
            return

        try:
            self.supabase_admin.table("users").update({
                "last_login_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Failed to update last login: {e}")

    async def _is_deletion_pending(self, user_id: str) -> bool:
        """Check if user account is pending deletion"""
        if not self.supabase_admin:
            return False

        try:
            response = self.supabase_admin.table("users").select("deletion_requested_at").eq("id", user_id).single().execute()
            return response.data and response.data.get("deletion_requested_at") is not None
        except Exception:
            return False


# Singleton instance
auth_service = AuthService()
