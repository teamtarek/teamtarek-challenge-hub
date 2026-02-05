-- Create invite_tokens table
CREATE TABLE public.invite_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL CHECK (created_by IN ('admin', 'stripe')),
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memberships table
CREATE TABLE public.memberships (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('token', 'stripe')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due')),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for invite_tokens
CREATE POLICY "Admins can manage invite tokens"
ON public.invite_tokens
FOR ALL
USING (is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Anyone can check token validity"
ON public.invite_tokens
FOR SELECT
USING (true);

-- RLS policies for memberships
CREATE POLICY "Users can view their own membership"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all memberships"
ON public.memberships
FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));

CREATE POLICY "System can insert memberships"
ON public.memberships
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update memberships"
ON public.memberships
FOR UPDATE
USING (true);

-- Function to update last_activity_at
CREATE OR REPLACE FUNCTION public.update_membership_activity(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memberships
  SET last_activity_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Function to check membership status
CREATE OR REPLACE FUNCTION public.get_membership_status(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.memberships WHERE user_id = _user_id;
$$;

-- Function to validate and use invite token
CREATE OR REPLACE FUNCTION public.use_invite_token(_token TEXT, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Find valid unused token
  SELECT * INTO token_record
  FROM public.invite_tokens
  WHERE token = _token
    AND used_by_user_id IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark token as used
  UPDATE public.invite_tokens
  SET used_by_user_id = _user_id,
      used_at = now()
  WHERE id = token_record.id;
  
  -- Create membership
  INSERT INTO public.memberships (user_id, source, status, last_activity_at)
  VALUES (_user_id, 'token', 'active', now())
  ON CONFLICT (user_id) DO UPDATE
  SET source = 'token',
      status = 'active',
      last_activity_at = now();
  
  RETURN TRUE;
END;
$$;

-- Function to deactivate inactive token memberships (for daily job)
CREATE OR REPLACE FUNCTION public.deactivate_inactive_memberships()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.memberships
  SET status = 'inactive'
  WHERE source = 'token'
    AND status = 'active'
    AND last_activity_at < now() - INTERVAL '6 months';
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Create index for performance
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_memberships_last_activity ON public.memberships(last_activity_at);