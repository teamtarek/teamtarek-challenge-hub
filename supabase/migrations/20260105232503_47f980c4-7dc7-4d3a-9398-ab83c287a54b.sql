-- Drop the old constraint that only allows one registration per challenge+email
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_challenge_id_email_key;

-- Create a new unique constraint that allows multiple entries per year
CREATE UNIQUE INDEX registrations_challenge_email_year_key ON public.registrations (challenge_id, email, year);