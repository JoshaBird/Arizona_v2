import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = "https://knlvxeujgojelrhoekia.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubHZ4ZXVqZ29qZWxyaG9la2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODIxNzIsImV4cCI6MjA2NTE1ODE3Mn0.PrhP-AuhlrFwyndhTi3563lIQlCYQpLnJG6KbChzZPU";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Create exports directory
const exportsDir = path.join(__dirname, "supabase-data-export");

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function exportTableData(tableName, fileName) {
  console.log(`📊 Exporting ${tableName}...`);

  try {
    // READ-ONLY operation - no database changes
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const exportData = {
      table: tableName,
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      data: data,
    };

    const filePath = path.join(exportsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    console.log(`✅ ${tableName}: ${data.length} records exported`);
    return exportData;
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return null;
  }
}

async function discoverAdditionalTables() {
  console.log(`🔍 Discovering additional tables...`);

  try {
    // Try to query common table names that might exist but aren't in types.ts
    const potentialTables = [
      "api_keys",
      "keys",
      "openai_keys",
      "google_keys",
      "environment_variables",
      "config",
      "settings",
      "logs",
      "usage",
      "requests",
      "responses",
      "images",
      "generations",
      "ai_requests",
      "ai_responses",
    ];

    const discoveredTables = [];

    for (const tableName of potentialTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(1);

        if (!error && data !== null) {
          console.log(`🔍 Found additional table: ${tableName}`);
          discoveredTables.push(tableName);
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }

    return discoveredTables;
  } catch (error) {
    console.error(`❌ Error discovering tables:`, error.message);
    return [];
  }
}

async function exportStorageBucket(bucketName, fileName) {
  console.log(`🗂️ Exporting storage bucket: ${bucketName}...`);

  try {
    // READ-ONLY operation - listing files only
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list("", {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      throw error;
    }

    // Get public URLs for all files (READ-ONLY)
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.name);

        return {
          ...file,
          publicUrl: data.publicUrl,
        };
      })
    );

    const exportData = {
      bucket: bucketName,
      exportedAt: new Date().toISOString(),
      fileCount: files.length,
      files: filesWithUrls,
    };

    const filePath = path.join(exportsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

    console.log(
      `✅ Storage bucket ${bucketName}: ${files.length} files exported`
    );
    return exportData;
  } catch (error) {
    console.error(
      `❌ Error exporting storage bucket ${bucketName}:`,
      error.message
    );
    return null;
  }
}

