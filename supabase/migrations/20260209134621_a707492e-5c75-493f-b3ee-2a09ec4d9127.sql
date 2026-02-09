
-- Table to store temporary signup authorizations from Stripe payments
CREATE TABLE public.signup_authorizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  used boolean NOT NULL DEFAULT false,
  used_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

-- Index for quick lookups
CREATE INDEX idx_signup_authorizations_email ON public.signup_authorizations(email);

-- RLS: only service role should access this table
ALTER TABLE public.signup_authorizations ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role (edge functions) can access
