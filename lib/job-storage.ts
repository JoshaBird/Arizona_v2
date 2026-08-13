import { promises as fs } from "fs";
import path from "path";
import { CookieJobStorage } from "./cookie-job-storage";

// Use cookie storage instead of file system
const USE_COOKIE_STORAGE = true;

// File storage for job status (fallback only)
const isVercel = process.env.VERCEL === "1";
const JOBS_FILE_PATH = isVercel
  ? "/tmp/image-jobs.json"
  : path.join(process.cwd(), "data", "image-jobs.json");

// In-memory fallback for job tracking
const inMemoryJobs: Record<string, any> = {};

// Simple file lock to prevent concurrent writes
let isWriting = false;

// Helper functions for JSON file storage
async function readJobsFile(): Promise<Record<string, any>> {
  try {
    await fs.access(JOBS_FILE_PATH);
    const data = await fs.readFile(JOBS_FILE_PATH, "utf-8");

    // Validate JSON before parsing
    if (!data.trim()) {
      console.log("Jobs file is empty, returning empty object");
      return {};
    }

    const parsed = JSON.parse(data);
    console.log(
      "Successfully read jobs file with",
      Object.keys(parsed).length,
      "jobs"
    );
    return parsed;
  } catch (error) {
    // Don't log as error if file simply doesn't exist
    if ((error as any)?.code === "ENOENT") {
      console.log("Jobs file doesn't exist yet");
    } else {
      console.log("Jobs file doesn't exist or is invalid:", error);
    }

    // If it's a JSON parse error, try to backup the corrupted file
    if (error instanceof SyntaxError) {
      try {
        const backupPath = JOBS_FILE_PATH + ".corrupted." + Date.now();
        await fs.copyFile(JOBS_FILE_PATH, backupPath);
        console.log(`Backed up corrupted file to: ${backupPath}`);

        // Create a new empty file
        await fs.writeFile(JOBS_FILE_PATH, "{}");
        console.log("Created new empty jobs file");
      } catch (backupError) {
        console.error("Failed to backup corrupted file:", backupError);
      }
    }

    // File doesn't exist or is invalid, return empty object
    return {};
  }
}

// Clean up old jobs to prevent file from growing indefinitely
function cleanupOldJobs(jobs: Record<string, any>): Record<string, any> {
  const jobEntries = Object.entries(jobs);

  // Sort by created_at timestamp (newest first)
  jobEntries.sort((a, b) => {
    const timeA = new Date(a[1].created_at || 0).getTime();
    const timeB = new Date(b[1].created_at || 0).getTime();
    return timeB - timeA;
  });

  // Keep only the last 50 jobs
  const maxJobs = 50;
  const recentJobs = jobEntries.slice(0, maxJobs);

  console.log(`Cleaned up ${jobEntries.length - recentJobs.length} old jobs`);

  return Object.fromEntries(recentJobs);
}

