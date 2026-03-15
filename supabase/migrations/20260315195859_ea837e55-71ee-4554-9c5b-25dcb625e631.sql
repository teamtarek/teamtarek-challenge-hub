
-- Add new columns for workout library structure
ALTER TABLE public.training_content
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS workout_number integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS equipment_tags text[] DEFAULT '{}';

-- Add update trigger for coaches to also update content with new fields
-- (existing RLS policies already cover admin/coach access)
