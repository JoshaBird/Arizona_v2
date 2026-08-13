import { NextRequest, NextResponse } from "next/server";
import { SessionJobStorage } from "@/lib/session-job-storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Generate image with DALL-E 3
export const maxDuration = 180; // 3 minutes
export const runtime = "nodejs";

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
    const {
      jobId,
      image_description,
      enhanced_prompt,
      prompt_preview,
      image_name,
      image_size,
    } = await request.json();

    if (!jobId || !image_description || !enhanced_prompt) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters (jobId, image_description, enhanced_prompt)",
        },
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting image generation for job: ${jobId}`);

    const openAIApiKey = process.env.OPENAI_API_KEY;

    // Update status to generating
    SessionJobStorage.setJobStatus(jobId, {
      status: "generating",
      generation_started_at: new Date().toISOString(),
    });

    console.log(`Job ${jobId}: Starting image generation with DALL-E 3`);

    // Generate the edited image using DALL-E 3
    const requestBody = {
      model: "dall-e-3",
      prompt: enhanced_prompt,
      size: "1792x1024",
      quality: "standard",
      n: 1,
    };

    const generationResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(180000), // 3 minute timeout
      }
    );

    console.log(
      `Job ${jobId}: DALL-E 3 generation response status:`,
      generationResponse.status
    );

    if (!generationResponse.ok) {
      const errorText = await generationResponse.text();
      console.error(`Job ${jobId}: DALL-E 3 generation error:`, errorText);

      // Update job status to failed
      SessionJobStorage.setJobStatus(jobId, {
        status: "failed",
        error: `Image generation failed: ${generationResponse.status} - ${errorText}`,
        completed_at: new Date().toISOString(),
      });

      throw new Error(
        `Image generation failed: ${generationResponse.status} - ${errorText}`
      );
    }

    const data = await generationResponse.json();
    console.log(`Job ${jobId}: DALL-E 3 generation response received`);

    if (data.data && data.data[0]) {
      const imageData = data.data[0];
      let imageUrl: string;

      if (imageData.url) {
        // Download the image from OpenAI URL and upload to Supabase
        try {
          console.log(`Job ${jobId}: Downloading generated image...`);
          const imageResponse = await fetch(imageData.url);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image: ${imageResponse.status}`
            );
          }

          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          console.log(
            `Job ${jobId}: Image downloaded, uploading to Supabase...`
          );

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
        throw new Error("No image URL found in OpenAI response");
      }

      // Update job with success
      SessionJobStorage.setJobStatus(jobId, {
        status: "completed",
        result_url: imageUrl,
        completed_at: new Date().toISOString(),
      });

      console.log(`Job ${jobId}: Image generation completed successfully`);

      // Return success response with image URL
      return NextResponse.json(
        {
          success: true,
          jobId: jobId,
          status: "completed",
          imageUrl: imageUrl,
          message: "Image generation completed successfully",
        },
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      throw new Error("Invalid response format from OpenAI API");
    }
  } catch (error) {
    console.error("Error in generate-image API route:", error);
    return NextResponse.json(
      {
        error: `Failed to generate image: ${
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
