-- Allow multiple results per benchmark per user (max 1 per calendar month).
-- Cooldown only blocks when user did NOT submit a result (existing logic via deadline check is fine).

-- Drop old cooldown-only trigger; replace with combined check.
DROP TRIGGER IF EXISTS trg_check_benchmark_cooldown ON public.registrations;

CREATE OR REPLACE FUNCTION public.check_benchmark_registration_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_benchmark boolean;
  _blocked_until timestamptz;
  _open_count int;
  _month_count int;
  _ref_date date;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_benchmark INTO _is_benchmark
  FROM public.challenges WHERE id = NEW.challenge_id;

  IF _is_benchmark IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- 1) Active cooldown blocks new registration
  SELECT blocked_until INTO _blocked_until
  FROM public.benchmark_cooldowns
  WHERE user_id = NEW.user_id
    AND challenge_id = NEW.challenge_id
    AND blocked_until > now();

  IF _blocked_until IS NOT NULL THEN
    RAISE EXCEPTION 'Du kannst diese Challenge erst wieder am % absolvieren.',
      to_char(_blocked_until, 'DD.MM.YYYY');
  END IF;

  -- 2) Only one OPEN ("registered") attempt at a time
  SELECT COUNT(*) INTO _open_count
  FROM public.registrations
  WHERE user_id = NEW.user_id
    AND challenge_id = NEW.challenge_id
    AND registration_status = 'registered';

  IF _open_count > 0 THEN
    RAISE EXCEPTION 'Du hast bereits eine offene Registrierung für diese Challenge. Reiche zuerst dein Ergebnis ein oder warte den Ablauf der Frist ab.';
  END IF;

  -- 3) Max 1 result per calendar month (based on completion_date, fallback registered_at/now)
  _ref_date := COALESCE(NEW.completion_date, (NEW.registered_at AT TIME ZONE 'UTC')::date, current_date);

  SELECT COUNT(*) INTO _month_count
  FROM public.registrations
  WHERE user_id = NEW.user_id
    AND challenge_id = NEW.challenge_id
    AND date_trunc('month', COALESCE(completion_date, (registered_at AT TIME ZONE 'UTC')::date)) = date_trunc('month', _ref_date);

  IF _month_count > 0 THEN
    RAISE EXCEPTION 'Du hast in diesem Monat bereits einen Versuch für diese Challenge eingetragen. Pro Monat ist nur ein Eintrag möglich.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_benchmark_registration_allowed
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_benchmark_registration_allowed();