// Helper functions for two-step image processing

export async function processImageTwoStep(
  imageFile: File,
  prompt: string,
  onProgress?: (step: string, status: string) => void
): Promise<string> {
  try {
    console.log("Starting DALL-E 2 direct image editing...");
    onProgress?.("editing", "starting");

    // Create FormData for DALL-E 2 direct image editing
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("prompt", prompt);

    console.log("Sending image and prompt directly to DALL-E 2 edit API");
    console.log("Prompt:", prompt);
    console.log(
      "Image:",
      imageFile.name,
      "(" + imageFile.size + " bytes, " + imageFile.type + ")"
    );

    onProgress?.("editing", "processing");

    // Call the synchronous edit endpoint directly
    const response = await fetch("/api/ai/edit-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Image editing failed");
    }

    const result = await response.json();

    if (!result.success || !result.imageUrl) {
      throw new Error("Invalid response from image editing API");
    }

    console.log("Image editing completed successfully");
    onProgress?.("editing", "complete");
    console.log("Result image URL:", result.imageUrl);
    return result.imageUrl;
  } catch (error) {
    console.error("Image editing failed:", error);
    onProgress?.(
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

// Helper function to get status message
export function getStatusMessage(step: string, status: string): string {
  switch (step) {
    case "editing":
      switch (status) {
        case "starting":
          return "Starting image editing...";
        case "processing":
          return "This will take about 30 seconds...";
        case "complete":
          return "Image editing completed successfully!";
        default:
          return "Editing image...";
      }
    case "analysis":
      switch (status) {
        case "starting":
          return "Starting image analysis...";
        case "analyzing":
          return "Analyzing image with AI...";
        case "processing":
          return "Processing image analysis...";
        case "analysis_complete":
          return "Analysis complete!";
        case "complete":
          return "Analysis completed successfully!";
        default:
          return "Analyzing image...";
      }
    case "generation":
      switch (status) {
        case "starting":
          return "Starting image generation...";
        case "generating":
          return "Generating new image...";
        case "processing":
          return "Creating your image...";
        case "completed":
          return "Image generation complete!";
        case "complete":
          return "Image generated successfully!";
        default:
          return "Generating image...";
      }
    case "error":
      return `Error: ${status}`;
    default:
      return "Processing...";
  }
}