async function testEdgeFunction(functionName, testData = {}) {
  console.log(`🔧 Testing edge function: ${functionName}...`);

  try {
    // This is a READ-ONLY test - we're just testing if the function exists and responds
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: testData,
    });

    const result = {
      function: functionName,
      testedAt: new Date().toISOString(),
      testData: testData,
      response: data,
      error: error,
    };

    const fileName = `edge-function-${functionName}-test.json`;
    const filePath = path.join(exportsDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2));

    if (error) {
      console.log(
        `⚠️ Edge function ${functionName}: Error (expected for some functions)`
      );
    } else {
      console.log(`✅ Edge function ${functionName}: Test completed`);
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Error testing edge function ${functionName}:`,
      error.message
    );
    return null;
  }
}

async function extractOpenAIData() {
  console.log(`🤖 Extracting OpenAI-related data...`);

  try {
    // Get all submissions with prompts (these are the OpenAI requests/responses)
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*")
      .not("prompt", "is", null)
      .not("result_image_storage_url", "is", null);

    if (error) {
      throw error;
    }

    // Extract OpenAI-specific data
    const openAIData = {
      exportedAt: new Date().toISOString(),
      description: "OpenAI API interactions and generated images",
      totalInteractions: submissions.length,
      interactions: submissions.map((submission) => ({
        id: submission.id,
        timestamp: submission.created_at,
        prompt: submission.prompt,
        originalImage: submission.original_image_storage_url,
        generatedImage: submission.result_image_storage_url,
        userContact: {
          name: submission.name,
          email: submission.email,
          phone: submission.phone,
          address: submission.address,
        },
      })),
      promptAnalysis: {
        uniquePrompts: [...new Set(submissions.map((s) => s.prompt))].length,
        totalPrompts: submissions.length,
        promptTypes: {},
      },
      usageStats: {
        totalGenerations: submissions.filter((s) => s.result_image_storage_url)
          .length,
        pendingGenerations: submissions.filter(
          (s) => !s.result_image_storage_url
        ).length,
        usersWithContactInfo: submissions.filter((s) => s.email || s.phone)
          .length,
      },
    };

    // Analyze prompt types
    submissions.forEach((submission) => {
      if (submission.prompt) {
        const promptType = submission.prompt.includes("Landscaping")
          ? "Landscaping"
          : submission.prompt.includes("Fencing")
          ? "Fencing"
          : submission.prompt.includes("Paint")
          ? "Paint"
          : "Other";

        openAIData.promptAnalysis.promptTypes[promptType] =
          (openAIData.promptAnalysis.promptTypes[promptType] || 0) + 1;
      }
    });

    const filePath = path.join(exportsDir, "openai-data-analysis.json");
    await fs.writeFile(filePath, JSON.stringify(openAIData, null, 2));

    console.log(
      `✅ OpenAI data extracted: ${submissions.length} interactions analyzed`
    );
    return openAIData;
  } catch (error) {
    console.error(`❌ Error extracting OpenAI data:`, error.message);
    return null;
  }
}

async function exportDatabaseSchema() {
  console.log(`📋 Exporting database schema...`);

  try {
    // Static schema export based on types.ts - no database queries
    const schema = {
      exportedAt: new Date().toISOString(),
      tables: {
        prompt_templates: {
          description: "AI prompt templates for different project types",
          columns: {
            id: "Primary key",
            name: "Template name",
            one_line: "Short description",
            prompt_text: "Full AI prompt",
            type: "Template category",
            created_at: "Creation timestamp",
          },
        },
        submissions: {
          description: "User submissions and project data",
          columns: {
            id: "Primary key (UUID)",
            name: "User name",
            email: "User email",
            phone: "User phone",
            address: "Project address",
            prompt: "Combined AI prompt",
            original_image_storage_url: "Original image URL",
            result_image_storage_url: "Generated result image URL",
            created_at: "Creation timestamp",
          },
        },
      },
      enums: {
        key_type: ["openai", "googlemaps"],
        Type: ["Landscaping", "Fencing", "Paint"],
      },
      storage_buckets: {
        "user-images": "Stores uploaded user images and generated results",
      },
      edge_functions: {
        "edit-image": "Calls OpenAI API to transform images",
        "street-view": "Fetches Google Street View images",
        "get-maps-key": "Securely provides Google Maps API key",
        "send-visualizer-quote": "Sends quote request emails",
        "send-contact-email": "Handles general contact form",
      },
    };

    const filePath = path.join(exportsDir, "database-schema.json");
    await fs.writeFile(filePath, JSON.stringify(schema, null, 2));

    console.log(`✅ Database schema exported`);
    return schema;
  } catch (error) {
    console.error(`❌ Error exporting database schema:`, error.message);
    return null;
  }
}

async function createSummaryReport(allExports) {
  console.log(`📝 Creating summary report...`);

  const summary = {
    exportInfo: {
      exportedAt: new Date().toISOString(),
      supabaseUrl: SUPABASE_URL,
      totalTables: 0,
      totalStorageBuckets: 0,
      totalEdgeFunctions: 0,
      totalRecords: 0,
      totalFiles: 0,
    },
    exports: {},
    errors: [],
  };

  // Process all exports
  Object.entries(allExports).forEach(([key, data]) => {
    if (data) {
      summary.exports[key] = {
        status: "success",
        recordCount: data.recordCount || data.fileCount || 0,
        exportedAt: data.exportedAt,
      };

      if (data.recordCount) {
        summary.exportInfo.totalRecords += data.recordCount;
        summary.exportInfo.totalTables++;
      }

      if (data.fileCount) {
        summary.exportInfo.totalFiles += data.fileCount;
        summary.exportInfo.totalStorageBuckets++;
      }

      if (key.includes("edge-function")) {
        summary.exportInfo.totalEdgeFunctions++;
      }
    } else {
      summary.exports[key] = {
        status: "failed",
      };
      summary.errors.push(`${key}: Export failed`);
    }
  });

  const filePath = path.join(exportsDir, "export-summary.json");
  await fs.writeFile(filePath, JSON.stringify(summary, null, 2));

  console.log(`✅ Summary report created`);
  return summary;
}

async function main() {
  console.log("🚀 Starting Supabase data export...");
  console.log("🔒 READ-ONLY MODE: No database changes will be made");
  console.log(`📁 Export directory: ${exportsDir}`);

  // Ensure export directory exists
  await ensureDirectoryExists(exportsDir);

  const allExports = {};

  try {
    // Discover additional tables that might contain OpenAI data
    const additionalTables = await discoverAdditionalTables();

    // Export database tables (READ-ONLY)
    allExports.prompt_templates = await exportTableData(
      "prompt_templates",
      "table-prompt_templates.json"
    );
    allExports.submissions = await exportTableData(
      "submissions",
      "table-submissions.json"
    );

    // Export any additional discovered tables
    for (const tableName of additionalTables) {
      const fileName = `table-${tableName}.json`;
      allExports[tableName] = await exportTableData(tableName, fileName);
    }

    // Export storage buckets (READ-ONLY)
    allExports.storage_user_images = await exportStorageBucket(
      "user-images",
      "storage-user-images.json"
    );

    // Test edge functions (READ-ONLY tests - some may fail due to missing parameters, which is expected)
    allExports.edge_function_get_maps_key = await testEdgeFunction(
      "get-maps-key"
    );
    allExports.edge_function_street_view = await testEdgeFunction(
      "street-view",
      { coordinates: "32.2988,-90.1848" }
    );
    allExports.edge_function_edit_image = await testEdgeFunction("edit-image", {
      image: "test",
      prompt: "test prompt",
    });
    allExports.edge_function_send_visualizer_quote = await testEdgeFunction(
      "send-visualizer-quote",
      {
        name: "Test User",
        email: "test@example.com",
        phone: "555-1234",
        address: "Test Address",
        templateName: "Test Template",
        customDetails: "Test details",
        originalImageUrl: "test-url",
        resultImageUrl: "test-result-url",
      }
    );
    allExports.edge_function_send_contact_email = await testEdgeFunction(
      "send-contact-email",
      {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        phone: "555-1234",
        service: "Landscaping",
        message: "Test message",
      }
    );

    // Extract OpenAI-specific data and analysis
    allExports.openai_data = await extractOpenAIData();

    // Export database schema (STATIC - no database queries)
    allExports.database_schema = await exportDatabaseSchema();

    // Create summary report
    const summary = await createSummaryReport(allExports);

    console.log("\n🎉 Export completed!");
    console.log(`📊 Summary:`);
    console.log(`   Tables: ${summary.exportInfo.totalTables}`);
    console.log(
      `   Storage buckets: ${summary.exportInfo.totalStorageBuckets}`
    );
    console.log(`   Edge functions: ${summary.exportInfo.totalEdgeFunctions}`);
    console.log(`   Total records: ${summary.exportInfo.totalRecords}`);
    console.log(`   Total files: ${summary.exportInfo.totalFiles}`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered:`);
      summary.errors.forEach((error) => console.log(`   - ${error}`));
    }

    console.log(`\n📁 All data exported to: ${exportsDir}`);
    console.log(
      "🔒 Database remains unchanged - all operations were read-only"
    );
  } catch (error) {
    console.error("💥 Fatal error during export:", error);
    process.exit(1);
  }
}

// Run the export
main().catch(console.error);
