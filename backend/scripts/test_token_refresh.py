#!/usr/bin/env python3
"""
Test script to verify token refresh functionality
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.auth_service import auth_service


async def test_token_refresh():
    """Test token refresh flow"""
    print("=== Token Refresh Test ===\n")

    # Step 1: Login with test credentials
    print("Step 1: Logging in with test account...")
    tokens, profile, error = await auth_service.login_with_email(
        email="test@mintclip.com",  # Update with your test email
        password="testpassword123"   # Update with your test password
    )

    if error:
        print(f"❌ Login failed: {error}")
        return

    print(f"✓ Login successful")
    print(f"  User: {profile.email}")
    print(f"  Access Token (first 20 chars): {tokens.access_token[:20]}...")
    print(f"  Refresh Token (first 20 chars): {tokens.refresh_token[:20]}...")
    print(f"  Expires in: {tokens.expires_in} seconds\n")

    # Step 2: Validate the access token
    print("Step 2: Validating access token...")
    payload, validate_error = await auth_service.validate_access_token(tokens.access_token)

    if validate_error:
        print(f"❌ Token validation failed: {validate_error}")
        return

    print(f"✓ Token valid")
    print(f"  User ID: {payload['sub']}")
    print(f"  Email: {payload.get('email')}\n")

    # Step 3: Refresh the tokens
    print("Step 3: Refreshing tokens...")
    new_tokens, refresh_error = await auth_service.refresh_tokens(tokens.refresh_token)

    if refresh_error:
        print(f"❌ Token refresh failed: {refresh_error}")
        return

    print(f"✓ Token refresh successful")
    print(f"  New Access Token (first 20 chars): {new_tokens.access_token[:20]}...")
    print(f"  New Refresh Token (first 20 chars): {new_tokens.refresh_token[:20]}...")
    print(f"  Expires in: {new_tokens.expires_in} seconds\n")

    # Step 4: Validate the new access token
    print("Step 4: Validating new access token...")
    new_payload, new_validate_error = await auth_service.validate_access_token(new_tokens.access_token)

    if new_validate_error:
        print(f"❌ New token validation failed: {new_validate_error}")
        return

    print(f"✓ New token valid")
    print(f"  User ID: {new_payload['sub']}")
    print(f"  Email: {new_payload.get('email')}\n")

    # Step 5: Verify old access token is still valid (Supabase doesn't invalidate old tokens)
    print("Step 5: Verifying old access token (should still be valid)...")
    old_payload, old_validate_error = await auth_service.validate_access_token(tokens.access_token)

    if old_validate_error:
        print(f"⚠️  Old token invalidated (unexpected): {old_validate_error}")
    else:
        print(f"✓ Old token still valid (expected with Supabase JWTs)")

    print("\n=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_token_refresh())
