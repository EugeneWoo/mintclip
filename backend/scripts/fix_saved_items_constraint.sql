-- Drop the existing check constraint
ALTER TABLE public.saved_items DROP CONSTRAINT IF EXISTS saved_items_item_type_check;

-- Add a new check constraint that includes all summary formats
ALTER TABLE public.saved_items
ADD CONSTRAINT saved_items_item_type_check
CHECK (item_type IN ('chat', 'summary', 'transcript', 'summary_short', 'summary_topic', 'summary_qa'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.saved_items'::regclass;
