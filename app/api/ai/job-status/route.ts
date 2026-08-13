import { NextRequest, NextResponse } from "next/server";
import {
  getJobStatusFromSession,
  SessionJobStorage,
} from "@/lib/session-job-storage";

// Use Node.js runtime for file system access
export const runtime = "nodejs";
export const maxDuration = 15; // Reduced for US client expectations
export const preferredRegion = "iad1"; // US East for faster response

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Checking status for job:", jobId);

    // Get job status from server-side storage (since client can't access server memory)
    const job = SessionJobStorage.getJobStatus(jobId);

    if (!job) {
      console.error("Job not found:", jobId);

      // Return a default pending status for jobs that might be processing
      // but not yet stored in the file
      const response = NextResponse.json(
        {
          jobId: jobId,
          status: "pending",
          message: "Job is being processed, please wait...",
        },
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

      // Don't sync to cookie if job doesn't exist
      return response;
    }

    console.log("Job status:", job.status);

    // Create response object
    const response = NextResponse.json(
      {
        jobId: jobId,
        status: job.status,
        createdAt: job.created_at,
        ...(job.status === "completed" &&
          job.result_url && {
            imageUrl: job.result_url,
            completedAt: job.completed_at,
          }),
        ...(job.status === "failed" &&
          job.error && {
            error: job.error,
            completedAt: job.completed_at,
          }),
        ...(job.status === "analysis_complete" && {
          message: "Analysis complete, ready for generation",
          analysisCompletedAt: job.analysis_completed_at,
        }),
        ...(job.status === "generating" && {
          message: "Generating image...",
          generationStartedAt: job.generation_started_at,
        }),
        ...(job.status === "analyzing" && {
          message: "Analyzing image...",
        }),
      },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    // Job status retrieved from session storage

    return response;
  } catch (error) {
    console.error("Error in job-status API route:", error);
    return NextResponse.json(
      {
        error: `Failed to check job status: ${
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
