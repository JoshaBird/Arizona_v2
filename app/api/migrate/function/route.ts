import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Creating database via SQL function...");

    // Step 1: Create a SQL function that creates the table
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION setup_database()
      RETURNS void AS $$
      BEGIN
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

        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow public insert" ON public.submissions;
        DROP POLICY IF EXISTS "Allow public update" ON public.submissions;
        DROP POLICY IF EXISTS "Allow public select" ON public.submissions;

        -- Create policies
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

      END;
      $$ LANGUAGE plpgsql;
    `;

    // Step 2: Try to create the function using different approaches
    const approaches = [
      {
        name: "Direct SQL execution",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        body: { sql: createFunctionSQL },
      },
      {
        name: "Query endpoint",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`,
        body: { query: createFunctionSQL },
      },
      {
        name: "SQL endpoint",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`,
        body: { sql: createFunctionSQL },
      },
    ];

    let functionCreated = false;

    for (const approach of approaches) {
      try {
        console.log(`Creating function using ${approach.name}...`);

        const response = await fetch(approach.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(approach.body),
        });

        if (response.ok) {
          console.log(`✅ Function created using ${approach.name}`);
          functionCreated = true;
          break;
        } else {
          const errorText = await response.text();
          console.log(`${approach.name} failed:`, errorText);
        }
      } catch (error) {
        console.log(`${approach.name} error:`, error);
      }
    }

    if (!functionCreated) {
      // Final fallback - provide manual instructions
      return NextResponse.json({
        success: false,
        error: "Function creation failed",
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

INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

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

    // Step 3: Call the function to create the table
    try {
      console.log("Calling setup_database function...");
      const { data, error } = await supabaseAdmin.rpc("setup_database");

      if (error) {
        throw error;
      }

      console.log("✅ Database setup function executed successfully");

      // Step 4: Test the setup
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "function_test",
          email: "test@function.com",
          phone: "000-000-0000",
          address: "Function Test",
          prompt: "Testing function setup",
        })
        .select()
        .single();

      if (testError) {
        throw testError;
      }

      // Clean up test record
      if (testData) {
        await supabaseAdmin.from("submissions").delete().eq("id", testData.id);
      }

      console.log("✅ Function setup test successful");

      return NextResponse.json({
        success: true,
        message: "Database setup completed successfully via SQL function",
        method: "sql-function",
      });
    } catch (functionError) {
      console.log("Function execution failed:", functionError);

      // Provide manual instructions as fallback
      return NextResponse.json({
        success: false,
        error: "Function execution failed",
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

INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

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
    console.error("❌ Function migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Function migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
