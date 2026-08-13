import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Running database migrations...");

    // Read the migration file
    const migrationSQL = `
-- Create submissions table for Oak Iron Work
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

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access
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

-- Create storage bucket for user images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-images', 'user-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user-images bucket
CREATE POLICY "Allow public read access to user-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'user-images');

CREATE POLICY "Allow public upload to user-images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'user-images');

CREATE POLICY "Allow public update to user-images" ON storage.objects 
FOR UPDATE USING (bucket_id = 'user-images');

CREATE POLICY "Allow public delete to user-images" ON storage.objects 
FOR DELETE USING (bucket_id = 'user-images');
    `;

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Execute each statement
    for (const statement of statements) {
      try {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);

          // Try different approaches to execute SQL
          const approaches = [
            {
              name: "Direct SQL execution",
              url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
              body: { sql: statement + ";" },
            },
            {
              name: "Query endpoint",
              url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`,
              body: { query: statement + ";" },
            },
            {
              name: "SQL endpoint",
              url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`,
              body: { sql: statement + ";" },
            },
          ];

          let statementSuccess = false;

          for (const approach of approaches) {
            try {
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
                console.log(`✅ Success with ${approach.name}`);
                statementSuccess = true;
                break;
              }
            } catch (error) {
              // Continue to next approach
            }
          }

          if (statementSuccess) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to execute: ${statement.substring(0, 100)}...`);
          }
        }
      } catch (error) {
        errorCount++;
        errors.push(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Handle storage bucket creation separately
    try {
      console.log("Creating storage bucket...");
      const { data: bucketData, error: bucketError } =
        await supabaseAdmin.storage.createBucket("user-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (bucketError && !bucketError.message.includes("already exists")) {
        console.log("Bucket creation failed:", bucketError);
        errorCount++;
        errors.push(`Storage bucket error: ${bucketError.message}`);
      } else {
        console.log("✅ Storage bucket created/verified");
        successCount++;
      }
    } catch (bucketError) {
      console.log("Bucket creation error:", bucketError);
      errorCount++;
      errors.push(
        `Storage bucket error: ${
          bucketError instanceof Error ? bucketError.message : "Unknown error"
        }`
      );
    }

    // Test the setup
    try {
      console.log("Testing database setup...");
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "migration_test",
          email: "test@migration.com",
          phone: "000-000-0000",
          address: "Migration Test",
          prompt: "Testing migration setup",
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

      console.log("✅ Migration test successful");
      successCount++;
    } catch (testError) {
      console.log("Migration test failed:", testError);
      errorCount++;
      errors.push(
        `Test failed: ${
          testError instanceof Error ? testError.message : "Unknown error"
        }`
      );
    }

    if (errorCount === 0) {
      return NextResponse.json({
        success: true,
        message: "Database migrations completed successfully",
        results: {
          successful: successCount,
          errors: errorCount,
          details: "All tables and policies created",
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Migration completed with some errors",
        results: {
          successful: successCount,
          errors: errorCount,
          errorDetails: errors,
        },
      });
    }
  } catch (error) {
    console.error("❌ Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
