-- Add 'batch' to item_type check constraint for batch group rows
ALTER TABLE public.saved_items DROP CONSTRAINT IF EXISTS saved_items_item_type_check;

ALTER TABLE public.saved_items
ADD CONSTRAINT saved_items_item_type_check
CHECK (item_type IN ('chat', 'summary', 'transcript', 'summary_short', 'summary_topic', 'summary_qa', 'batch'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.saved_items'::regclass
AND conname = 'saved_items_item_type_check';
