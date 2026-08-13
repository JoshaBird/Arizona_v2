-- Create image_jobs table for tracking async image processing
CREATE TABLE IF NOT EXISTS image_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  image_name TEXT,
  image_size INTEGER,
  result_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON image_jobs(status);
CREATE INDEX IF NOT EXISTS idx_image_jobs_created_at ON image_jobs(created_at);

-- Add RLS policies
ALTER TABLE image_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all jobs
CREATE POLICY "Service role can manage all image jobs" ON image_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own jobs (if we add user_id later)
-- CREATE POLICY "Users can read their own jobs" ON image_jobs
--   FOR SELECT USING (auth.uid() = user_id);
