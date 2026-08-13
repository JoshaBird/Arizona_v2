import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import fs from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // single pass (Pass 2 commented out)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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
    const userPrompt = (formData.get("prompt") as string) || "";

    if (!image || !userPrompt) {
      return NextResponse.json(
        { error: "Missing image or prompt" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("🧠 Starting Single-Pass Layout Generation…");
    console.log("Prompt:", userPrompt);

    // ────────────────────────────────
    // STEP 1: Normalize base image
    // ────────────────────────────────
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const processedImageBuffer = await sharp(imageBuffer)
      .rotate()
      .resize({
        width: 1536,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .png()
      .toBuffer();

    const { width: imageWidth, height: imageHeight } = await sharp(
      processedImageBuffer
    ).metadata();
    if (!imageWidth || !imageHeight) {
      throw new Error("Unable to determine image dimensions");
    }

    const tmpInput = `/tmp/input_${Date.now()}.png`;
    await fs.promises.writeFile(tmpInput, processedImageBuffer);
    const baseImageFile = await toFile(
      fs.createReadStream(tmpInput),
      "image.png",
      {
        type: "image/png",
      }
    );
    console.log("✅ Image processed and written to", tmpInput);

    // ────────────────────────────────
    // STEP 2: Auto brightness mask
    // ────────────────────────────────
    const stats = await sharp(processedImageBuffer).stats();
    const avgBrightness = stats.channels[0].mean / 255;
    let groundTopRatio = 0.625;
    if (avgBrightness < 0.45) groundTopRatio = 0.566;
    else if (avgBrightness > 0.7) groundTopRatio = 0.674;
    const groundTop = Math.round(imageHeight * groundTopRatio);
    console.log(`📊 Adaptive yard mask boundary y=${groundTop}`);

    const maskBuffer = await sharp({
      create: {
        width: imageWidth,
        height: imageHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: imageWidth,
              height: imageHeight - groundTop,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          },
          top: groundTop,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const tmpMask = `/tmp/mask_${Date.now()}.png`;
    await fs.promises.writeFile(tmpMask, maskBuffer);
    const maskFile = await toFile(fs.createReadStream(tmpMask), "mask.png", {
      type: "image/png",
    });
    console.log("✅ Smart mask ready");

    // ────────────────────────────────
    // STEP 3: PASS 1 — Layout generation
    // ────────────────────────────────
    const layoutPrompt = `
Keep the house, roof, windows, and driveway unchanged.
Preserve all existing mature trees exactly as they appear; do not remove, replace, relocate, or substantially alter them.
Redesign only the yard and planting area with: ${userPrompt}

Focus on **spatial composition** — correct plant placement, grouping, and balance.
Keep lighting neutral and structural; this pass defines layout, not final color.
`;

    console.log("🎨 Pass 1: Layout generation");
    const layoutResult = await openai.images.edit({
      model: "gpt-image-1",
      image: baseImageFile,
      mask: maskFile,
      prompt: layoutPrompt,
      size: "1536x1024",
      quality: "high",
      input_fidelity: "high",
      n: 1,
    });

    const layoutData = layoutResult.data?.[0];
    if (!layoutData?.b64_json) throw new Error("Layout pass returned no image");
    const layoutBuffer = Buffer.from(layoutData.b64_json, "base64");
    console.log("✅ Pass 1 done — layout generated");

    // ────────────────────────────────
    // STEP 4: PASS 2 — Realism & relighting (COMMENTED OUT)
    // ────────────────────────────────
    // const tmpLayout = `/tmp/layout_${Date.now()}.png`;
    // await fs.promises.writeFile(tmpLayout, layoutBuffer);
    // const layoutImageFile = await toFile(
    //   fs.createReadStream(tmpLayout),
    //   "layout.png",
    //   {
    //     type: "image/png",
    //   }
    // );
    //
    // const realismPrompt = `
    // Enhance realism, lighting, textures, and shadow integration.
    // Maintain identical camera perspective, colors of the house, and sky tone.
    // Ensure desert plants appear naturally lit under same sunlight direction.
    // Subtle warm tone grading is fine, but avoid over-saturation.
    // `;
    //
    // console.log("💡 Pass 2: Realism & relighting refinement");
    // const realismResult = await openai.images.edit({
    //   model: "gpt-image-1",
    //   image: [layoutImageFile, maskFile],
    //   prompt: realismPrompt,
    //   size: "1024x1024",
    //   n: 1,
    // });
    //
    // const realismData = realismResult.data?.[0];
    // if (!realismData?.b64_json)
    //   throw new Error("Realism pass returned no image");
    // const realismBuffer = Buffer.from(realismData.b64_json, "base64");
    // console.log("✅ Pass 2 done — realism enhanced");

    // ────────────────────────────────
    // STEP 4: Upload final image
    // ────────────────────────────────
    const timestamp = Date.now();
    const fileName = `result_${timestamp}.png`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("submission-images")
      .upload(fileName, layoutBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("submission-images")
      .getPublicUrl(uploadData.path);

    console.log("☁️ Final image uploaded:", publicUrl);

    return NextResponse.json(
      { success: true, imageUrl: publicUrl },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("💥 Error in two-pass edit-image route:", error);
    return NextResponse.json(
      { error: `Failed to edit image: ${error?.message || "Unknown error"}` },
      { status: 500, headers: corsHeaders }
    );
  }
}
