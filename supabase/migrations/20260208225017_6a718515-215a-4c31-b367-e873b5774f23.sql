
-- Coach RLS policies for training_content
CREATE POLICY "Coaches can insert content"
ON public.training_content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'coach'
  )
  OR is_admin_or_webmaster(auth.uid())
);

CREATE POLICY "Coaches can update own content"
ON public.training_content
FOR UPDATE
USING (
  (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'coach'
  ))
  OR is_admin_or_webmaster(auth.uid())
);

CREATE POLICY "Coaches can view own content"
ON public.training_content
FOR SELECT
USING (
  (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'coach'
  ))
);

-- Coaches can manage sessions for their own programs
CREATE POLICY "Coaches can manage own sessions"
ON public.training_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.training_content tc
    WHERE tc.id = training_sessions.program_id
      AND tc.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'coach'
      )
  )
);
