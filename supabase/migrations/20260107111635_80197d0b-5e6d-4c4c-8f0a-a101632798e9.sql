-- Add is_private column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_private boolean NOT NULL DEFAULT false;