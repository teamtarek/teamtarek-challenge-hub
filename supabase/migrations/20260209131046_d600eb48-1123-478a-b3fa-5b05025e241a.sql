
-- Admin can delete any comment
CREATE POLICY "Admins can delete any comments"
ON public.comments
FOR DELETE
USING (public.is_admin_or_webmaster(auth.uid()));

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any comments
CREATE POLICY "Admins can update any comments"
ON public.comments
FOR UPDATE
USING (public.is_admin_or_webmaster(auth.uid()));
