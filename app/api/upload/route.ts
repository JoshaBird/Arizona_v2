import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "File and path are required" },
        { status: 400 }
      );
    }

    console.log("Uploading file via API:", { fileName: file.name, path });

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload using service role key (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from("submission-images")
      .upload(path, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("submission-images").getPublicUrl(data.path);

    console.log("File uploaded successfully:", publicUrl);

    return NextResponse.json({
      success: true,
      publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
