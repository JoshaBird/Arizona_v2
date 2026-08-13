import { NextRequest, NextResponse } from "next/server";
import { clearAllJobsFromSession } from "@/lib/session-job-storage";

// Clear all jobs API route
export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    console.log("Clearing all jobs...");

    // Create response object
    const response = NextResponse.json(
      {
        success: true,
        message: "All jobs cleared successfully",
      },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    // Clear all jobs (including cookies)
    clearAllJobsFromSession();

    console.log("All jobs cleared successfully");
    return response;
  } catch (error) {
    console.error("Error clearing jobs:", error);
    return NextResponse.json(
      {
        error: `Failed to clear jobs: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET() {
  // Also allow GET requests for easier testing
  return POST(
    new NextRequest("http://localhost/api/ai/clear-jobs", { method: "POST" })
  );
}
