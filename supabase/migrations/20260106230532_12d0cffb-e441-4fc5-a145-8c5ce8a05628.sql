-- Add new columns to registrations table for kettlebell challenges
ALTER TABLE public.registrations 
ADD COLUMN IF NOT EXISTS kettlebell_weight_kg integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_time_seconds integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completion_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reps integer DEFAULT NULL;