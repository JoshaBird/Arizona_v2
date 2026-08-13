import { NextRequest, NextResponse } from "next/server";
import promptTemplatesData from "../../../../data/prompt-templates.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PromptTemplate {
  id: number;
  created_at: string;
  name: string;
  one_line: string;
  prompt_text: string;
  type: string;
  city: string;
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  try {
    const targetState = process.env.TARGET_STATE || "Mississippi";

    console.log(`Filtering prompt templates for state: ${targetState}`);

    // Filter templates by the target state/city and hide backyard options.
    const filteredTemplates = promptTemplatesData.data.filter(
      (template: PromptTemplate) =>
        template.city === targetState &&
        !/\bback\s*yard\b/i.test(template.name)
    );

    console.log(
      `Found ${filteredTemplates.length} templates for ${targetState}`
    );

    return NextResponse.json(filteredTemplates, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error fetching prompt templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt templates" },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
