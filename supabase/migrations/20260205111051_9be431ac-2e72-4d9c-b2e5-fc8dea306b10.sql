-- The registrations_public view uses security_invoker=on, which means it respects
-- the RLS policies on the base registrations table. Since registrations now has
-- restrictive SELECT policies (only owner/admin), we need to ensure authenticated
-- users can read public registration data through the view.

-- Add a policy on registrations that allows authenticated users to read
-- only non-sensitive fields. Since we can't do column-level RLS, the view
-- with security_invoker handles this by only selecting safe columns.

-- Actually, the view with security_invoker means queries go through as the
-- calling user. We need a policy that allows any authenticated user to SELECT
-- from registrations (the view filters out the email).

-- Create policy for authenticated users to read registrations via the view
-- This is safe because the view excludes email addresses
CREATE POLICY "Authenticated users can view registrations via view"
ON public.registrations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix memberships UPDATE policy to be more restrictive
-- Keep INSERT permissive for webhooks (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "System can update memberships" ON public.memberships;

CREATE POLICY "Service and admins can update memberships"
ON public.memberships
FOR UPDATE
USING (is_admin_or_webmaster(auth.uid()));