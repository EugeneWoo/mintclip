"""
Test script to verify Supabase saved_items queries are working
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.supabase_client import get_supabase_admin, is_supabase_available

def test_query():
    print("Testing Supabase saved_items queries...")

    if not is_supabase_available():
        print("❌ Supabase is not available")
        return

    print("✓ Supabase is available")

    supabase = get_supabase_admin()
    if not supabase:
        print("❌ Could not get admin client")
        return

    print("✓ Admin client initialized")

    try:
        # Test 1: Check if table exists and get count
        print("\n1. Testing table access and count...")
        result = supabase.table('saved_items').select('id', count='exact').execute()
        print(f"   Total items in table: {result.count}")

        # Test 2: Get all items (limit 10)
        print("\n2. Testing select all (limit 10)...")
        result = supabase.table('saved_items').select('*').limit(10).execute()
        print(f"   Retrieved {len(result.data)} items")

        if result.data:
            print("\n   Sample item:")
            item = result.data[0]
            print(f"   - User ID: {item.get('user_id')}")
            print(f"   - Video ID: {item.get('video_id')}")
            print(f"   - Item Type: {item.get('item_type')}")
            print(f"   - Created: {item.get('created_at')}")
            print(f"   - Expires: {item.get('expires_at')}")

        # Test 3: Query by specific user (if any exists)
        if result.data:
            test_user_id = result.data[0]['user_id']
            print(f"\n3. Testing user-specific query (user: {test_user_id})...")
            user_result = supabase.table('saved_items') \
                .select('*') \
                .eq('user_id', test_user_id) \
                .execute()
            print(f"   User has {len(user_result.data)} saved items")

        print("\n✅ All queries successful!")

    except Exception as e:
        print(f"❌ Query failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_query()
