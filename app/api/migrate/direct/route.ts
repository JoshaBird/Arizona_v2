import { NextResponse } from "next/server";
import { Client } from "pg";

export async function POST() {
  try {
    console.log("🚀 Direct PostgreSQL migration...");

    // Extract database connection info from Supabase URL and service key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Parse Supabase URL to get connection details
    // Format: https://project-ref.supabase.co
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      throw new Error("Invalid Supabase URL format");
    }

    const projectRef = urlMatch[1];

    // Create PostgreSQL connection using Supabase pooler
    const client = new Client({
      host: `aws-0-us-east-1.pooler.supabase.com`,
      port: 6543,
      database: "postgres",
      user: `postgres.${projectRef}`,
      password: serviceKey, // Use service role key as password
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();
    console.log("✅ Connected to PostgreSQL database");

    // Create the submissions table
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

    // Execute the SQL
    await client.query(createTableSQL);
    console.log("✅ Submissions table created successfully");

    // Create storage bucket
    const createBucketSQL = `
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('user-images', 'user-images', true)
      ON CONFLICT (id) DO NOTHING;
    `;

    await client.query(createBucketSQL);
    console.log("✅ Storage bucket created successfully");

    // Create storage policies
    const createStoragePoliciesSQL = `
      CREATE POLICY "Allow public read access to user-images" ON storage.objects 
      FOR SELECT USING (bucket_id = 'user-images');

      CREATE POLICY "Allow public upload to user-images" ON storage.objects 
      FOR INSERT WITH CHECK (bucket_id = 'user-images');

      CREATE POLICY "Allow public update to user-images" ON storage.objects 
      FOR UPDATE USING (bucket_id = 'user-images');

      CREATE POLICY "Allow public delete to user-images" ON storage.objects 
      FOR DELETE USING (bucket_id = 'user-images');
    `;

    await client.query(createStoragePoliciesSQL);
    console.log("✅ Storage policies created successfully");

    // Test the setup
    const testSQL = `
      INSERT INTO public.submissions (name, email, phone, address, prompt)
      VALUES ('test', 'test@example.com', '000-000-0000', 'Test Address', 'Test prompt')
      RETURNING id;
    `;

    const result = await client.query(testSQL);
    const testId = result.rows[0].id;

    // Clean up test record
    await client.query("DELETE FROM public.submissions WHERE id = $1", [
      testId,
    ]);
    console.log("✅ Setup test successful");

    await client.end();

    return NextResponse.json({
      success: true,
      message:
        "Database setup completed successfully via direct PostgreSQL connection",
      method: "direct-postgresql",
    });
  } catch (error) {
    console.error("❌ Direct migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Direct migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
