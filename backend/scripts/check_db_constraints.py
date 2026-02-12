#!/usr/bin/env python3
"""
Check what item_type values are allowed in the database
"""
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from app.services.supabase_client import get_supabase_admin

def check_constraints():
    """Check database constraints for saved_items table"""
    print("=== Checking saved_items table constraints ===\n")

    supabase = get_supabase_admin()

    # Query to check the table definition and constraints
    # We'll use PostgreSQL's information_schema
    query = """
    SELECT
        pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conrelid = 'public.saved_items'::regclass
    AND conname = 'saved_items_item_type_check';
    """

    try:
        # Execute raw SQL query
        result = supabase.table('saved_items').select('*').limit(1).execute()
        print("Current table data sample:")
        if result.data:
            for item in result.data:
                print(f"  - item_type: {item.get('item_type')}")
        else:
            print("  (no data yet)")

    except Exception as e:
        print(f"Error: {e}")

    # Let's also try to see what values currently exist
    print("\nTrying to find existing item_type values...")
    try:
        result = supabase.table('saved_items').select('item_type').execute()
        if result.data:
            types = set([item.get('item_type') for item in result.data])
            print(f"Existing item_type values: {types}")
        else:
            print("No items in table yet")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_constraints()
