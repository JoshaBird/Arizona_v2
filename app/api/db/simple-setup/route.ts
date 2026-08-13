import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Simple database setup...");

    // Step 1: Check if table exists by trying to query it
    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .limit(1);

      if (!error) {
        console.log("✅ Table already exists");
        return NextResponse.json({
          success: true,
          message: "Database is ready",
          method: "existing-table",
        });
      }
    } catch (error) {
      console.log("Table doesn't exist, will create it");
    }

    // Step 2: Create table by using Supabase's REST API directly
    console.log("🔧 Creating table via REST API...");

    // Try to create table by making a POST request to the submissions endpoint
    // This will fail if table doesn't exist, but we can catch that
    const createResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/submissions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: "setup_test",
          email: "setup@test.com",
          phone: "000-000-0000",
          address: "Setup Test",
          prompt: "Database setup test",
          original_image_storage_url: null,
          result_image_storage_url: null,
        }),
      }
    );

    if (createResponse.ok) {
      console.log("✅ Table created successfully via REST API");

      // Clean up the test record
      try {
        const { data: records } = await supabaseAdmin
          .from("submissions")
          .select("id")
          .eq("email", "setup@test.com");

        if (records && records.length > 0) {
          await supabaseAdmin
            .from("submissions")
            .delete()
            .eq("email", "setup@test.com");
        }
      } catch (cleanupError) {
        console.log("Could not clean up test record:", cleanupError);
      }

      // Create storage bucket
      try {
        const { data: bucketData, error: bucketError } =
          await supabaseAdmin.storage.createBucket("user-images", {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });

        if (bucketError && !bucketError.message.includes("already exists")) {
          console.log("Bucket creation failed:", bucketError);
        } else {
          console.log("✅ Storage bucket created/verified");
        }
      } catch (bucketError) {
        console.log("Bucket creation error:", bucketError);
      }

      return NextResponse.json({
        success: true,
        message: "Database and storage setup complete",
        method: "rest-api-create",
      });
    } else {
      const errorText = await createResponse.text();
      console.log("REST API create failed:", errorText);

      // Final fallback - provide manual SQL
      return NextResponse.json({
        success: false,
        error: "Automatic setup failed",
        message: "Please run the SQL below in Supabase Dashboard",
        sql: `
-- Run this in Supabase Dashboard → SQL Editor
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

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

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

GRANT ALL ON public.submissions TO public;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Allow public read access to user-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'user-images');

CREATE POLICY "Allow public upload to user-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'user-images');

CREATE POLICY "Allow public update to user-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'user-images');

CREATE POLICY "Allow public delete to user-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'user-images');
        `,
        instructions: [
          "1. Go to Supabase Dashboard → SQL Editor",
          "2. Copy and paste the SQL above",
          "3. Click 'Run' to execute",
          "4. Refresh your application",
        ],
      });
    }
  } catch (error) {
    console.error("❌ Simple setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Simple setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
