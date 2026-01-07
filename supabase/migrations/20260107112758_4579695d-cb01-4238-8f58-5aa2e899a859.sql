-- Function to link registrations to user account when user signs up
CREATE OR REPLACE FUNCTION public.link_registrations_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all registrations with matching email to link to the new user
  UPDATE public.registrations
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger: When a new user is created, link existing registrations
CREATE TRIGGER on_auth_user_created_link_registrations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_registrations_to_user();

-- Function to auto-link registration to user if email matches
CREATE OR REPLACE FUNCTION public.auto_link_registration_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_user_id uuid;
BEGIN
  -- Only process if user_id is not already set
  IF NEW.user_id IS NULL THEN
    -- Find user with matching email
    SELECT id INTO matching_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- If found, set the user_id
    IF matching_user_id IS NOT NULL THEN
      NEW.user_id := matching_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: When a new registration is created, auto-link to user if email matches
CREATE TRIGGER on_registration_insert_link_user
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_registration_to_user();