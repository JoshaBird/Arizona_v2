-- Migration: Create submissions table and user-images bucket
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  prompt TEXT,
  original_image_storage_url TEXT,
  result_image_storage_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow public insert" ON public.submissions;
DROP POLICY IF EXISTS "Allow public update" ON public.submissions;
DROP POLICY IF EXISTS "Allow public select" ON public.submissions;

CREATE POLICY "Allow public insert" ON public.submissions
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.submissions
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.submissions
FOR SELECT TO public
USING (true);

-- Grant permissions
GRANT ALL ON public.submissions TO public;

-- Create user-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "Allow public read access to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete to user-images" ON storage.objects;

CREATE POLICY "Allow public read access to user-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'user-images');

CREATE POLICY "Allow public upload to user-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'user-images');

CREATE POLICY "Allow public update to user-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'user-images');

CREATE POLICY "Allow public delete to user-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'user-images');
