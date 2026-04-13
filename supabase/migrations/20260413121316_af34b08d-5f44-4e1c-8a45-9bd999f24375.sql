
-- Function to check and enforce benchmark deadlines for a user
CREATE OR REPLACE FUNCTION public.check_benchmark_deadlines(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT r.id, r.challenge_id
    FROM public.registrations r
    JOIN public.challenges c ON c.id = r.challenge_id
    WHERE r.user_id = _user_id
      AND c.is_benchmark = true
      AND r.registration_status = 'registered'
      AND r.deadline_at IS NOT NULL
      AND r.deadline_at < now()
  LOOP
    -- Set registration to fail
    UPDATE public.registrations
    SET registration_status = 'fail'
    WHERE id = rec.id;

    -- Create cooldown (ignore if already exists)
    INSERT INTO public.benchmark_cooldowns (user_id, challenge_id, blocked_until, reason)
    VALUES (_user_id, rec.challenge_id, now() + INTERVAL '90 days', 'deadline_expired')
    ON CONFLICT (user_id, challenge_id) DO UPDATE
    SET blocked_until = GREATEST(benchmark_cooldowns.blocked_until, now() + INTERVAL '90 days'),
        reason = 'deadline_expired';
  END LOOP;
END;
$$;
