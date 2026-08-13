import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🔨 Creating table for real...");

    // First, let's check what tables actually exist
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "submissions");

    console.log("Existing tables check:", { tables, tablesError });

    // Try to create the table using a different approach
    // We'll use the fact that Supabase allows us to create tables via SQL functions
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
      
      -- Final schema refresh to ensure all changes are cached
      NOTIFY pgrst, 'reload schema';
    `;

    // Try multiple approaches to execute the SQL
    const approaches = [
      {
        name: "Direct SQL execution via REST",
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
          console.log(`✅ Success with ${approach.name}`);

          // Wait for PostgREST schema cache to refresh
          console.log("⏳ Waiting for schema cache to refresh...");
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Test the table
          const { data, error } = await supabaseAdmin
            .from("submissions")
            .insert({
              name: "test",
              email: "test@example.com",
              phone: "000-000-0000",
              address: "Test Address",
              prompt: "Test prompt",
            })
            .select()
            .single();

          if (error) {
            console.log("Table test failed:", error);
            continue;
          }

          // Clean up test record
          if (data) {
            await supabaseAdmin.from("submissions").delete().eq("id", data.id);
          }

          console.log("✅ Table created and tested successfully");

          // Create storage bucket
          try {
            const { data: bucketData, error: bucketError } =
              await supabaseAdmin.storage.createBucket("user-images", {
                public: true,
                fileSizeLimit: 52428800, // 50MB
              });

            if (
              bucketError &&
              !bucketError.message.includes("already exists")
            ) {
              console.log("Bucket creation failed:", bucketError);
            } else {
              console.log("✅ Storage bucket created/verified");
            }
          } catch (bucketError) {
            console.log("Bucket creation error:", bucketError);
          }

          return NextResponse.json({
            success: true,
            message: `Table created successfully using ${approach.name}`,
            method: approach.name,
          });
        } else {
          const errorText = await response.text();
          console.log(`${approach.name} failed:`, errorText);
        }
      } catch (error) {
        console.log(`${approach.name} error:`, error);
      }
    }

    // If all approaches fail, provide manual SQL
    return NextResponse.json({
      success: false,
      error: "All automatic approaches failed",
      message: "Please run the SQL below in Supabase Dashboard",
      sql: createTableSQL,
      instructions: [
        "1. Go to Supabase Dashboard → SQL Editor",
        "2. Copy and paste the SQL above",
        "3. Click 'Run' to execute",
        "4. Refresh your application",
      ],
    });
  } catch (error) {
    console.error("❌ Create table error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Create table failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
