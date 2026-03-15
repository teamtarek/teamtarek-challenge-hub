
-- Drop the overly permissive SELECT policy that exposes all tokens
DROP POLICY IF EXISTS "Users can check specific token validity" ON public.invite_tokens;
