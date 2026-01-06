-- Add validation columns to registrations table
ALTER TABLE public.registrations 
ADD COLUMN validation_type text DEFAULT 'coach' CHECK (validation_type IN ('coach', 'video')),
ADD COLUMN video_url text,
ADD COLUMN is_verified boolean DEFAULT false;

-- Create index for faster filtering on verified status
CREATE INDEX idx_registrations_is_verified ON public.registrations(is_verified);

-- Add comment for documentation
COMMENT ON COLUMN public.registrations.validation_type IS 'Type of validation: coach (authorized by coach) or video (video proof)';
COMMENT ON COLUMN public.registrations.video_url IS 'URL to YouTube/Vimeo video for video validation';
COMMENT ON COLUMN public.registrations.is_verified IS 'Whether the result has been verified by an admin';