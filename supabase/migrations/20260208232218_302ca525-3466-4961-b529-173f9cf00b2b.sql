
-- Create founding_crew_posts table
CREATE TABLE public.founding_crew_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.founding_crew_posts ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is founding member
CREATE OR REPLACE FUNCTION public.is_founding_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_founding_member = true
  )
$$;

-- SELECT: founding members and admins
CREATE POLICY "Founding members can view posts"
ON public.founding_crew_posts FOR SELECT
USING (
  public.is_founding_member(auth.uid()) OR public.is_admin_or_webmaster(auth.uid())
);

-- INSERT: founding members only (with correct user_id)
CREATE POLICY "Founding members can create posts"
ON public.founding_crew_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.is_founding_member(auth.uid()) OR public.is_admin_or_webmaster(auth.uid())
  )
);

-- DELETE: own posts or admin
CREATE POLICY "Users can delete own founding crew posts"
ON public.founding_crew_posts FOR DELETE
USING (
  auth.uid() = user_id OR public.is_admin_or_webmaster(auth.uid())
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.founding_crew_posts;
