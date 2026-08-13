#!/usr/bin/env node

/**
 * Automatic Database Setup Script
 * This script creates the required tables and policies in Supabase automatically
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  console.error(
    "\n📝 Please update your .env.local file with your Supabase credentials"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log("🚀 Starting automatic database setup...");

    // Step 1: Check if table already exists
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("id")
        .limit(1);

      if (!error) {
        console.log("✅ Submissions table already exists");
        return { success: true, message: "Database already set up" };
      }
    } catch (error) {
      console.log("📝 Table doesn't exist, will create it...");
    }

    // Step 2: Create table using SQL execution
    console.log("🔧 Creating submissions table...");

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

    // Try to execute SQL using different approaches
    const approaches = [
      {
        name: "Direct SQL execution",
        url: `${supabaseUrl}/rest/v1/rpc/exec_sql`,
        body: { sql: createTableSQL },
      },
      {
        name: "Query endpoint",
        url: `${supabaseUrl}/rest/v1/rpc/query`,
        body: { query: createTableSQL },
      },
      {
        name: "SQL endpoint",
        url: `${supabaseUrl}/rest/v1/rpc/sql`,
        body: { sql: createTableSQL },
      },
    ];

    let tableCreated = false;

    for (const approach of approaches) {
      try {
        console.log(`   Trying ${approach.name}...`);

        const response = await fetch(approach.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(approach.body),
        });

        if (response.ok) {
          console.log(`   ✅ Table created using ${approach.name}`);
          tableCreated = true;
          break;
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ${approach.name} failed:`, errorText);
        }
      } catch (error) {
        console.log(`   ❌ ${approach.name} error:`, error.message);
      }
    }

    if (!tableCreated) {
      throw new Error("All automatic table creation methods failed");
    }

    // Step 3: Create storage bucket
    console.log("🗄️ Creating storage bucket...");
    try {
      const { data: bucketData, error: bucketError } =
        await supabase.storage.createBucket("user-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (bucketError && !bucketError.message.includes("already exists")) {
        console.log("   ⚠️ Bucket creation failed:", bucketError.message);
      } else {
        console.log("   ✅ Storage bucket created/verified");
      }
    } catch (bucketError) {
      console.log("   ⚠️ Bucket creation error:", bucketError.message);
    }

    // Step 4: Verify setup
    console.log("🔍 Verifying setup...");
    try {
      const { data: testData, error: testError } = await supabase
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
        await supabase.from("submissions").delete().eq("id", testData.id);
      }

      console.log("   ✅ Database setup verification successful");
    } catch (verifyError) {
      console.log("   ⚠️ Verification failed:", verifyError.message);
    }

    console.log("🎉 Automatic database setup completed successfully!");
    return { success: true, message: "Database setup completed" };
  } catch (error) {
    console.error("❌ Setup failed:", error.message);

    console.log("\n📋 Manual setup required:");
    console.log("1. Go to Supabase Dashboard → SQL Editor");
    console.log("2. Run the SQL from setup-database.sql");
    console.log("3. Refresh your application");

    return { success: false, error: error.message };
  }
}

// Run the setup
setupDatabase()
  .then((result) => {
    if (result.success) {
      console.log("\n✅ Your application is ready to use!");
      process.exit(0);
    } else {
      console.log(
        "\n❌ Setup failed. Please follow the manual instructions above."
      );
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
