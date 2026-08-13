import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  initializeStorage,
  CREATE_SUBMISSIONS_TABLE_SQL,
  CREATE_USER_IMAGES_BUCKET_SQL,
} from "@/lib/db-init";

// Use service role key for admin operations when available
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET() {
  try {
    console.log("🔍 Checking database initialization status...");

    // Check what exists
    const checkResult = await initializeStorage();
    console.log("Check result:", checkResult);

    // If everything exists, return success
    if (checkResult.success && checkResult.bucketsChecked.userImages) {
      return NextResponse.json({
        success: true,
        message: "Database is already initialized",
        details: checkResult,
      });
    }

    // Check if we have service role key for automatic setup
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!hasServiceRoleKey) {
      return NextResponse.json({
        success: false,
        message: "Database setup required - service role key not configured",
        details: checkResult,
        setupInstructions: getSetupInstructions(checkResult),
      });
    }

    // Otherwise, try to create missing resources automatically
    console.log("⚙️ Creating missing database resources...");

    const creationResults = {
      submissionsTable: false,
      userImagesBucket: false,
      errors: [] as string[],
    };

    // Create submissions table if missing (skip for now since we're using localStorage)
    if (false) {
      try {
        console.log("Attempting to create submissions table...");

        // Try to create table by attempting an insert (which will create the table if it doesn't exist)
        // This is a workaround since we can't execute raw SQL via the API
        const { data, error } = await supabaseAdmin
          .from("submissions")
          .insert({
            name: null,
            email: null,
            phone: null,
            address: null,
            prompt: null,
            original_image_storage_url: null,
            result_image_storage_url: null,
          })
          .select()
          .single();

        if (
          error &&
          (error as any).message &&
          (error as any).message.includes("relation") &&
          (error as any).message.includes("does not exist")
        ) {
          // Table doesn't exist - try to create it using a different approach
          console.log("Table doesn't exist, attempting to create it...");

          // Try to create table using direct SQL execution
          const createTableSQL = `
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
          `;

          // Try multiple endpoints for SQL execution
          const endpoints = [
            "/rest/v1/rpc/sql",
            "/rest/v1/rpc/query",
            "/rest/v1/rpc/exec_sql",
          ];

          let tableCreated = false;

          for (const endpoint of endpoints) {
            try {
              const sqlResponse = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}${endpoint}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    query: createTableSQL,
                    sql: createTableSQL,
                  }),
                }
              );

              if (sqlResponse.ok) {
                tableCreated = true;
                console.log(`✅ Table created via ${endpoint}`);
                break;
              }
            } catch (endpointError) {
              console.log(
                `Failed to create table via ${endpoint}:`,
                endpointError
              );
            }
          }

          if (!tableCreated) {
            throw new Error(
              "Could not create table via any API endpoint. Please run the SQL migration manually."
            );
          }

          // Try the insert again after creating the table
          const { data: retryData, error: retryError } = await supabaseAdmin
            .from("submissions")
            .insert({
              name: "init_test",
              email: "test@init.com",
              phone: "000-000-0000",
              address: "Initialization Test",
              prompt: "Table creation test",
            })
            .select()
            .single();

          if (retryError) {
            throw retryError;
          }

          // Clean up test record
          if (retryData) {
            await supabaseAdmin
              .from("submissions")
              .delete()
              .eq("id", retryData.id);
          }

          console.log("✅ Table created and verified successfully");
        } else if (error) {
          throw error;
        }

        // Table exists, clean up the test record
        if (data) {
          await supabaseAdmin.from("submissions").delete().eq("id", data.id);
        }

        creationResults.submissionsTable = true;
        console.log("✅ Submissions table verified/created successfully");
      } catch (error) {
        const msg = `Failed to create submissions table: ${String(error)}`;
        console.error("❌", msg);
        creationResults.errors.push(msg);
      }
    } else {
      creationResults.submissionsTable = true;
    }

    // Create user-images bucket if missing
    if (!checkResult.bucketsChecked.userImages) {
      try {
        const { data, error } = await supabaseAdmin.storage.createBucket(
          "user-images",
          {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          }
        );

        if (error && !error.message.includes("already exists")) {
          throw error;
        }

        // Set up bucket policies using SQL
        await supabaseAdmin.rpc("exec_sql", {
          sql: CREATE_USER_IMAGES_BUCKET_SQL,
        });

        creationResults.userImagesBucket = true;
        console.log("✅ user-images bucket created successfully");
      } catch (error) {
        const msg = `Failed to create user-images bucket: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error("❌", msg);
        creationResults.errors.push(msg);
      }
    } else {
      creationResults.userImagesBucket = true;
    }

    // Final check
    const finalCheck = await initializeStorage();

    return NextResponse.json({
      success: finalCheck.success,
      message: finalCheck.success
        ? "Database initialized successfully"
        : "Database initialization completed with some errors",
      initialCheck: checkResult,
      creationResults,
      finalCheck,
    });
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getSetupInstructions(checkResult: any): string[] {
  const instructions = [];

  instructions.push("To enable automatic database setup:");
  instructions.push("1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file");
  instructions.push(
    "2. Get the key from Supabase Dashboard → Settings → API → service_role key"
  );
  instructions.push("");

  if (!checkResult.tablesChecked.submissions) {
    instructions.push("Manual setup - Create 'submissions' table:");
    instructions.push("- Go to Supabase Dashboard → SQL Editor");
    instructions.push("- Run the CREATE TABLE SQL from src/lib/db-init.ts");
  }

  if (!checkResult.bucketsChecked.userImages) {
    instructions.push("Manual setup - Create 'user-images' storage bucket:");
    instructions.push("- Go to Supabase Dashboard → Storage");
    instructions.push("- Create new bucket named 'user-images'");
    instructions.push("- Set it as public");
  }

  return instructions;
}

export async function POST() {
  // Same as GET - allows for both methods
  return GET();
}
