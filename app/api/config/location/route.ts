import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LocationConfig {
  state: string;
  city: string;
  description: string;
}

const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  Florida: {
    state: "Florida",
    city: "Jacksonville",
    description:
      "Transforming outdoor spaces across Jacksonville, Florida with expert landscaping, fencing, painting, pressure washing, and gutter cleaning services.",
  },
  Mississippi: {
    state: "Mississippi",
    city: "Jackson",
    description:
      "Transforming outdoor spaces across Jackson, Mississippi with expert landscaping, fencing, painting, pressure washing, and gutter cleaning services.",
  },
  Arizona: {
    state: "Arizona",
    city: "Phoenix",
    description:
      "Transforming outdoor spaces across Phoenix, Arizona with expert landscaping, fencing, painting, pressure washing, and gutter cleaning services.",
  },
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  try {
    const targetState = process.env.TARGET_STATE || "Florida";

    console.log(`Getting location config for state: ${targetState}`);

    const locationConfig =
      LOCATION_CONFIGS[targetState] || LOCATION_CONFIGS.Florida;

    console.log(`Location config:`, locationConfig);

    return NextResponse.json(locationConfig, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error fetching location config:", error);
    return NextResponse.json(
      { error: "Failed to fetch location config" },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
