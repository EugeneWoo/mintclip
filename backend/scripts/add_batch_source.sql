-- Add 'batch' as valid value for saved_items.source check constraint
ALTER TABLE public.saved_items DROP CONSTRAINT IF EXISTS saved_items_source_check;

ALTER TABLE public.saved_items
ADD CONSTRAINT saved_items_source_check
CHECK (source IN ('extension', 'upload', 'batch'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.saved_items'::regclass
AND conname = 'saved_items_source_check';
