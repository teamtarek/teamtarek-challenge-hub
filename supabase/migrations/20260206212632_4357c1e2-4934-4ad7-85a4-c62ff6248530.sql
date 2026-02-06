
CREATE OR REPLACE FUNCTION public.get_user_member_type(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
  has_admin_role boolean;
  has_verified_result boolean;
  has_registration boolean;
BEGIN
  -- Check if webmaster (by email)
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  IF user_email = 'tobias.gunst@googlemail.com' THEN
    RETURN 'webmaster';
  END IF;
  
  -- Check if admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO has_admin_role;
  IF has_admin_role THEN
    RETURN 'admin';
  END IF;
  
  -- Check if member (has verified result)
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE user_id = _user_id 
      AND is_verified = true
      AND (
        (score IS NOT NULL AND score > 0)
        OR (total_reps IS NOT NULL AND total_reps > 0)
        OR (kettlebell_weight_kg IS NOT NULL AND kettlebell_weight_kg > 0)
        OR (total_time_seconds IS NOT NULL AND total_time_seconds > 0)
      )
  ) INTO has_verified_result;
  IF has_verified_result THEN
    RETURN 'member';
  END IF;
  
  -- Check if prospect (has registration but no verified result)
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE user_id = _user_id
  ) INTO has_registration;
  IF has_registration THEN
    RETURN 'prospect';
  END IF;
  
  -- Default to prospect if user exists but no registrations
  RETURN 'prospect';
END;
$function$;
