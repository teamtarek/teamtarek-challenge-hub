-- Add new profile fields
ALTER TABLE public.profiles
ADD COLUMN age integer,
ADD COLUMN favorite_exercise text,
ADD COLUMN hated_exercise text;