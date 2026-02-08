
-- Track starter journey completion per user
CREATE TABLE public.user_starter_journey (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_starter_journey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own starter journey"
  ON public.user_starter_journey FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own starter journey"
  ON public.user_starter_journey FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own starter journey"
  ON public.user_starter_journey FOR UPDATE
  USING (auth.uid() = user_id);
