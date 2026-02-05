-- Remove the problematic policy that exposes emails to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view registrations via view" ON public.registrations;

-- Drop the current view that uses security_invoker
DROP VIEW IF EXISTS public.registrations_public;

-- Create a new view WITHOUT security_invoker - it will be owned by postgres
-- and execute with owner privileges, allowing public access to safe columns only
CREATE VIEW public.registrations_public AS
SELECT 
  id,
  challenge_id,
  participant_name,
  score,
  total_reps,
  kettlebell_weight_kg,
  total_time_seconds,
  completion_date,
  murph_version,
  validation_type,
  video_url,
  user_id,
  year,
  is_verified,
  created_at
FROM public.registrations;
-- Note: email is intentionally excluded, and no security_invoker means
-- this view bypasses RLS and only exposes the columns we specify

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.registrations_public TO authenticated;
GRANT SELECT ON public.registrations_public TO anon;