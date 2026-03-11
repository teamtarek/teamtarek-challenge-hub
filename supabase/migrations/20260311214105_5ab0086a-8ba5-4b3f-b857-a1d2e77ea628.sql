
-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate with WITH CHECK that prevents users from changing is_founding_member
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (is_founding_member = (SELECT p.is_founding_member FROM public.profiles p WHERE p.user_id = auth.uid()))
);
