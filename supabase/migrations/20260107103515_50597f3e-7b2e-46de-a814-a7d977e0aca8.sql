-- Allow webmaster to manage user_roles
CREATE POLICY "Webmaster can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_webmaster(auth.uid()));

CREATE POLICY "Webmaster can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (is_webmaster(auth.uid()));

CREATE POLICY "Webmaster can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_webmaster(auth.uid()));