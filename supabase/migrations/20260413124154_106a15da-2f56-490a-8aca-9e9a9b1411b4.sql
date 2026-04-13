
CREATE OR REPLACE FUNCTION public.check_benchmark_cooldown_before_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_benchmark boolean;
  _blocked_until timestamptz;
BEGIN
  -- Only check for logged-in users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this is a benchmark challenge
  SELECT is_benchmark INTO _is_benchmark
  FROM public.challenges
  WHERE id = NEW.challenge_id;

  IF _is_benchmark IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Check for active cooldown
  SELECT blocked_until INTO _blocked_until
  FROM public.benchmark_cooldowns
  WHERE user_id = NEW.user_id
    AND challenge_id = NEW.challenge_id
    AND blocked_until > now();

  IF _blocked_until IS NOT NULL THEN
    RAISE EXCEPTION 'Du kannst diese Challenge erst wieder am % absolvieren.',
      to_char(_blocked_until, 'DD.MM.YYYY');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_benchmark_cooldown
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_benchmark_cooldown_before_register();
