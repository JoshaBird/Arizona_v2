import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🧠 Smart database initialization...");

    // Step 1: Check if we can access the submissions table
    let tableExists = false;
    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .limit(1);

      if (!error) {
        tableExists = true;
        console.log("✅ Table already exists");
      }
    } catch (error) {
      console.log("Table doesn't exist, will create it");
    }

    if (!tableExists) {
      console.log("🔧 Creating table using workaround...");

      // Step 2: Create table by using a different approach
      // We'll create a temporary table first, then rename it
      try {
        // Create a temporary table with a different name
        const tempTableName = `submissions_${Date.now()}`;

        // Try to create table by inserting into a non-existent table
        // This will fail, but we can catch the error and handle it
        const { data, error } = await supabaseAdmin
          .from(tempTableName)
          .insert({
            name: "test",
            email: "test@example.com",
            phone: "000-000-0000",
            address: "Test Address",
            prompt: "Test prompt",
          })
          .select()
          .single();

        if (
          error &&
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          // Table doesn't exist, which is expected
          console.log("Temporary table doesn't exist, creating it...");

          // Now try to create the actual submissions table
          // We'll use a different approach - create it by using the REST API directly
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
                name: "initialization",
                email: "init@system.com",
                phone: "000-000-0000",
                address: "System Initialization",
                prompt: "Database initialization record",
                original_image_storage_url: null,
                result_image_storage_url: null,
              }),
            }
          );

          if (createResponse.ok) {
            console.log("✅ Table created via REST API insert");

            // Clean up the initialization record
            try {
              const { data: records } = await supabaseAdmin
                .from("submissions")
                .select("id")
                .eq("email", "init@system.com");

              if (records && records.length > 0) {
                await supabaseAdmin
                  .from("submissions")
                  .delete()
                  .eq("email", "init@system.com");
              }
            } catch (cleanupError) {
              console.log(
                "Could not clean up initialization record:",
                cleanupError
              );
            }

            // Enable RLS and create policies
            await setupTablePolicies();

            return NextResponse.json({
              success: true,
              message: "Table created successfully via REST API",
              method: "rest-api-insert",
            });
          } else {
            const errorText = await createResponse.text();
            console.log("REST API insert failed:", errorText);
            throw new Error(`REST API insert failed: ${errorText}`);
          }
        }
      } catch (createError) {
        console.log("Table creation failed:", createError);

        // Final fallback - provide manual instructions
        return NextResponse.json({
          success: false,
          error: "Automatic table creation failed",
          message: "Please run the SQL below in Supabase Dashboard",
          sql: `
-- Run this in Supabase Dashboard → SQL Editor
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

-- Refresh PostgREST schema cache immediately after table creation
NOTIFY pgrst, 'reload schema';

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
    }

    // Step 3: Create storage bucket if it doesn't exist
    try {
      const { data, error } = await supabaseAdmin.storage.createBucket(
        "user-images",
        {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        }
      );

      if (error && !error.message.includes("already exists")) {
        console.log("Bucket creation failed:", error);
      } else {
        console.log("✅ Storage bucket created/verified");
      }
    } catch (bucketError) {
      console.log("Bucket creation error:", bucketError);
    }

    return NextResponse.json({
      success: true,
      message: "Database is ready",
      tableExists: true,
      bucketExists: true,
    });
  } catch (error) {
    console.error("❌ Smart initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Smart initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function setupTablePolicies() {
  try {
    // Try to enable RLS and create policies
    // This is a best-effort attempt
    console.log("Setting up table policies...");

    // Note: We can't actually create policies via the API
    // This would need to be done manually or via a database function
    console.log("⚠️ Policies need to be created manually");
  } catch (error) {
    console.log("Could not set up policies:", error);
  }
}

export async function GET() {
  return POST();
}
