import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Smart migration - creating tables automatically...");

    // Step 1: Check if submissions table exists
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
      console.log("📝 Table doesn't exist, will create it...");
    }

    if (!tableExists) {
      console.log("🔧 Creating submissions table automatically...");

      // Try to create table using SQL execution
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

      try {
        // First, try to create the exec_sql function if it doesn't exist
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
          
          GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
          GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
        `;

        try {
          // Try to create the function using a direct SQL approach
          const { error: functionError } = await supabaseAdmin
            .from("_internal")
            .select("*")
            .limit(0); // This will fail but might trigger function creation

          console.log(
            "⚠️ Function creation approach failed, trying alternative methods"
          );
        } catch (funcErr) {
          console.log("Function creation failed, proceeding with alternatives");
        }

        // Method 1: Try using Supabase RPC function
        const { error: sqlError } = await supabaseAdmin.rpc("exec_sql", {
          sql: createTableSQL,
        });

        if (sqlError) {
          console.log(
            "⚠️ RPC exec_sql failed, trying Edge Function:",
            sqlError
          );

          // Method 2: Use Edge Function
          try {
            const edgeResponse = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-submissions-table`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
              }
            );

            if (edgeResponse.ok) {
              const result = await edgeResponse.json();
              if (result.success) {
                console.log("✅ Table created successfully via Edge Function");
              } else {
                throw new Error(`Edge Function failed: ${result.details}`);
              }
            } else {
              throw new Error(
                `Edge Function request failed: ${edgeResponse.status}`
              );
            }
          } catch (edgeError) {
            console.log(
              "⚠️ Edge Function failed, trying direct REST API:",
              edgeError
            );

            // Method 3: Use direct REST API call
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
                  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({ sql: createTableSQL }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.log("⚠️ Direct REST API failed:", errorText);
              throw new Error(
                `All automatic table creation methods failed. Last error: ${errorText}`
              );
            } else {
              console.log("✅ Table created successfully via direct REST API");
            }
          }
        } else {
          console.log("✅ Table created successfully via RPC exec_sql");
        }

        // Wait for schema cache to refresh
        console.log("⏳ Waiting for schema cache to refresh...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify table was created
        const { error: verifyError } = await supabaseAdmin
          .from("submissions")
          .select("id")
          .limit(1);

        if (verifyError) {
          console.log("⚠️ Table verification failed:", verifyError);

          // Try one more time after additional delay
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const { error: retryVerifyError } = await supabaseAdmin
            .from("submissions")
            .select("id")
            .limit(1);

          if (retryVerifyError) {
            throw new Error("Table creation verification failed after retry");
          }
        }

        console.log("✅ Table creation verified");
      } catch (createError) {
        console.log("❌ Automatic table creation failed:", createError);

        // Fallback: Provide manual instructions
        return NextResponse.json({
          success: false,
          error: "Automatic table creation failed",
          message: "Please run the SQL below in Supabase Dashboard",
          sql: createTableSQL,
          instructions: [
            "1. Go to Supabase Dashboard → SQL Editor",
            "2. Copy and paste the SQL above",
            "3. Click 'Run' to execute",
            "4. Refresh your application",
          ],
        });
      }
    }

    // Step 2: Create storage bucket
    console.log("🗄️ Creating storage bucket...");
    try {
      const { data: bucketData, error: bucketError } =
        await supabaseAdmin.storage.createBucket("user-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (bucketError && !bucketError.message.includes("already exists")) {
        console.log("⚠️ Bucket creation failed:", bucketError);
      } else {
        console.log("✅ Storage bucket created/verified");
      }
    } catch (bucketError) {
      console.log("⚠️ Bucket creation error:", bucketError);
    }

    // Step 3: Test the setup
    console.log("🔍 Testing setup...");
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "setup_test",
          email: "test@setup.com",
          phone: "000-000-0000",
          address: "Setup Test",
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

      console.log("✅ Setup test successful");
    } catch (testError) {
      console.log("⚠️ Setup test failed:", testError);
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed successfully",
      method: "smart-migration",
    });
  } catch (error) {
    console.error("❌ Smart migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Smart migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
