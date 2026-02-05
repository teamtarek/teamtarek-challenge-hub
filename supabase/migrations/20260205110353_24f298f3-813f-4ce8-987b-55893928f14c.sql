-- Fix security vulnerabilities for registrations and profiles tables

-- 1. Create a public view for registrations that excludes email
CREATE VIEW public.registrations_public
WITH (security_invoker=on) AS
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
-- Note: email is intentionally excluded

-- 2. Drop the overly permissive SELECT policy on registrations
DROP POLICY IF EXISTS "Anyone can view registrations" ON public.registrations;

-- 3. Create new restrictive policies for registrations
-- Users can only see their own registrations directly (for email access)
CREATE POLICY "Users can view their own registrations"
ON public.registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all registrations (including email for admin purposes)
CREATE POLICY "Admins can view all registrations"
ON public.registrations
FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));

-- 4. Drop the overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 5. Create new restrictive policies for profiles
-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can view public profiles (is_private = false)
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_private = false
);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));