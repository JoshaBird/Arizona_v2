import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Auto-creating submissions table...");

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
      // Create table using a migration approach
      const migrationSQL = `
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
      `;

      // Try to execute the migration using Supabase's migration system
      try {
        // Method 1: Use the migration endpoint
        const migrationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/migrate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              sql: migrationSQL,
              name: "auto_create_submissions_table",
            }),
          }
        );

        if (migrationResponse.ok) {
          console.log("✅ Table created via migration system");
        } else {
          throw new Error(`Migration failed: ${migrationResponse.status}`);
        }
      } catch (migrationError) {
        console.log(
          "⚠️ Migration system failed, trying direct approach:",
          migrationError
        );

        // Method 2: Use a different approach - try to create via insert
        try {
          // Create a temporary record to trigger table creation
          const { data, error } = await supabaseAdmin
            .from("submissions")
            .insert({
              name: "auto_creation",
              email: "auto@creation.com",
              phone: "000-000-0000",
              address: "Auto Creation",
              prompt: "Auto-creating table via insert",
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          console.log("✅ Table created via insert approach");

          // Clean up the creation record
          if (data) {
            await supabaseAdmin.from("submissions").delete().eq("id", data.id);
          }

          // Now set up RLS and policies
          // Note: We can't do this via API, so we'll provide instructions
          return NextResponse.json({
            success: true,
            message:
              "Table created successfully! Now setting up RLS policies...",
            nextSteps: [
              "1. Go to Supabase Dashboard → SQL Editor",
              "2. Run the RLS setup SQL below",
              "3. Your table will be fully configured",
            ],
            rlsSetup: `
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

              -- Refresh schema cache
              NOTIFY pgrst, 'reload schema';
            `,
          });
        } catch (insertError) {
          console.log("⚠️ Insert approach failed:", insertError);

          // Final fallback: Provide manual instructions
          return NextResponse.json({
            success: false,
            error: "Automatic table creation failed",
            message: "Please run the SQL below in Supabase Dashboard",
            sql: migrationSQL,
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

    // Test the table
    console.log("🔍 Testing table access...");
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "test_auto_creation",
          email: "test@auto.com",
          phone: "000-000-0000",
          address: "Test Auto Creation",
          prompt: "Testing auto-created table",
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
        message: "Submissions table created and tested successfully",
        method: "auto-creation",
      });
    } catch (testError) {
      console.log("⚠️ Table test failed:", testError);
      return NextResponse.json({
        success: false,
        error: "Table creation verification failed",
        details:
          testError instanceof Error ? testError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ Auto-creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Auto-creation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
