import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("🚀 Force initializing database...");

    // Try the edge function approach first
    try {
      const edgeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/init-db`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (edgeResponse.ok) {
        const result = await edgeResponse.json();
        console.log("✅ Database initialized via edge function");
        return NextResponse.json({
          success: true,
          message: "Database initialized successfully via edge function",
          method: "edge-function",
          result,
        });
      }
    } catch (edgeError) {
      console.log("Edge function failed:", edgeError);
    }

    // Fallback: Manual SQL instructions
    const manualSQL = `
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Drop table if exists (for clean start)
DROP TABLE IF EXISTS public.submissions CASCADE;

-- Create submissions table
CREATE TABLE public.submissions (
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

-- Create user-images bucket
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
`;

    return NextResponse.json({
      success: false,
      message: "Automatic initialization failed. Please run the SQL manually.",
      method: "manual",
      sql: manualSQL,
      instructions: [
        "1. Go to Supabase Dashboard → SQL Editor",
        "2. Copy and paste the SQL above",
        "3. Click 'Run' to execute",
        "4. Refresh your application",
      ],
    });
  } catch (error) {
    console.error("❌ Force initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Force initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
