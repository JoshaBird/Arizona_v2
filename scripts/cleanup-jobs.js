const fs = require("fs");
const path = require("path");

const JOBS_FILE_PATH = path.join(__dirname, "..", "data", "image-jobs.json");

async function cleanupJobsFile() {
  try {
    console.log("Reading jobs file...");
    const data = await fs.promises.readFile(JOBS_FILE_PATH, "utf-8");
    const jobs = JSON.parse(data);

    console.log(`Found ${Object.keys(jobs).length} jobs`);

    // Clean up each job
    const cleanedJobs = {};
    for (const [jobId, job] of Object.entries(jobs)) {
      cleanedJobs[jobId] = {
        status: job.status,
        prompt_preview: job.prompt
          ? job.prompt.substring(0, 100) +
            (job.prompt.length > 100 ? "..." : "")
          : undefined,
        image_name: job.image_name,
        image_size: job.image_size,
        created_at: job.created_at,
        result_url: job.result_url,
        completed_at: job.completed_at,
        error: job.error ? job.error.substring(0, 200) : undefined,
      };
    }

    // Write back the cleaned file
    await fs.promises.writeFile(
      JOBS_FILE_PATH,
      JSON.stringify(cleanedJobs, null, 2)
    );

    console.log("✅ Jobs file cleaned up successfully!");
    console.log(`Original size: ${data.length} characters`);
    console.log(
      `New size: ${JSON.stringify(cleanedJobs, null, 2).length} characters`
    );
  } catch (error) {
    console.error("Error cleaning up jobs file:", error);
  }
}

cleanupJobsFile();
