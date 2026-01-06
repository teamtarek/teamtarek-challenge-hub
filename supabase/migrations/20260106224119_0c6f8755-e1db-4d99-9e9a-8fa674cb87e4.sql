-- Add category column to challenges table
ALTER TABLE public.challenges
ADD COLUMN category text NOT NULL DEFAULT 'outdoor';

-- Add comment for documentation
COMMENT ON COLUMN public.challenges.category IS 'Category of the challenge: outdoor or gym';