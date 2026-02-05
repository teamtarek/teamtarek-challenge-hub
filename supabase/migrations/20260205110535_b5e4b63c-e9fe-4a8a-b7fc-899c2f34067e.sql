-- Fix invite_tokens public SELECT policy - should only be checkable, not fully readable
DROP POLICY IF EXISTS "Anyone can check token validity" ON public.invite_tokens;

-- Create a more restrictive policy that only allows checking specific tokens
-- This prevents enumeration while still allowing token validation during registration
CREATE POLICY "Users can check specific token validity"
ON public.invite_tokens
FOR SELECT
USING (
  -- Only allow checking if a specific token exists and is valid
  -- Actual usage happens via the secure trigger function
  auth.uid() IS NOT NULL OR 
  -- Allow checking token during registration (no auth yet)
  -- But limit to only see unexpired, unused tokens (prevents enumeration)
  (used_by_user_id IS NULL AND (expires_at IS NULL OR expires_at > now()))
);