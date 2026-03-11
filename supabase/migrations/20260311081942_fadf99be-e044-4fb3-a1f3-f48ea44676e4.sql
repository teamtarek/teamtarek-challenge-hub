
-- Create admin_notifications table for merge candidates
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin notifications"
ON public.admin_notifications FOR SELECT
TO authenticated
USING (public.is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can update admin notifications"
ON public.admin_notifications FOR UPDATE
TO authenticated
USING (public.is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can delete admin notifications"
ON public.admin_notifications FOR DELETE
TO authenticated
USING (public.is_admin_or_webmaster(auth.uid()));

-- Allow edge functions (service role) to insert
CREATE POLICY "Service role can insert admin notifications"
ON public.admin_notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_webmaster(auth.uid()));

-- Make email nullable in registrations for admin-added entries
ALTER TABLE public.registrations ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.registrations ALTER COLUMN email SET DEFAULT NULL;
