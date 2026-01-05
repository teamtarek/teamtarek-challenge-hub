-- Add year and murph_version columns to registrations
ALTER TABLE public.registrations 
ADD COLUMN year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN murph_version text DEFAULT 'Standard';

-- Rename score to completion_time (in seconds)
COMMENT ON COLUMN public.registrations.score IS 'Completion time in seconds';