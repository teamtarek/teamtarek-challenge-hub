-- Add category column to posts table
ALTER TABLE public.posts 
ADD COLUMN category text NOT NULL DEFAULT 'outdoor-training'
CHECK (category IN ('outdoor-training', 'challenges', 'coaches-corner'));