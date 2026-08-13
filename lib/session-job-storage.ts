// Session storage for job status (replaces cookie storage to avoid size limits)

// In-memory storage for server-side (fallback)
const inMemoryJobs: Record<string, any> = {};

export class SessionJobStorage {
  private static readonly STORAGE_KEY = "image_jobs";

  // Store job status in session storage (client-side)
  static setJobStatus(jobId: string, jobData: any): void {
    try {
      if (typeof window !== "undefined") {
        // Client-side: use session storage
        const existingJobs = this.getAllJobs();

        // Update the specific job
        existingJobs[jobId] = {
          ...existingJobs[jobId],
          ...jobData,
          updated_at: new Date().toISOString(),
        };

        // Clean up old jobs to prevent storage from growing too large
        const cleanedJobs = this.cleanupOldJobs(existingJobs);

        // Store in session storage
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedJobs));
        console.log(`Stored job ${jobId} status in session storage`);
      } else {
        // Server-side: use in-memory storage
        inMemoryJobs[jobId] = { ...inMemoryJobs[jobId], ...jobData };
        console.log(`Stored job ${jobId} status in memory (server-side)`);
      }
    } catch (error) {
      console.error(`Error storing job ${jobId} in session storage:`, error);
      // Fallback to in-memory storage
      inMemoryJobs[jobId] = { ...inMemoryJobs[jobId], ...jobData };
    }
  }

  // Get job status from session storage
  static getJobStatus(jobId: string): any {
    try {
      if (typeof window !== "undefined") {
        // Client-side: use session storage
        const jobs = this.getAllJobs();
        const job = jobs[jobId];

        if (job) {
          console.log(`Retrieved job ${jobId} from session storage`);
          return job;
        }
      } else {
        // Server-side: use in-memory storage
        const job = inMemoryJobs[jobId];
        if (job) {
          console.log(`Retrieved job ${jobId} from memory (server-side)`);
          return job;
        }
      }

      console.log(`Job ${jobId} not found in session storage`);
      return null;
    } catch (error) {
      console.error(`Error getting job ${jobId} from session storage:`, error);
      // Fallback to in-memory storage
      const job = inMemoryJobs[jobId];
      if (job) {
        console.log(`Retrieved job ${jobId} from memory fallback`);
        return job;
      }
      return null;
    }
  }

  // Get all jobs from session storage
  private static getAllJobs(): Record<string, any> {
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const jobs = JSON.parse(stored);
          console.log(
            `Retrieved ${Object.keys(jobs).length} jobs from session storage`
          );
          return jobs;
        }
      }
      return {};
    } catch (error) {
      console.error("Error parsing session storage jobs:", error);
      return {};
    }
  }

  // Clean up old jobs to prevent storage from growing too large
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

    // Keep only the most recent jobs (session storage can handle more than cookies)
    const maxJobs = 50;
    const recentJobs = jobEntries.slice(0, maxJobs);

    if (jobEntries.length > recentJobs.length) {
      console.log(
        `Cleaned up ${
          jobEntries.length - recentJobs.length
        } old jobs from session storage`
      );
    }

    return Object.fromEntries(recentJobs);
  }

  // Clear all jobs from session storage
  static clearAllJobs(): void {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(this.STORAGE_KEY);
        console.log("Cleared all jobs from session storage");
      }

      // Also clear in-memory storage
      Object.keys(inMemoryJobs).forEach((key) => delete inMemoryJobs[key]);
      console.log("Cleared all jobs from memory storage");
    } catch (error) {
      console.error("Error clearing session storage jobs:", error);
    }
  }

  // Get storage size for monitoring
  static getStorageSize(): number {
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        return stored ? stored.length : 0;
      }
      return JSON.stringify(inMemoryJobs).length;
    } catch (error) {
      console.error("Error getting storage size:", error);
      return 0;
    }
  }

  // Get job count
  static getJobCount(): number {
    try {
      if (typeof window !== "undefined") {
        const jobs = this.getAllJobs();
        return Object.keys(jobs).length;
      }
      return Object.keys(inMemoryJobs).length;
    } catch (error) {
      console.error("Error getting job count:", error);
      return 0;
    }
  }
}

// Helper functions for API routes
export function setJobStatusInSession(jobId: string, jobData: any): void {
  SessionJobStorage.setJobStatus(jobId, jobData);
}

export function getJobStatusFromSession(jobId: string): any {
  return SessionJobStorage.getJobStatus(jobId);
}

export function clearAllJobsFromSession(): void {
  SessionJobStorage.clearAllJobs();
}
