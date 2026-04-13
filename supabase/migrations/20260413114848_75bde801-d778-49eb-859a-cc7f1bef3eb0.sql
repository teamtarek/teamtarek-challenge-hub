
-- Add type and level system to challenges
ALTER TABLE challenges 
ADD COLUMN is_benchmark BOOLEAN DEFAULT false,
ADD COLUMN level_1_label TEXT,
ADD COLUMN level_2_label TEXT,
ADD COLUMN level_3_label TEXT,
ADD COLUMN level_4_label TEXT,
ADD COLUMN level_1_criteria TEXT,
ADD COLUMN level_2_criteria TEXT,
ADD COLUMN level_3_criteria TEXT,
ADD COLUMN level_4_criteria TEXT;

-- Update existing challenges to set is_benchmark correctly
UPDATE challenges SET is_benchmark = false 
WHERE category IN ('outdoor', 'gym', 'open');

UPDATE challenges SET is_benchmark = true 
WHERE category IN ('kettlebell', 'gym-benchmark', 'endurance', 'mixed', 'bodyweight');

-- Add registration status and level tracking
ALTER TABLE registrations
ADD COLUMN level_achieved INTEGER CHECK (level_achieved BETWEEN 1 AND 4),
ADD COLUMN registered_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN deadline_at TIMESTAMPTZ,
ADD COLUMN registration_status TEXT DEFAULT 'registered' 
  CHECK (registration_status IN (
    'registered', 'completed', 'fail', 'blocked'
  ));

-- Add benchmark cooldown tracking
CREATE TABLE benchmark_cooldowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  blocked_until TIMESTAMPTZ NOT NULL,
  reason TEXT DEFAULT 'no_result_submitted',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE benchmark_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cooldowns"
ON benchmark_cooldowns FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage cooldowns"
ON benchmark_cooldowns FOR ALL TO authenticated
USING (is_admin_or_webmaster(auth.uid()));
