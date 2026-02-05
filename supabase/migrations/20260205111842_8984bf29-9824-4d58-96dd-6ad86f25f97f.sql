-- =============================================
-- REGISTRATIONS TABLE SECURITY HARDENING
-- =============================================

-- Drop existing SELECT policies on registrations
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;
DROP POLICY IF EXISTS "Authenticated users can view registrations via view" ON public.registrations;

-- Create strict SELECT policies
-- Only owner can see their own registration (with email)
CREATE POLICY "Owner can view own registration"
ON public.registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all registrations
CREATE POLICY "Admins can view all registrations"
ON public.registrations
FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Anyone can register for challenges" ON public.registrations;
DROP POLICY IF EXISTS "Users can register for challenges" ON public.registrations;
DROP POLICY IF EXISTS "Authenticated users can register for challenges" ON public.registrations;

-- Require authentication for INSERT and user must set their own user_id
CREATE POLICY "Authenticated users can register themselves"
ON public.registrations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update their own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;

-- Only owner can update their own non-score fields
CREATE POLICY "Owner can update own registration"
ON public.registrations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any registration (for verification, scores)
CREATE POLICY "Admins can update any registration"
ON public.registrations
FOR UPDATE
USING (is_admin_or_webmaster(auth.uid()));

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Users can delete their own registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.registrations;

-- Only admins can delete registrations
CREATE POLICY "Admins can delete registrations"
ON public.registrations
FOR DELETE
USING (is_admin_or_webmaster(auth.uid()));

-- =============================================
-- MEMBERSHIPS TABLE SECURITY HARDENING
-- =============================================

-- Drop all existing policies on memberships
DROP POLICY IF EXISTS "Users can view their own membership" ON public.memberships;
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.memberships;
DROP POLICY IF EXISTS "System can insert memberships" ON public.memberships;
DROP POLICY IF EXISTS "System can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Service and admins can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;

-- SELECT: Users can only see their own membership
CREATE POLICY "Users can view own membership"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
ON public.memberships
FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));

-- INSERT: Only service role (Stripe webhook) - no user policy needed
-- Service role bypasses RLS, so we create a restrictive policy that blocks normal users
CREATE POLICY "No direct insert for users"
ON public.memberships
FOR INSERT
WITH CHECK (false);

-- UPDATE: Only admins can update memberships (service role bypasses RLS for webhooks)
CREATE POLICY "Admins can update memberships"
ON public.memberships
FOR UPDATE
USING (is_admin_or_webmaster(auth.uid()));

-- DELETE: Only admins can delete memberships
CREATE POLICY "Admins can delete memberships"
ON public.memberships
FOR DELETE
USING (is_admin_or_webmaster(auth.uid()));

-- =============================================
-- UNIQUE CONSTRAINT FOR REGISTRATIONS
-- =============================================

-- Add unique constraint to prevent duplicate registrations per user/challenge/year
-- First drop if exists to avoid errors
DROP INDEX IF EXISTS idx_unique_user_challenge_year;

-- Create unique index for authenticated users (user_id + challenge_id + year)
CREATE UNIQUE INDEX idx_unique_user_challenge_year 
ON public.registrations (user_id, challenge_id, year) 
WHERE user_id IS NOT NULL;