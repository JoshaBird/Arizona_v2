import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🔧 Creating SQL execution function...");

    // First, let's try to create a function that can execute arbitrary SQL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_text text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'Success: ' || sql_text;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'Error: ' || SQLERRM;
      END;
      $$;
    `;

    // Try to create the function using direct SQL
    try {
      // Use the REST API to create the function
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
        console.log("✅ Function created successfully");

        // Now try to use the function to create the table
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

        // Execute the table creation
        const { data, error } = await supabaseAdmin.rpc("execute_sql", {
          sql_text: createTableSQL,
        });

        if (error) {
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Table created successfully using custom function",
          result: data,
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create function: ${errorText}`);
      }
    } catch (functionError) {
      console.log("Function creation failed:", functionError);

      // Fallback: Try to create table directly using the Supabase client
      try {
        console.log("Trying direct table creation...");

        // Try to create the table by attempting an insert operation
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

        if (
          error &&
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          return NextResponse.json({
            success: false,
            error: "Table does not exist and cannot be created automatically",
            message: "Please create the table manually in Supabase Dashboard",
            sql: `
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
            `,
            instructions: [
              "1. Go to Supabase Dashboard → SQL Editor",
              "2. Copy and paste the SQL above",
              "3. Click 'Run' to execute",
              "4. Refresh your application",
            ],
          });
        } else if (error) {
          throw error;
        }

        // Table exists, clean up test record
        if (data) {
          await supabaseAdmin.from("submissions").delete().eq("id", data.id);
        }

        return NextResponse.json({
          success: true,
          message: "Table already exists and is working correctly",
        });
      } catch (directError) {
        throw directError;
      }
    }
  } catch (error) {
    console.error("❌ Function creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create function and table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
