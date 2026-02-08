
-- Step 1: Add 'coach' to app_role enum and is_founding_member to profiles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false;
