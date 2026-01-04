-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, email)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Challenges are publicly readable
CREATE POLICY "Anyone can view challenges"
ON public.challenges
FOR SELECT
USING (true);

-- Registrations are publicly insertable (for registration)
CREATE POLICY "Anyone can register for challenges"
ON public.registrations
FOR INSERT
WITH CHECK (true);

-- Registrations leaderboard is public
CREATE POLICY "Anyone can view registrations"
ON public.registrations
FOR SELECT
USING (true);

-- Insert the 6 challenges
INSERT INTO public.challenges (slug, name, description, start_date, end_date) VALUES
('spring-challenge-2026', 'Spring Challenge 2026', 'Starte kraftvoll ins Frühjahr mit unserer intensiven Spring Challenge.', '2026-03-01', '2026-03-31'),
('murph-2026', 'Murph 2026', 'Die legendäre Murph Challenge: 1 Mile Run, 100 Pull-Ups, 200 Push-Ups, 300 Squats, 1 Mile Run.', '2026-05-25', '2026-05-25'),
('deadly-dozen', 'Deadly Dozen', '12 Übungen, 12 Wiederholungen, 12 Minuten. Bist du bereit für die Herausforderung?', '2026-06-01', '2026-06-30'),
('summer-challenge-2026', 'Summer Challenge 2026', 'Bleib den ganzen Sommer über fit mit unserer längsten Challenge des Jahres.', '2026-06-01', '2026-09-30'),
('kettlebell-swing-2026', 'Kettlebell Swing Challenge 2026', 'Wie viele Kettlebell Swings schaffst du in einem Monat? Zeig es uns!', '2026-07-01', '2026-07-31'),
('winter-challenge-2026', 'Winter Challenge 2026', 'Trotze der Kälte und halte dich fit während der Wintermonate.', '2026-10-01', '2026-12-31');

-- Enable realtime for registrations (for live leaderboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;