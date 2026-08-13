import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for admin operations
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

export async function POST() {
  try {
    console.log("🤖 Starting automatic database initialization...");

    const results = {
      functionCreated: false,
      tableCreated: false,
      bucketCreated: false,
      errors: [] as string[],
    };

    // Step 1: Create a function that can execute SQL
    console.log("📝 Creating SQL execution function...");

    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION auto_create_tables()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Create submissions table if not exists
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions' AND table_schema = 'public') THEN
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
        END IF;
      END;
      $$;
    `;

    // Try multiple approaches to create the function
    let functionCreated = false;

    // Approach 1: Direct SQL execution via REST API
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: createFunctionSQL }),
        }
      );

      if (response.ok) {
        functionCreated = true;
        results.functionCreated = true;
        console.log("✅ Function created via REST API");
      }
    } catch (error) {
      console.log("REST API approach failed:", error);
    }

    // Approach 2: Try using the query endpoint
    if (!functionCreated) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ query: createFunctionSQL }),
          }
        );

        if (response.ok) {
          functionCreated = true;
          results.functionCreated = true;
          console.log("✅ Function created via query endpoint");
        }
      } catch (error) {
        console.log("Query endpoint approach failed:", error);
      }
    }

    // Step 2: Execute the function to create tables
    if (functionCreated) {
      try {
        const { data, error } = await supabaseAdmin.rpc("auto_create_tables");

        if (error) {
          throw error;
        }

        results.tableCreated = true;
        console.log("✅ Tables created successfully");
      } catch (error) {
        console.error("Function execution failed:", error);
        results.errors.push(
          `Function execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Step 3: Create storage bucket
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

      results.bucketCreated = true;
      console.log("✅ Storage bucket created/verified");

      // Create storage policies
      const policySQL = `
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
      `;

      // Try to create policies via function
      if (functionCreated) {
        try {
          await supabaseAdmin.rpc("auto_create_tables");
        } catch (error) {
          console.warn("Could not create storage policies:", error);
        }
      }
    } catch (error) {
      console.error("Bucket creation failed:", error);
      results.errors.push(
        `Bucket creation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Step 4: Verify everything works
    const verification = {
      tableExists: false,
      bucketExists: false,
    };

    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .limit(1);

      verification.tableExists = !error;
    } catch (error) {
      console.error("Table verification failed:", error);
    }

    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      verification.bucketExists =
        buckets?.some((b) => b.name === "user-images") || false;
    } catch (error) {
      console.error("Bucket verification failed:", error);
    }

    const success =
      results.tableCreated &&
      results.bucketCreated &&
      verification.tableExists &&
      verification.bucketExists;

    return NextResponse.json({
      success,
      message: success
        ? "Database initialized successfully"
        : "Database initialization completed with some issues",
      results,
      verification,
      errors: results.errors,
    });
  } catch (error) {
    console.error("❌ Auto-initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Auto-initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
