"use client";

import { useEffect } from "react";

export default function JobCleanup() {
  useEffect(() => {
    // Clear all jobs when the application starts
    const clearJobs = async () => {
      try {
        console.log("Clearing all jobs on application start...");
        const response = await fetch("/api/ai/clear-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          console.log("✅ All jobs cleared successfully");
        } else {
          console.error("❌ Failed to clear jobs:", response.statusText);
        }
      } catch (error) {
        console.error("❌ Error clearing jobs:", error);
      }
    };

    clearJobs();
  }, []); // Run only once on mount

  // This component doesn't render anything
  return null;
}
