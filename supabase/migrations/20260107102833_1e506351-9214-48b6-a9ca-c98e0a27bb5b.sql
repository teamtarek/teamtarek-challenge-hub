-- Add age_class column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_class text;

-- Create function to check if user is webmaster (by email)
CREATE OR REPLACE FUNCTION public.is_webmaster(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'tobias.gunst@googlemail.com'
  )
$$;

-- Create function to check if user is admin or webmaster
CREATE OR REPLACE FUNCTION public.is_admin_or_webmaster(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  ) OR public.is_webmaster(_user_id)
$$;

-- Create function to get user member type (webmaster, admin, member, prospect)
CREATE OR REPLACE FUNCTION public.get_user_member_type(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update RLS policies for posts - Admins can edit/delete any posts
DROP POLICY IF EXISTS "Admins can update any posts" ON public.posts;
CREATE POLICY "Admins can update any posts" 
ON public.posts 
FOR UPDATE 
USING (public.is_admin_or_webmaster(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any posts" ON public.posts;
CREATE POLICY "Admins can delete any posts" 
ON public.posts 
FOR DELETE 
USING (public.is_admin_or_webmaster(auth.uid()));

-- Add policy for webmaster to insert challenges
DROP POLICY IF EXISTS "Webmaster can insert challenges" ON public.challenges;
CREATE POLICY "Webmaster can insert challenges" 
ON public.challenges 
FOR INSERT 
WITH CHECK (public.is_webmaster(auth.uid()));

-- Add policy for webmaster to update challenges
DROP POLICY IF EXISTS "Webmaster can update challenges" ON public.challenges;
CREATE POLICY "Webmaster can update challenges" 
ON public.challenges 
FOR UPDATE 
USING (public.is_webmaster(auth.uid()));

-- Add policy for webmaster to delete challenges
DROP POLICY IF EXISTS "Webmaster can delete challenges" ON public.challenges;
CREATE POLICY "Webmaster can delete challenges" 
ON public.challenges 
FOR DELETE 
USING (public.is_webmaster(auth.uid()));

-- Add policy for admins to delete unverified registrations
DROP POLICY IF EXISTS "Admins can delete unverified registrations" ON public.registrations;
CREATE POLICY "Admins can delete unverified registrations" 
ON public.registrations 
FOR DELETE 
USING (
  public.is_admin_or_webmaster(auth.uid()) 
  AND is_verified = false
);