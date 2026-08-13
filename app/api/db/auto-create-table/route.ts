import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🤖 Auto-creating table...");

    // Step 1: Try to create table by inserting a record with specific structure
    // This will fail if table doesn't exist, but we can catch that and create it
    try {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .insert({
          name: "auto_init",
          email: "init@auto.com",
          phone: "000-000-0000",
          address: "Auto Initialization",
          prompt: "Auto table creation test",
          original_image_storage_url: null,
          result_image_storage_url: null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Table exists, clean up test record
      if (data) {
        await supabaseAdmin.from("submissions").delete().eq("id", data.id);
      }

      return NextResponse.json({
        success: true,
        message: "Table already exists and is working correctly",
        method: "existing-table",
      });
    } catch (insertError: any) {
      if (
        insertError.message.includes("relation") &&
        insertError.message.includes("does not exist")
      ) {
        console.log("Table doesn't exist, creating it...");

        // Step 2: Use Supabase's schema manipulation via REST API
        try {
          // Try to create table using the management API
          const createTableResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                type: "table",
                name: "submissions",
                schema: "public",
                columns: [
                  {
                    name: "id",
                    type: "uuid",
                    default: "gen_random_uuid()",
                    primary_key: true,
                  },
                  {
                    name: "name",
                    type: "text",
                  },
                  {
                    name: "email",
                    type: "text",
                  },
                  {
                    name: "phone",
                    type: "text",
                  },
                  {
                    name: "address",
                    type: "text",
                  },
                  {
                    name: "prompt",
                    type: "text",
                  },
                  {
                    name: "original_image_storage_url",
                    type: "text",
                  },
                  {
                    name: "result_image_storage_url",
                    type: "text",
                  },
                  {
                    name: "created_at",
                    type: "timestamptz",
                    default: "now()",
                  },
                ],
              }),
            }
          );

          if (createTableResponse.ok) {
            console.log("✅ Table created via management API");

            // Enable RLS and create policies
            await setupTablePolicies();

            return NextResponse.json({
              success: true,
              message: "Table created successfully via management API",
              method: "management-api",
            });
          } else {
            throw new Error(
              `Management API failed: ${createTableResponse.status}`
            );
          }
        } catch (managementError) {
          console.log("Management API failed, trying alternative approach...");

          // Step 3: Use a workaround - create table by manipulating the schema directly
          try {
            // Try to create table by using a different approach
            // We'll use the fact that Supabase allows us to create tables through the REST API
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_table`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
                  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  table_name: "submissions",
                  columns: {
                    id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
                    name: "text",
                    email: "text",
                    phone: "text",
                    address: "text",
                    prompt: "text",
                    original_image_storage_url: "text",
                    result_image_storage_url: "text",
                    created_at: "timestamptz DEFAULT now()",
                  },
                }),
              }
            );

            if (response.ok) {
              console.log("✅ Table created via RPC");
              await setupTablePolicies();

              return NextResponse.json({
                success: true,
                message: "Table created successfully via RPC",
                method: "rpc",
              });
            } else {
              throw new Error("RPC approach failed");
            }
          } catch (rpcError) {
            console.log(
              "All automatic approaches failed, providing manual solution..."
            );

            // Final fallback - provide the exact SQL needed
            return NextResponse.json({
              success: false,
              error: "Automatic table creation failed",
              message: "Please run the SQL below in Supabase Dashboard",
              sql: `
-- Run this in Supabase Dashboard → SQL Editor
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
          }
        }
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    console.error("❌ Auto-create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Auto-create failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function setupTablePolicies() {
  try {
    // Enable RLS
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/enable_rls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          table_name: "submissions",
        }),
      }
    );

    // Create policies
    const policies = [
      {
        name: "Allow public insert",
        operation: "INSERT",
        check: "true",
      },
      {
        name: "Allow public update",
        operation: "UPDATE",
        check: "true",
      },
      {
        name: "Allow public select",
        operation: "SELECT",
        check: "true",
      },
    ];

    for (const policy of policies) {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_policy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            table_name: "submissions",
            policy_name: policy.name,
            operation: policy.operation,
            check: policy.check,
          }),
        }
      );
    }

    console.log("✅ Table policies created");
  } catch (error) {
    console.error("⚠️ Could not create policies:", error);
  }
}

export async function GET() {
  return POST();
}
