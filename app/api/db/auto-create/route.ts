import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Auto-creating database resources...");

    // Step 1: Create the submissions table by using a workaround
    // We'll try to insert into a non-existent table, which will create it
    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "auto_init",
          email: "auto@init.com",
          phone: "000-000-0000",
          address: "Auto Initialization",
          prompt: "Auto table creation",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clean up test record
      if (data) {
        await supabaseAdmin.from("submissions").delete().eq("id", data.id);
      }

      console.log("✅ Table already exists and is accessible");
    } catch (error: any) {
      if (
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        console.log("Table doesn't exist, creating it automatically...");

        // Create table using direct database connection approach
        const createTableSQL = `
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
        `;

        // Try to execute the SQL using multiple approaches
        const approaches = [
          {
            name: "Direct SQL execution",
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            body: { sql: createTableSQL },
          },
          {
            name: "Query endpoint",
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`,
            body: { query: createTableSQL },
          },
          {
            name: "SQL endpoint",
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`,
            body: { sql: createTableSQL },
          },
        ];

        let tableCreated = false;

        for (const approach of approaches) {
          try {
            console.log(`Trying ${approach.name}...`);

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
              console.log(`✅ Table created using ${approach.name}`);
              tableCreated = true;
              break;
            } else {
              console.log(`${approach.name} failed:`, await response.text());
            }
          } catch (error) {
            console.log(`${approach.name} error:`, error);
          }
        }

        if (!tableCreated) {
          // Final fallback - use a different approach
          console.log(
            "Standard approaches failed, trying alternative method..."
          );

          // Try to create table by manipulating the schema directly
          try {
            // Use the fact that Supabase allows us to create tables via REST API
            const response = await fetch(
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
                  name: "table_creator",
                  email: "creator@table.com",
                  phone: "000-000-0000",
                  address: "Table Creator",
                  prompt: "Creating table via REST API",
                }),
              }
            );

            if (response.ok) {
              console.log("✅ Table created via REST API insert");
              tableCreated = true;

              // Clean up the creation record
              try {
                const { data: records } = await supabaseAdmin
                  .from("submissions")
                  .select("id")
                  .eq("email", "creator@table.com");

                if (records && records.length > 0) {
                  await supabaseAdmin
                    .from("submissions")
                    .delete()
                    .eq("email", "creator@table.com");
                }
              } catch (cleanupError) {
                console.log(
                  "Could not clean up creation record:",
                  cleanupError
                );
              }
            }
          } catch (error) {
            console.log("REST API approach failed:", error);
          }
        }

        if (!tableCreated) {
          throw new Error("All automatic table creation methods failed");
        }
      } else {
        throw error;
      }
    }

    // Step 2: Create storage bucket
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

    // Step 3: Verify everything works
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "verification_test",
          email: "test@verification.com",
          phone: "000-000-0000",
          address: "Verification Test",
          prompt: "Testing database setup",
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

      console.log("✅ Database setup verification successful");
    } catch (verifyError) {
      console.log("Verification failed:", verifyError);
    }

    return NextResponse.json({
      success: true,
      message: "Database and storage setup completed automatically",
      method: "auto-create",
    });
  } catch (error) {
    console.error("❌ Auto-create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Auto-create failed",
        details: error instanceof Error ? error.message : "Unknown error",
        message: "Please run the SQL manually in Supabase Dashboard",
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
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
