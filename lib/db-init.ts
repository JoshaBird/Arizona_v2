import { supabase } from "@/integrations/supabase/client";

export interface StorageInitResult {
  success: boolean;
  bucketsChecked: {
    userImages: boolean;
  };
  errors: string[];
  messages: string[];
}

/**
 * Checks if required storage resources exist and creates them if missing
 * No database tables needed - using localStorage for submissions
 */
export async function initializeStorage(): Promise<StorageInitResult> {
  const result: StorageInitResult = {
    success: true,
    bucketsChecked: {
      userImages: false,
    },
    errors: [],
    messages: [],
  };

  try {
    // Check if user-images bucket exists
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      result.errors.push(
        `Error checking storage buckets: ${bucketsError.message}`
      );
      result.success = false;
    } else {
      const userImagesBucket = buckets?.find((b) => b.name === "user-images");
      if (userImagesBucket) {
        result.bucketsChecked.userImages = true;
        result.messages.push("user-images bucket exists.");
      } else {
        result.messages.push(
          "user-images bucket does not exist. Needs creation."
        );
        result.errors.push("user_images_bucket_missing");
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(
      `Unexpected error during initialization: ${errorMessage}`
    );
    result.success = false;
  }

  // Overall success check
  result.success =
    result.errors.length === 0 || result.bucketsChecked.userImages;

  return result;
}

/**
 * Creates the submissions table with all required columns
 */
export const CREATE_SUBMISSIONS_TABLE_SQL = `
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

-- Create policy to allow public insert and update
CREATE POLICY IF NOT EXISTS "Allow public insert" ON public.submissions
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public update" ON public.submissions
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public select" ON public.submissions
FOR SELECT TO public
USING (true);
`;

/**
 * Creates the user-images storage bucket with policies
 */
export const CREATE_USER_IMAGES_BUCKET_SQL = `
-- Create storage bucket for uploaded images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to user-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete to user-images" ON storage.objects;

-- Create new policies for the bucket
CREATE POLICY "Allow public read access to user-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'user-images');

CREATE POLICY "Allow public upload to user-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'user-images');

CREATE POLICY "Allow public update to user-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'user-images');

CREATE POLICY "Allow public delete to user-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'user-images');
`;
