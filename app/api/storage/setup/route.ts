import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST() {
  try {
    console.log("🚀 Setting up storage bucket only...");

    // Create storage bucket
    console.log("🗄️ Creating storage bucket...");
    try {
      const { data: bucketData, error: bucketError } =
        await supabaseAdmin.storage.createBucket("submission-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (bucketError && !bucketError.message.includes("already exists")) {
        console.log("⚠️ Bucket creation failed:", bucketError);
        return NextResponse.json({
          success: false,
          error: "Bucket creation failed",
          details: bucketError.message,
        });
      } else {
        console.log("✅ Storage bucket created/verified");
      }
    } catch (bucketError) {
      console.log("⚠️ Bucket creation error:", bucketError);
      return NextResponse.json({
        success: false,
        error: "Bucket creation failed",
        details:
          bucketError instanceof Error ? bucketError.message : "Unknown error",
      });
    }

    // Test storage access
    console.log("🔍 Testing storage access...");
    try {
      // Try to list files (this tests bucket access)
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from("submission-images")
        .list("", { limit: 1 });

      if (listError) {
        console.log("⚠️ Storage access test failed:", listError);
        return NextResponse.json({
          success: false,
          error: "Storage access test failed",
          details: listError.message,
        });
      }

      console.log("✅ Storage access verified");
    } catch (testError) {
      console.log("⚠️ Storage test error:", testError);
      return NextResponse.json({
        success: false,
        error: "Storage test failed",
        details:
          testError instanceof Error ? testError.message : "Unknown error",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Storage bucket setup completed successfully",
      method: "storage-only-setup",
      bucket: "submission-images",
      note: "Submissions are handled in frontend localStorage, not database",
    });
  } catch (error) {
    console.error("❌ Storage setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Storage setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
