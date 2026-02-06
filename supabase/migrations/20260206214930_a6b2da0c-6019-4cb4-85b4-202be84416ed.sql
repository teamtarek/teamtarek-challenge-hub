
-- Allow users to delete their own unverified registrations
CREATE POLICY "Users can delete their own unverified registrations"
ON public.registrations
FOR DELETE
USING (auth.uid() = user_id AND is_verified = false);
