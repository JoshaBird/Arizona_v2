export interface LocationConfig {
  state: string;
  city: string;
  description: string;
}

export const LOCATION_CONFIGS: Record<string, LocationConfig> = {
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

export function getLocationConfig(targetState?: string): LocationConfig {
  // Try to get the state from various sources, with fallbacks
  const state =
    targetState ||
    process.env.TARGET_STATE ||
    process.env.NEXT_PUBLIC_TARGET_STATE ||
    "Florida";

  // Debug logging (remove in production)
  console.log("Location Config Debug:", {
    targetState,
    processEnvTargetState: process.env.TARGET_STATE,
    processEnvNextPublicTargetState: process.env.NEXT_PUBLIC_TARGET_STATE,
    finalState: state,
    config: LOCATION_CONFIGS[state],
  });

  // Ensure we always return a valid config
  return LOCATION_CONFIGS[state] || LOCATION_CONFIGS.Florida;
}
