
-- Insert webmaster role for the user with matching email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'webmaster'::app_role
FROM auth.users
WHERE email = 'tobias.gunst@googlemail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update is_webmaster() to check user_roles instead of auth.users.email
CREATE OR REPLACE FUNCTION public.is_webmaster(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'webmaster'
  )
$function$;

-- Update get_user_member_type() to check user_roles for webmaster
CREATE OR REPLACE FUNCTION public.get_user_member_type(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_webmaster_role boolean;
  has_admin_role boolean;
  has_coach_role boolean;
  has_active_membership boolean;
  has_verified_result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'webmaster'
  ) INTO has_webmaster_role;
  IF has_webmaster_role THEN
    RETURN 'webmaster';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO has_admin_role;
  IF has_admin_role THEN
    RETURN 'admin';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'coach'
  ) INTO has_coach_role;
  IF has_coach_role THEN
    RETURN 'coach';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND status = 'active'
  ) INTO has_active_membership;
  IF has_active_membership THEN
    RETURN 'member';
  END IF;
  
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
  
  RETURN 'prospect';
END;
$function$;
