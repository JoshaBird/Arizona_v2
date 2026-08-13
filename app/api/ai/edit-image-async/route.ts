import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { storeJobStatus } from "@/lib/job-storage";
import OpenAI from "openai";
import sharp from "sharp";

// Configure maximum execution time for Vercel
export const maxDuration = 300; // 5 minutes
export const runtime = "nodejs"; // Use Node.js runtime for better performance
// export const preferredRegion = "iad1"; // US East - optimal for US clients

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
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const prompt = formData.get("prompt") as string;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: "Missing image or prompt" },
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("Starting async image edit job:", jobId);
    console.log("Prompt:", prompt);
    console.log("Image file:", image.name, image.size, "bytes", image.type);

    // Store job in JSON file with pending status (optimized for size)
    const jobData = {
      status: "pending",
      prompt_preview:
        prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""), // Truncated prompt
      image_name: image.name,
      image_size: image.size,
      created_at: new Date().toISOString(),
    };

    // Store job status in cookie and memory
    const response = NextResponse.json(
      {
        success: true,
        jobId: jobId,
        message: "Image processing started. Use the job ID to check status.",
      },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    await storeJobStatus(jobId, jobData, response);

    // Update status to processing immediately and store in response
    console.log(`Job ${jobId}: Updating status to processing...`);
    const processingJobData = { status: "processing" };
    await storeJobStatus(jobId, processingJobData, response);
    console.log(`Job ${jobId}: Status updated to processing`);

    // Start processing in background (fire and forget)
    console.log(`Job ${jobId}: Starting background processing...`);

    // Use a more reliable approach for Vercel
    (async () => {
      try {
        console.log(`Job ${jobId}: Background process starting...`);
        console.log(`Job ${jobId}: About to call processImageAsync...`);

        await processImageAsync(jobId, image, prompt);

        console.log(`Job ${jobId}: Background process completed successfully`);
      } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        console.error(
          `Job ${jobId} error stack:`,
          error instanceof Error ? error.stack : "No stack trace"
        );

        // Update job status to failed (minimal data)
        await storeJobStatus(jobId, {
          status: "failed",
          error:
            error instanceof Error
              ? error.message.substring(0, 200)
              : "Unknown error", // Truncated error
          completed_at: new Date().toISOString(),
        });
      }
    })();

    // Return response with cookie (already contains processing status)
    return response;
  } catch (error) {
    console.error("Error in edit-image-async API route:", error);
    return NextResponse.json(
      {
        error: `Failed to start image processing: ${
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

async function processImageAsync(jobId: string, image: File, prompt: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Status is already set to processing in the main function
    console.log(`Job ${jobId}: === PROCESS IMAGE ASYNC STARTED ===`);
    console.log(
      `Job ${jobId}: Sending image and prompt directly to DALL-E 2 edit API using OpenAI SDK`
    );
    console.log(`Job ${jobId}: Prompt: "${prompt}"`);
    console.log(
      `Job ${jobId}: Image: ${image.name} (${image.size} bytes, ${image.type})`
    );

    // Truncate prompt to 1000 characters max (DALL-E 2 limit)
    const truncatedPrompt =
      prompt.length > 1000 ? prompt.substring(0, 1000) : prompt;
    if (prompt.length > 1000) {
      console.log(
        `Job ${jobId}: Prompt truncated from ${prompt.length} to ${truncatedPrompt.length} characters`
      );
    }

    // Validate image size (must be less than 4MB)
    if (image.size > 4 * 1024 * 1024) {
      throw new Error("Image must be less than 4 MB");
    }

    // Convert image to PNG and resize to 1024x1024 using Sharp
    const imageBuffer = await image.arrayBuffer();
    const processedImageBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(1024, 1024, { fit: "cover" })
      .ensureAlpha() // Ensure alpha channel for RGBA format
      .png()
      .toBuffer();

    const processedImage = new File(
      [new Uint8Array(processedImageBuffer)],
      "image.png",
      { type: "image/png" }
    );
    console.log(
      `Job ${jobId}: Processed image: ${processedImage.size} bytes, ${processedImage.type}`
    );

    // Create a proper PNG mask (1024x1024 white image) using Sharp
    const maskBuffer = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4, // RGBA format
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background with alpha
      },
    })
      .png()
      .toBuffer();

    const maskFile = new File([new Uint8Array(maskBuffer)], "mask.png", {
      type: "image/png",
    });
    console.log(
      `Job ${jobId}: Created mask: ${maskFile.size} bytes, ${maskFile.type}`
    );

    // Use OpenAI SDK for image editing - pass File directly with mask
    const response = await openai.images.edit({
      model: "dall-e-2", // Use DALL-E 2 for image editing
      image: processedImage, // Use processed PNG image
      mask: maskFile, // Mask to specify which parts to edit
      prompt: truncatedPrompt,
      size: "1024x1024", // DALL-E 2 supported sizes: 256x256, 512x512, 1024x1024
      n: 1,
    });

    console.log(`Job ${jobId}: OpenAI SDK response received`);

    if (response.data && response.data[0]) {
      const imageData = response.data[0];
      let imageUrl: string;

      // DALL-E 2 returns URLs
      if (imageData.url) {
        // Download the image from OpenAI URL and upload to Supabase
        try {
          const imageResponse = await fetch(imageData.url);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image: ${imageResponse.status}`
            );
          }

          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // Upload to Supabase storage
          const timestamp = Date.now();
          const fileName = `result_${jobId}_${timestamp}.png`;

          const supabaseAdmin = getSupabaseAdmin();
          const { data: uploadData, error: uploadError } =
            await supabaseAdmin.storage
              .from("submission-images")
              .upload(fileName, imageBuffer, {
                cacheControl: "86400", // 24 hours cache
                upsert: true,
                contentType: "image/png",
              });

          if (uploadError) {
            console.error(`Job ${jobId}: Storage upload error:`, uploadError);
            throw new Error(
              `Failed to upload result image: ${uploadError.message}`
            );
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabaseAdmin.storage
            .from("submission-images")
            .getPublicUrl(uploadData.path);

          console.log(
            `Job ${jobId}: Result image uploaded to Supabase:`,
            publicUrl
          );
          imageUrl = publicUrl;
        } catch (uploadError) {
          console.error(
            `Job ${jobId}: Failed to upload result image to Supabase:`,
            uploadError
          );
          // Fallback to original OpenAI URL if upload fails
          imageUrl = imageData.url;
        }
      } else {
        throw new Error("No image URL found in DALL-E 2 response");
      }

      // Update job with success (only store essential data)
      console.log(`Job ${jobId}: === UPDATING TO COMPLETED STATUS ===`);
      console.log(`Job ${jobId}: Updating status to completed...`);
      await storeJobStatus(jobId, {
        status: "completed",
        result_url: imageUrl,
        completed_at: new Date().toISOString(),
      });
      console.log(`Job ${jobId}: Status updated to completed`);

      console.log(`Job ${jobId}: === COMPLETED SUCCESSFULLY ===`);
    } else {
      throw new Error("Invalid response format from OpenAI API");
    }
  } catch (error) {
    console.error(`Job ${jobId}: === PROCESSING FAILED ===`);
    console.error(`Job ${jobId}: Processing failed:`, error);
    console.error(
      `Job ${jobId}: Error stack:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Update job with failure (minimal data)
    console.log(`Job ${jobId}: Updating status to failed...`);
    await storeJobStatus(jobId, {
      status: "failed",
      error:
        error instanceof Error
          ? error.message.substring(0, 200)
          : "Unknown error", // Truncated error
      completed_at: new Date().toISOString(),
    });
    console.log(`Job ${jobId}: Status updated to failed`);

    throw error;
  }
}
