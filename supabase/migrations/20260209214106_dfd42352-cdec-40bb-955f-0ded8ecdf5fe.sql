
-- Atomic function to assign founding member status if under 20 exist
-- Uses advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION public.try_assign_founding_member(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  was_assigned boolean := false;
BEGIN
  -- Advisory lock to serialize founding member assignment
  PERFORM pg_advisory_xact_lock(hashtext('founding_member_assignment'));
  
  SELECT count(*) INTO current_count
  FROM profiles
  WHERE is_founding_member = true;
  
  IF current_count < 20 THEN
    UPDATE profiles
    SET is_founding_member = true
    WHERE user_id = _user_id;
    
    was_assigned := true;
  END IF;
  
  RETURN was_assigned;
END;
$$;
