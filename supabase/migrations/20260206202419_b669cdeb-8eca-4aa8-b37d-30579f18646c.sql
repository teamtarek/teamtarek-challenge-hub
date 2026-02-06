ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_category_check CHECK (
  category IN ('allgemein', 'training-draussen', 'challenges-ergebnisse', 'technik-fragen', 'motivation-mindset', 'off-topic', 'training-logs')
);