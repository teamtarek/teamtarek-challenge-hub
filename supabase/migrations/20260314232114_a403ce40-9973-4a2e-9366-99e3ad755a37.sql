
-- Make training-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'training-files';

-- Drop any public SELECT policy on training-files objects
DROP POLICY IF EXISTS "Anyone can view training files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view training files" ON storage.objects;
DROP POLICY IF EXISTS "training-files public select" ON storage.objects;

-- Ensure authenticated users can read training files
CREATE POLICY "Authenticated users can read training files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'training-files');

-- Ensure admins/coaches can upload training files (keep existing or recreate)
DROP POLICY IF EXISTS "Admins can upload training files" ON storage.objects;
CREATE POLICY "Admins and coaches can upload training files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-files'
  AND (
    public.is_admin_or_webmaster(auth.uid())
    OR public.has_role(auth.uid(), 'coach'::public.app_role)
  )
);

-- Ensure admins/coaches can delete training files
DROP POLICY IF EXISTS "Admins can delete training files" ON storage.objects;
CREATE POLICY "Admins and coaches can delete training files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-files'
  AND (
    public.is_admin_or_webmaster(auth.uid())
    OR public.has_role(auth.uid(), 'coach'::public.app_role)
  )
);
