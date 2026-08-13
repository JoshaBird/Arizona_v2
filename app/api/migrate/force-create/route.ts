import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Force-creating submissions table...");

    // Check if table already exists
    let tableExists = false;
    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .limit(1);

      if (!error) {
        console.log("✅ Submissions table already exists");
        tableExists = true;
      }
    } catch (error) {
      console.log("📝 Table doesn't exist, creating it...");
    }

    if (!tableExists) {
      console.log("🔧 Creating table using REST API approach...");

      // Method 1: Use Supabase's REST API to create table by inserting
      // This is the most reliable method for auto-creation
      try {
        // Create a minimal record to trigger table creation
        const { data, error } = await supabaseAdmin
          .from("submissions")
          .insert({
            name: "initial_setup",
            email: "setup@system.com",
            phone: "000-000-0000",
            address: "System Setup",
            prompt: "Initial table creation",
            original_image_storage_url: null,
            result_image_storage_url: null,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log("✅ Table created successfully via REST API insert");

        // Clean up the setup record
        if (data) {
          await supabaseAdmin.from("submissions").delete().eq("id", data.id);
        }

        // Wait for schema cache to refresh
        console.log("⏳ Waiting for schema cache to refresh...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify table was created and accessible
        const { error: verifyError } = await supabaseAdmin
          .from("submissions")
          .select("id")
          .limit(1);

        if (verifyError) {
          throw new Error(`Table verification failed: ${verifyError.message}`);
        }

        console.log("✅ Table creation verified");

        return NextResponse.json({
          success: true,
          message: "Submissions table created successfully via REST API",
          method: "rest-api-insert",
          nextSteps: [
            "Table created automatically",
            "RLS policies need to be set up manually",
            "Run the RLS setup SQL below if needed",
          ],
          rlsSetup: `
-- Enable RLS (if not already enabled)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

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

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
          `,
        });
      } catch (insertError: any) {
        console.log("⚠️ REST API insert failed:", insertError);

        // Method 2: Try using a different table name approach
        try {
          console.log("🔧 Trying alternative table creation method...");

          // Try to create a temporary table first
          const tempTableName = `submissions_temp_${Date.now()}`;

          const { data: tempData, error: tempError } = await supabaseAdmin
            .from(tempTableName)
            .insert({
              name: "temp_creation",
              email: "temp@creation.com",
              phone: "000-000-0000",
              address: "Temporary Creation",
              prompt: "Temporary table creation",
            })
            .select()
            .single();

          if (tempError) {
            throw tempError;
          }

          console.log("✅ Temporary table created, now creating main table");

          // Clean up temp table
          if (tempData) {
            await supabaseAdmin
              .from(tempTableName)
              .delete()
              .eq("id", tempData.id);
          }

          // Now try the main table again
          const { data: mainData, error: mainError } = await supabaseAdmin
            .from("submissions")
            .insert({
              name: "main_creation",
              email: "main@creation.com",
              phone: "000-000-0000",
              address: "Main Table Creation",
              prompt: "Main table creation",
            })
            .select()
            .single();

          if (mainError) {
            throw mainError;
          }

          console.log("✅ Main table created successfully");

          // Clean up main creation record
          if (mainData) {
            await supabaseAdmin
              .from("submissions")
              .delete()
              .eq("id", mainData.id);
          }

          return NextResponse.json({
            success: true,
            message:
              "Submissions table created successfully via alternative method",
            method: "alternative-creation",
          });
        } catch (altError) {
          console.log("⚠️ Alternative method failed:", altError);

          // Method 3: Use Supabase's built-in table creation via API
          try {
            console.log("🔧 Trying Supabase API table creation...");

            // Use the Supabase REST API to create table structure
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
                  name: "api_creation",
                  email: "api@creation.com",
                  phone: "000-000-0000",
                  address: "API Creation",
                  prompt: "API table creation",
                  original_image_storage_url: null,
                  result_image_storage_url: null,
                }),
              }
            );

            if (createResponse.ok) {
              console.log("✅ Table created via direct API call");

              // Wait for schema cache
              await new Promise((resolve) => setTimeout(resolve, 2000));

              return NextResponse.json({
                success: true,
                message:
                  "Submissions table created successfully via direct API",
                method: "direct-api-call",
              });
            } else {
              const errorText = await createResponse.text();
              throw new Error(`API creation failed: ${errorText}`);
            }
          } catch (apiError) {
            console.log("⚠️ API creation failed:", apiError);

            // Final fallback: Provide manual instructions
            return NextResponse.json({
              success: false,
              error: "All automatic creation methods failed",
              message: "Please run the SQL below in Supabase Dashboard",
              sql: `
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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

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

-- Final schema refresh
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
      }
    }

    // Test the table if it exists
    console.log("🔍 Testing table access...");
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "test_force_creation",
          email: "test@force.com",
          phone: "000-000-0000",
          address: "Test Force Creation",
          prompt: "Testing force-created table",
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

      console.log("✅ Table test successful");

      return NextResponse.json({
        success: true,
        message: "Submissions table is ready and tested",
        method: "force-creation",
      });
    } catch (testError) {
      console.log("⚠️ Table test failed:", testError);
      return NextResponse.json({
        success: false,
        error: "Table test failed",
        details:
          testError instanceof Error ? testError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Force creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Force creation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
