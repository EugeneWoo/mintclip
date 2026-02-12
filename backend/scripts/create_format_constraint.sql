-- Run this in Supabase SQL Editor to fix the constraint issue

-- First, check what constraints exist
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'saved_items'::regclass
  AND contype = 'u';

-- If you see the old constraint (user_id, video_id, item_type), drop it:
ALTER TABLE saved_items DROP CONSTRAINT IF EXISTS saved_items_user_id_video_id_item_type_key;

-- Create the new constraint with format included
ALTER TABLE saved_items
ADD CONSTRAINT saved_items_user_id_video_id_item_type_format_key
UNIQUE (user_id, video_id, item_type, format);

-- Verify it was created
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'saved_items'::regclass
  AND contype = 'u';
