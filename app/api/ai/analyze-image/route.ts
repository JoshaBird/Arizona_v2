import { NextRequest, NextResponse } from "next/server";
import { SessionJobStorage } from "@/lib/session-job-storage";

// Analyze image with GPT-4 Vision
export const maxDuration = 60; // 1 minute
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

    console.log("Starting image analysis job:", jobId);
    console.log("Image file:", image.name, image.size, "bytes", image.type);

    const openAIApiKey = process.env.OPENAI_API_KEY;

    if (!openAIApiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }

    // Store initial job status
    const jobData = {
      status: "analyzing",
      prompt_preview:
        prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      image_name: image.name,
      image_size: image.size,
      created_at: new Date().toISOString(),
    };

    SessionJobStorage.setJobStatus(jobId, jobData);

    // Run analysis directly (synchronously)
    console.log(`Job ${jobId}: Starting image analysis with GPT-4 Vision`);

    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageDataUrl = `data:${image.type};base64,${imageBase64}`;

    const analysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this image and describe what you see in detail. Focus on the main subjects, objects, colors, composition, and style. This description will be used to generate a new image with the following edit: "${prompt}". Provide a detailed description that captures the essence of the original image.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(50000), // 50 second timeout
      }
    );

    console.log(
      `Job ${jobId}: GPT-4 Vision analysis response status:`,
      analysisResponse.status
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error(`Job ${jobId}: Image analysis error:`, errorText);

      // Update job status to failed
      SessionJobStorage.setJobStatus(jobId, {
        status: "failed",
        error: `Image analysis failed: ${analysisResponse.status} - ${errorText}`,
        completed_at: new Date().toISOString(),
      });

      throw new Error(
        `Image analysis failed: ${analysisResponse.status} - ${errorText}`
      );
    }

    const analysisData = await analysisResponse.json();
    const imageDescription = analysisData.choices[0].message.content;

    console.log(`Job ${jobId}: Image analysis completed successfully`);

    // Create enhanced prompt for generation
    const enhancedPrompt = `Based on this image description: "${imageDescription}". Apply the following edit: "${prompt}". Maintain the original style, composition, and visual elements while incorporating the requested changes. The result should look like the original image but with the specified modifications.`;

    // Update job status with analysis results
    SessionJobStorage.setJobStatus(jobId, {
      status: "analysis_complete",
      image_description: imageDescription,
      enhanced_prompt: enhancedPrompt,
      analysis_completed_at: new Date().toISOString(),
    });

    console.log(`Job ${jobId}: Analysis results stored successfully`);

    // Return success response with analysis results
    return NextResponse.json(
      {
        success: true,
        jobId: jobId,
        status: "analysis_complete",
        message: "Image analysis completed successfully",
        image_description: imageDescription,
        enhanced_prompt: enhancedPrompt,
        prompt_preview: jobData.prompt_preview,
        image_name: jobData.image_name,
        image_size: jobData.image_size,
      },
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-image API route:", error);
    return NextResponse.json(
      {
        error: `Failed to analyze image: ${
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
