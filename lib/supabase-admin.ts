import { createClient } from "@supabase/supabase-js";

let supabaseAdmin: any = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        db: {
          schema: "public",
        },
        global: {
          headers: {
            Connection: "keep-alive",
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
};

// Export the client for direct use if needed
export { supabaseAdmin };
