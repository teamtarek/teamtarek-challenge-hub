-- Create trigger function to use invite token after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_with_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_token_value text;
  token_record RECORD;
BEGIN
  -- Get invite token from user metadata
  invite_token_value := new.raw_user_meta_data ->> 'invite_token';
  
  -- Create profile (existing behavior)
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- If invite token exists, use it
  IF invite_token_value IS NOT NULL AND invite_token_value != '' THEN
    -- Find and use the token
    SELECT * INTO token_record
    FROM public.invite_tokens
    WHERE token = invite_token_value
      AND used_by_user_id IS NULL
      AND (expires_at IS NULL OR expires_at > now());
    
    IF FOUND THEN
      -- Mark token as used
      UPDATE public.invite_tokens
      SET used_by_user_id = new.id,
          used_at = now()
      WHERE id = token_record.id;
      
      -- Create membership
      INSERT INTO public.memberships (user_id, source, status, last_activity_at)
      VALUES (new.id, 'token', 'active', now())
      ON CONFLICT (user_id) DO UPDATE
      SET source = 'token',
          status = 'active',
          last_activity_at = now();
    END IF;
  END IF;
  
  RETURN new;
END;
$$;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_token();