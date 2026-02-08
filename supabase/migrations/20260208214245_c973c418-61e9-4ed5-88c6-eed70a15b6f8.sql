
-- Training content (programs and single workouts)
CREATE TABLE public.training_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'workout' CHECK (content_type IN ('program', 'workout')),
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  goal TEXT,
  duration TEXT,
  equipment TEXT,
  pdf_url TEXT,
  video_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('published', 'draft')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Program sessions (ordered list within a program)
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.training_content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User progress on sessions
CREATE TABLE public.user_session_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_progress ENABLE ROW LEVEL SECURITY;

-- training_content policies
CREATE POLICY "Anyone authenticated can view published content"
ON public.training_content FOR SELECT
USING (auth.uid() IS NOT NULL AND visibility = 'published');

CREATE POLICY "Admins can view all content"
ON public.training_content FOR SELECT
USING (is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can insert content"
ON public.training_content FOR INSERT
WITH CHECK (is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can update content"
ON public.training_content FOR UPDATE
USING (is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can delete content"
ON public.training_content FOR DELETE
USING (is_admin_or_webmaster(auth.uid()));

-- training_sessions policies
CREATE POLICY "Anyone authenticated can view sessions"
ON public.training_sessions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sessions"
ON public.training_sessions FOR ALL
USING (is_admin_or_webmaster(auth.uid()));

-- user_session_progress policies
CREATE POLICY "Users can view own progress"
ON public.user_session_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_session_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON public.user_session_progress FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_training_content_updated_at
BEFORE UPDATE ON public.training_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for training PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('training-files', 'training-files', true);

CREATE POLICY "Anyone can view training files"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-files');

CREATE POLICY "Admins can upload training files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-files' AND is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can update training files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-files' AND is_admin_or_webmaster(auth.uid()));

CREATE POLICY "Admins can delete training files"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-files' AND is_admin_or_webmaster(auth.uid()));