async function writeJobsFile(jobs: Record<string, any>): Promise<void> {
  // Prevent concurrent writes
  if (isWriting) {
    console.log("Another write operation in progress, skipping this write");
    return;
  }

  isWriting = true;

  // Clean up old jobs (keep only last 50 jobs) - moved outside try block for fallback access
  const cleanedJobs = cleanupOldJobs(jobs);
  console.log(`After cleanup: ${Object.keys(cleanedJobs).length} jobs`);

  try {
    console.log(
      `Attempting to write jobs file with ${Object.keys(jobs).length} jobs`
    );

    // Ensure directory exists (only needed for local development)
    if (!isVercel) {
      const dataDir = path.dirname(JOBS_FILE_PATH);
      console.log(`Creating directory: ${dataDir}`);
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Use atomic write to prevent corruption
    const tempFile = JOBS_FILE_PATH + ".tmp";
    const jsonString = JSON.stringify(cleanedJobs, null, 2);
    console.log(`JSON string length: ${jsonString.length}`);

    // Validate JSON before writing
    console.log("Validating JSON before write...");
    try {
      JSON.parse(jsonString);
      console.log("JSON validation successful");
    } catch (validationError) {
      console.error("JSON validation failed:", validationError);
      throw new Error("Generated JSON is invalid");
    }

    // Write to temp file first
    console.log(`Writing to temp file: ${tempFile}`);
    await fs.writeFile(tempFile, jsonString);

    // Verify temp file was written correctly
    try {
      const tempData = await fs.readFile(tempFile, "utf-8");
      JSON.parse(tempData); // Validate the written file
      console.log("Temp file written and validated successfully");
    } catch (verifyError) {
      console.error("Temp file verification failed:", verifyError);
      throw new Error("Temp file was not written correctly");
    }

    // Check if temp file exists before renaming
    try {
      await fs.access(tempFile);
      console.log(`Temp file exists, proceeding with rename`);
    } catch (accessError) {
      console.error("Temp file does not exist after writing:", accessError);
      throw new Error("Temp file was not created successfully");
    }

    // Atomic move
    console.log(`Moving temp file to: ${JOBS_FILE_PATH}`);
    await fs.rename(tempFile, JOBS_FILE_PATH);

    console.log(
      "Successfully wrote jobs file with",
      Object.keys(cleanedJobs).length,
      "jobs"
    );
  } catch (error) {
    console.error("Error writing jobs file with atomic write:", error);
    console.error("Error details:", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorCode: (error as any)?.code,
      errorPath: (error as any)?.path,
      jobsCount: Object.keys(jobs).length,
    });

    // Clean up temp file if it exists
    try {
      await fs.unlink(JOBS_FILE_PATH + ".tmp");
      console.log("Cleaned up temp file");
    } catch (cleanupError) {
      console.log("No temp file to clean up");
    }

    // Try fallback: direct write without atomic operation
    try {
      console.log("Attempting fallback direct write...");
      const jsonString = JSON.stringify(cleanedJobs, null, 2);
      await fs.writeFile(JOBS_FILE_PATH, jsonString);
      console.log("Fallback write successful");
      return;
    } catch (fallbackError) {
      console.error("Fallback write also failed:", fallbackError);
      throw new Error(
        `Failed to write jobs file (both atomic and direct methods failed): ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  } finally {
    // Always release the lock
    isWriting = false;
  }
}

export async function storeJobStatus(
  jobId: string,
  jobData: any,
  response?: any // Optional response object for cookie storage
): Promise<void> {
  try {
    console.log(`Storing job status for ${jobId}:`, jobData);

    // Update in-memory fallback first
    inMemoryJobs[jobId] = { ...inMemoryJobs[jobId], ...jobData };
    console.log(`Updated in-memory job status for ${jobId}`);

    if (USE_COOKIE_STORAGE && response) {
      // Use cookie storage when response object is available
      try {
        CookieJobStorage.setJobStatus(jobId, jobData, response);
        console.log(`Successfully stored job status for ${jobId} in cookie`);
        return;
      } catch (cookieError) {
        console.error(
          "Failed to store job status in cookie, falling back to file:",
          cookieError
        );
      }
    }

    // Fallback to file storage
    try {
      const jobs = await readJobsFile();
      console.log(`Current jobs count: ${Object.keys(jobs).length}`);

      jobs[jobId] = { ...jobs[jobId], ...jobData };
      console.log(`Updated jobs object for ${jobId}`);

      await writeJobsFile(jobs);
      console.log(`Successfully stored job status for ${jobId} in file`);
    } catch (fileError) {
      console.error(
        "Failed to store job status in file, using memory fallback:",
        fileError
      );
      // Continue with in-memory storage only
    }
  } catch (error) {
    console.error("Error storing job status:", error);
    console.error("Error details:", {
      jobId,
      jobData,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    // Don't throw error, just log it and continue with in-memory storage
    console.log("Continuing with in-memory storage only");
  }
}

export async function getJobStatus(jobId: string, request?: any): Promise<any> {
  try {
    // Get job from all sources and merge them (latest data wins)
    let cookieJob = null;
    let fileJob = null;
    let memoryJob = null;

    // Get from cookie storage
    if (USE_COOKIE_STORAGE && request) {
      cookieJob = CookieJobStorage.getJobStatus(jobId, request);
      if (cookieJob) {
        console.log("Job found in cookie storage");
      }
    }

    // Get from file storage
    try {
      const jobs = await readJobsFile();
      fileJob = jobs[jobId];
      if (fileJob) {
        console.log("Job found in file storage");
      }
    } catch (fileError) {
      // Don't log as error if file simply doesn't exist yet
      if ((fileError as any)?.code !== "ENOENT") {
        console.error("Error reading from file storage:", fileError);
      }
    }

    // Get from memory storage
    memoryJob = inMemoryJobs[jobId];
    if (memoryJob) {
      console.log("Job found in memory fallback");
    }

    // Merge jobs with priority: memory > file > cookie (most recent updates win)
    const mergedJob = {
      ...cookieJob,
      ...fileJob,
      ...memoryJob,
    };

    // Return the merged job if any source had data
    if (Object.keys(mergedJob).length > 0) {
      console.log(
        `Returning merged job data from ${
          Object.keys(mergedJob).length
        } sources`
      );
      return mergedJob;
    }

    console.log("Job not found in any storage");
    return null;
  } catch (error) {
    console.error("Error getting job status:", error);

    // Fallback to memory only
    const memoryJob = inMemoryJobs[jobId];
    if (memoryJob) {
      console.log("Job found in memory fallback after error");
      return memoryJob;
    }

    return null;
  }
}

// Sync job status back to cookie (called when status is checked)
export async function syncJobToCookie(
  jobId: string,
  response?: any
): Promise<void> {
  if (!USE_COOKIE_STORAGE || !response) {
    return;
  }

  try {
    // Get the latest job data from all sources
    const latestJob = await getJobStatus(jobId);

    if (latestJob) {
      // Update cookie with latest data
      CookieJobStorage.setJobStatus(jobId, latestJob, response);
      console.log(`Synced job ${jobId} status to cookie`);
    }
  } catch (error) {
    console.error(`Error syncing job ${jobId} to cookie:`, error);
  }
}

// Clear all jobs from storage
export async function clearAllJobs(response?: any): Promise<void> {
  try {
    console.log("Clearing all jobs from storage");

    // Clear from memory
    Object.keys(inMemoryJobs).forEach((key) => delete inMemoryJobs[key]);
    console.log("Cleared in-memory jobs");

    if (USE_COOKIE_STORAGE && response) {
      // Clear from cookies
      CookieJobStorage.clearAllJobs(response);
      console.log("Cleared cookie jobs");
    }

    // Clear from file storage
    try {
      await writeJobsFile({});
      console.log("Cleared file jobs");
    } catch (fileError) {
      console.error("Error clearing file jobs:", fileError);
    }

    console.log("Successfully cleared all jobs");
  } catch (error) {
    console.error("Error clearing all jobs:", error);
  }
}

export { inMemoryJobs };
