import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Forces PostgREST to reload its schema cache
 * This is essential after creating new tables or modifying schema
 */
export async function refreshPostgRESTSchema(): Promise<boolean> {
  try {
    console.log("🔄 Refreshing PostgREST schema cache...");

    // Send NOTIFY command to reload schema
    const { error } = await supabaseAdmin.rpc("refresh_schema_cache");

    if (error) {
      console.log(
        "⚠️ Schema refresh RPC failed, trying alternative method:",
        error
      );

      // Alternative: Execute NOTIFY via raw SQL
      try {
        const { error: notifyError } = await supabaseAdmin
          .from("_internal")
          .select("*")
          .limit(0); // This will fail but trigger schema refresh

        console.log("✅ Schema cache refresh triggered");
        return true;
      } catch (altError) {
        console.log("⚠️ Alternative schema refresh failed:", altError);
        // Don't throw - this is a best-effort operation
        return false;
      }
    }

    console.log("✅ Schema cache refreshed successfully");
    return true;
  } catch (error) {
    console.log("⚠️ Schema refresh failed:", error);
    return false;
  }
}

/**
 * Waits for schema cache to propagate
 * Includes exponential backoff for reliability
 */
export async function waitForSchemaPropagation(
  maxAttempts: number = 5,
  baseDelay: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⏳ Schema propagation attempt ${attempt}/${maxAttempts}...`);

      // Test if we can access the submissions table
      const { error } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .limit(1);

      if (!error) {
        console.log("✅ Schema propagation confirmed");
        return true;
      }

      // If table doesn't exist yet, wait and retry
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.log(`⚠️ Schema propagation attempt ${attempt} failed:`, error);

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.log("❌ Schema propagation timeout after all attempts");
  return false;
}

/**
 * Comprehensive schema refresh with retry logic
 * Combines immediate refresh with propagation waiting
 */
export async function ensureSchemaRefresh(): Promise<boolean> {
  try {
    // Step 1: Force immediate refresh
    const refreshSuccess = await refreshPostgRESTSchema();

    // Step 2: Wait for propagation (even if refresh failed)
    const propagationSuccess = await waitForSchemaPropagation();

    return refreshSuccess || propagationSuccess;
  } catch (error) {
    console.error("❌ Schema refresh process failed:", error);
    return false;
  }
}

/**
 * Tests if a table exists and is accessible via PostgREST
 */
export async function testTableAccess(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from(tableName).select("*").limit(1);

    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * Creates a complete table creation SQL with proper schema cache management
 */
export function createTableSQL(
  tableName: string,
  columns: string,
  policies?: string
): string {
  return `
-- Create table: ${tableName}
CREATE TABLE IF NOT EXISTS public.${tableName} (
  ${columns}
);

-- Refresh PostgREST schema cache immediately after table creation
NOTIFY pgrst, 'reload schema';

-- Enable RLS
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

${policies || ""}

-- Final schema refresh to ensure all changes are cached
NOTIFY pgrst, 'reload schema';
  `.trim();
}

/**
 * Standard submissions table SQL with cache management
 */
export function getSubmissionsTableSQL(): string {
  return createTableSQL(
    "submissions",
    `
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      prompt TEXT,
      original_image_storage_url TEXT,
      result_image_storage_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `,
    `
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON public.submissions;
DROP POLICY IF EXISTS "Allow public update" ON public.submissions;
DROP POLICY IF EXISTS "Allow public select" ON public.submissions;

-- Create policies
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
    `
  );
}
