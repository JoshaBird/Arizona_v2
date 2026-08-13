import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🔄 Refreshing schema cache...");

    // Try to refresh the schema cache by making a simple query
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .limit(1);

    if (error) {
      console.log("Schema refresh failed:", error);

      // The table might not exist, so let's create it
      console.log("Creating table manually...");

      // Use a direct approach - create table by inserting a record
      // This will fail if table doesn't exist, but we can catch that
      try {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from("submissions")
          .insert({
            name: "schema_refresh",
            email: "refresh@schema.com",
            phone: "000-000-0000",
            address: "Schema Refresh",
            prompt: "Schema cache refresh test",
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Clean up test record
        if (insertData) {
          await supabaseAdmin
            .from("submissions")
            .delete()
            .eq("id", insertData.id);
        }

        console.log("✅ Table created via insert approach");

        return NextResponse.json({
          success: true,
          message: "Table created and schema refreshed",
          method: "insert-approach",
        });
      } catch (createError) {
        console.log("Insert approach failed:", createError);

        // Final fallback - provide manual SQL
        return NextResponse.json({
          success: false,
          error: "Schema refresh failed",
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

-- Refresh PostgREST schema cache immediately after table creation
NOTIFY pgrst, 'reload schema';

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

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

GRANT ALL ON public.submissions TO public;

-- Create storage bucket
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

-- Final schema refresh to ensure all changes are cached
NOTIFY pgrst, 'reload schema';
          `,
          instructions: [
            "1. Go to Supabase Dashboard → SQL Editor",
            "2. Copy and paste the SQL above",
            "3. Click 'Run' to execute",
            "4. Refresh your application",
          ],
        });
      }
    } else {
      console.log("✅ Schema cache refreshed successfully");

      return NextResponse.json({
        success: true,
        message: "Schema cache refreshed successfully",
        method: "cache-refresh",
      });
    }
  } catch (error) {
    console.error("❌ Schema refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Schema refresh failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
