
-- Trigger function: auto-set deadline_at for benchmark registrations
CREATE OR REPLACE FUNCTION public.set_benchmark_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_benchmark boolean;
BEGIN
  -- Only set if deadline_at is not already provided
  IF NEW.deadline_at IS NULL THEN
    SELECT is_benchmark INTO _is_benchmark
    FROM public.challenges
    WHERE id = NEW.challenge_id;

    IF _is_benchmark = true THEN
      NEW.deadline_at := COALESCE(NEW.registered_at, now()) + INTERVAL '56 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on INSERT
CREATE TRIGGER trg_set_benchmark_deadline
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_benchmark_deadline();
