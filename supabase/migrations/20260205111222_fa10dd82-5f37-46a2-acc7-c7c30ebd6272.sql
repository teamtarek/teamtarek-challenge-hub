-- Drop the security definer view
DROP VIEW IF EXISTS public.registrations_public;

-- Create a SECURITY DEFINER function to get public registration data
-- This function runs with elevated privileges but only returns safe columns
CREATE OR REPLACE FUNCTION public.get_public_registrations(p_challenge_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  challenge_id uuid,
  participant_name text,
  score integer,
  total_reps integer,
  kettlebell_weight_kg integer,
  total_time_seconds integer,
  completion_date date,
  murph_version text,
  validation_type text,
  video_url text,
  user_id uuid,
  year integer,
  is_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.challenge_id,
    r.participant_name,
    r.score,
    r.total_reps,
    r.kettlebell_weight_kg,
    r.total_time_seconds,
    r.completion_date,
    r.murph_version,
    r.validation_type,
    r.video_url,
    r.user_id,
    r.year,
    r.is_verified,
    r.created_at
  FROM public.registrations r
  WHERE (p_challenge_id IS NULL OR r.challenge_id = p_challenge_id);
$$;