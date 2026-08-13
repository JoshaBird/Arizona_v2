import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json({ error: "SQL is required" }, { status: 400 });
    }

    console.log("🔧 Executing SQL directly...");
    console.log("SQL:", sql);

    // Try multiple approaches to execute SQL
    const approaches = [
      {
        name: "Direct SQL execution",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`,
        body: { query: sql, sql: sql },
      },
      {
        name: "Query endpoint",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/query`,
        body: { query: sql },
      },
      {
        name: "Exec SQL endpoint",
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        body: { sql: sql },
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

        console.log(`${approach.name} response status:`, response.status);

        if (response.ok) {
          console.log(`✅ Success with ${approach.name}`);
          return NextResponse.json({
            success: true,
            message: `SQL executed successfully using ${approach.name}`,
            method: approach.name,
            status: response.status,
          });
        } else {
          const errorText = await response.text();
          console.log(`${approach.name} failed:`, errorText);
        }
      } catch (error) {
        console.log(`${approach.name} error:`, error);
      }
    }

    // If all approaches failed, try using the Supabase client directly
    try {
      console.log("Trying Supabase client approach...");

      const { createClient } = await import("@supabase/supabase-js");

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || ""
      );

      // Try to execute SQL using a custom function
      const { data, error } = await supabase.rpc("sql", { query: sql });

      if (error) {
        throw error;
      }

      console.log("✅ Success with Supabase client");
      return NextResponse.json({
        success: true,
        message: "SQL executed successfully using Supabase client",
        method: "supabase-client",
        data,
      });
    } catch (clientError) {
      console.log("Supabase client failed:", clientError);
    }

    return NextResponse.json({
      success: false,
      error: "All SQL execution approaches failed",
      message: "Please run the SQL manually in Supabase Dashboard",
      sql: sql,
      instructions: [
        "1. Go to Supabase Dashboard → SQL Editor",
        "2. Paste the SQL above",
        "3. Click 'Run' to execute",
      ],
    });
  } catch (error) {
    console.error("❌ SQL execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "SQL execution failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
