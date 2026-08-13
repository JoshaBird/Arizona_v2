import { NextRequest, NextResponse } from "next/server";

// Cookie-based job storage for Vercel compatibility
export class CookieJobStorage {
  private static readonly COOKIE_NAME = "image_jobs";
  private static readonly MAX_AGE = 60 * 60 * 24; // 24 hours in seconds
  private static readonly MAX_JOBS = 20; // Maximum jobs to store in cookie

  // Store job status in cookie
  static setJobStatus(
    jobId: string,
    jobData: any,
    response?: NextResponse
  ): void {
    try {
      // Get existing jobs from cookie
      const existingJobs = this.getAllJobs();

      // Update the specific job
      existingJobs[jobId] = {
        ...existingJobs[jobId],
        ...jobData,
        updated_at: new Date().toISOString(),
      };

      // Clean up old jobs to prevent cookie from growing too large
      const cleanedJobs = this.cleanupOldJobs(existingJobs);

      // Set cookie with updated jobs
      const cookieValue = JSON.stringify(cleanedJobs);

      if (response) {
        response.cookies.set(this.COOKIE_NAME, cookieValue, {
          maxAge: this.MAX_AGE,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }

      console.log(
        `Stored job ${jobId} status in cookie (${cookieValue.length} bytes)`
      );
    } catch (error) {
      console.error(`Error storing job ${jobId} in cookie:`, error);
    }
  }

  // Get job status from cookie
  static getJobStatus(jobId: string, request?: NextRequest): any {
    try {
      const jobs = this.getAllJobs(request);
      const job = jobs[jobId];

      if (job) {
        console.log(`Retrieved job ${jobId} from cookie`);
      }

      return job || null;
    } catch (error) {
      console.error(`Error getting job ${jobId} from cookie:`, error);
      return null;
    }
  }

  // Get all jobs from cookie
  private static getAllJobs(request?: NextRequest): Record<string, any> {
    try {
      let cookieValue: string | undefined;

      if (request) {
        cookieValue = request.cookies.get(this.COOKIE_NAME)?.value;
      } else {
        // Fallback for server-side usage - try to get from headers
        try {
          const { cookies } = require("next/headers");
          cookieValue = cookies().get(this.COOKIE_NAME)?.value;
        } catch (e) {
          // If we can't access cookies (e.g., in background process), return empty
          console.log("Cannot access cookies in this context");
          return {};
        }
      }

      if (!cookieValue) {
        return {};
      }

      const jobs = JSON.parse(cookieValue);
      console.log(`Retrieved ${Object.keys(jobs).length} jobs from cookie`);
      return jobs;
    } catch (error) {
      console.error("Error parsing jobs cookie:", error);
      return {};
    }
  }

  // Clean up old jobs to prevent cookie from growing too large
  private static cleanupOldJobs(
    jobs: Record<string, any>
  ): Record<string, any> {
    const jobEntries = Object.entries(jobs);

    // Sort by updated_at or created_at timestamp (newest first)
    jobEntries.sort((a, b) => {
      const timeA = new Date(a[1].updated_at || a[1].created_at || 0).getTime();
      const timeB = new Date(b[1].updated_at || b[1].created_at || 0).getTime();
      return timeB - timeA;
    });

    // Keep only the most recent jobs
    const recentJobs = jobEntries.slice(0, this.MAX_JOBS);

    if (jobEntries.length > recentJobs.length) {
      console.log(
        `Cleaned up ${
          jobEntries.length - recentJobs.length
        } old jobs from cookie`
      );
    }

    return Object.fromEntries(recentJobs);
  }

  // Clear all jobs from cookie (for application startup)
  static clearAllJobs(response?: NextResponse): void {
    try {
      if (response) {
        response.cookies.delete(this.COOKIE_NAME);
        console.log("Cleared all jobs from cookie");
      } else {
        // Fallback for server-side clearing
        try {
          const { cookies } = require("next/headers");
          cookies().delete(this.COOKIE_NAME);
          console.log("Cleared all jobs from cookie (server-side)");
        } catch (e) {
          console.log("Cannot clear cookies in this context");
        }
      }
    } catch (error) {
      console.error("Error clearing jobs cookie:", error);
    }
  }

  // Get cookie size for monitoring
  static getCookieSize(request?: NextRequest): number {
    try {
      const jobs = this.getAllJobs(request);
      const cookieValue = JSON.stringify(jobs);
      return cookieValue.length;
    } catch (error) {
      console.error("Error getting cookie size:", error);
      return 0;
    }
  }

  // Get job count
  static getJobCount(request?: NextRequest): number {
    try {
      const jobs = this.getAllJobs(request);
      return Object.keys(jobs).length;
    } catch (error) {
      console.error("Error getting job count:", error);
      return 0;
    }
  }
}

// Helper functions for API routes
export function setJobStatusCookie(
  jobId: string,
  jobData: any,
  response: NextResponse
): void {
  CookieJobStorage.setJobStatus(jobId, jobData, response);
}

export function getJobStatusFromCookie(
  jobId: string,
  request: NextRequest
): any {
  return CookieJobStorage.getJobStatus(jobId, request);
}

export function clearAllJobsCookie(response?: NextResponse): void {
  CookieJobStorage.clearAllJobs(response);
}
