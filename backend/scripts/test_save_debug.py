#!/usr/bin/env python3
"""
Debug script to test saving items to Supabase
"""
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from app.services.supabase_client import get_supabase_admin

def test_save_item():
    """Test saving an item to Supabase"""
    print("=== Testing Save Item to Supabase ===\n")

    supabase = get_supabase_admin()

    # Test data
    test_user_id = "70310a35-d348-421b-8854-e8c50e1e0085"  # test@mintclip.com
    video_id = "umV4DToYRik"
    item_type = "summary_short"

    # First, check if user exists
    print("1. Checking if user exists...")
    try:
        result = supabase.table('users').select('*').eq('id', test_user_id).execute()
        if result.data:
            user = result.data[0]
            print(f"   ✓ User found: {user.get('email')}")
            print(f"   ✓ User tier: {user.get('tier', 'free')}")
        else:
            print(f"   ✗ User not found with ID: {test_user_id}")
            return False
    except Exception as e:
        print(f"   ✗ Error checking user: {e}")
        return False

    # Check existing saved items count
    print("\n2. Checking existing saved items...")
    try:
        result = supabase.table('saved_items').select('id', count='exact').eq('user_id', test_user_id).execute()
        print(f"   ✓ Current saved items count: {result.count}")
    except Exception as e:
        print(f"   ✗ Error counting saved items: {e}")
        return False

    # Check if this specific item already exists
    print("\n3. Checking if item already exists...")
    try:
        result = supabase.table('saved_items').select('*') \
            .eq('user_id', test_user_id) \
            .eq('video_id', video_id) \
            .eq('item_type', item_type) \
            .execute()

        if result.data:
            print(f"   ✓ Item exists (will update):")
            print(f"     - ID: {result.data[0].get('id')}")
            print(f"     - Created: {result.data[0].get('created_at')}")
        else:
            print(f"   ✓ Item doesn't exist (will create new)")
    except Exception as e:
        print(f"   ✗ Error checking existing item: {e}")
        return False

    # Test saving/updating the item
    print("\n4. Testing save operation...")
    test_content = {
        "videoTitle": "Test Video",
        "savedAt": "2026-02-11T00:00:00Z",
        "format": "short",
        "summary": "This is a test summary."
    }

    try:
        from datetime import datetime, timedelta, timezone

        # Check if user is premium
        is_premium = supabase.table('users').select('tier').eq('id', test_user_id).execute().data[0].get('tier') == 'premium'

        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        if is_premium:
            expires_at = None

        data = {
            'user_id': test_user_id,
            'video_id': video_id,
            'item_type': item_type,
            'content': test_content,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'source': 'extension'
        }

        print(f"   Data to save:")
        print(f"     - user_id: {data['user_id']}")
        print(f"     - video_id: {data['video_id']}")
        print(f"     - item_type: {data['item_type']}")
        print(f"     - expires_at: {data['expires_at']}")
        print(f"     - source: {data['source']}")

        result = supabase.table('saved_items').upsert(
            data,
            on_conflict='user_id,video_id,item_type'
        ).execute()

        if result.data:
            print(f"   ✓ Save successful!")
            print(f"     - Returned {len(result.data)} row(s)")
            print(f"     - Item ID: {result.data[0].get('id')}")
            return True
        else:
            print(f"   ✗ Save failed - no data returned")
            return False

    except Exception as e:
        print(f"   ✗ Error during save: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Verify the save
    print("\n5. Verifying saved item...")
    try:
        result = supabase.table('saved_items').select('*') \
            .eq('user_id', test_user_id) \
            .eq('video_id', video_id) \
            .eq('item_type', item_type) \
            .execute()

        if result.data:
            item = result.data[0]
            print(f"   ✓ Item verified:")
            print(f"     - ID: {item.get('id')}")
            print(f"     - Content keys: {list(item.get('content', {}).keys())}")
            print(f"     - Created: {item.get('created_at')}")
            print(f"     - Expires: {item.get('expires_at')}")
            return True
        else:
            print(f"   ✗ Item not found after save")
            return False
    except Exception as e:
        print(f"   ✗ Error verifying save: {e}")
        return False

if __name__ == "__main__":
    success = test_save_item()
    print("\n" + "="*50)
    if success:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("✗ Tests failed!")
        sys.exit(1)
