"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocalSubmissions } from "@/hooks/useLocalSubmissions";
import { processImageTwoStep, getStatusMessage } from "@/lib/image-processing";

interface Template {
  id: number;
  name: string;
  one_line: string;
  prompt_text: string;
  type: string;
  created_at: string;
}

interface StepFourProps {
  selectedImage: File | null;
  selectedTemplate: any;
  customPrompt: string;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  editedImage: string;
  setEditedImage: (url: string) => void;
  onBack: () => void;
  imagePreview: string;
  userAddress?: string;
  submissionId: string | null;
}

const StepFour = ({
  selectedImage,
  selectedTemplate,
  customPrompt,
  isLoading,
  setIsLoading,
  editedImage,
  setEditedImage,
  onBack,
  imagePreview,
  userAddress,
  submissionId,
}: StepFourProps) => {
  const { toast } = useToast();
  const { updateSubmission, getSubmission } = useLocalSubmissions();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [localSelectedTemplate, setLocalSelectedTemplate] =
    useState(selectedTemplate);
  const [localCustomPrompt, setLocalCustomPrompt] = useState(customPrompt);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: userAddress || "",
  });
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState({
    status: "",
    message: "",
    progress: 0,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const hasTriggeredGeneration = useRef(false);

  // Image compression function (optimized for US clients)
  const compressImageToTargetSize = async (
    file: File,
    targetSizeMB: number = 1.5, // Optimized for US broadband speeds
    maxWidth: number = 900, // Good quality for US screens
    maxHeight: number = 675, // 16:9 aspect ratio for US displays
    quality: number = 0.65 // Balanced quality/size for US networks
  ): Promise<File> => {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    console.log(
      "Compressing image:",
      file.name,
      file.size,
      "bytes",
      file.type,
      "target:",
      targetSizeBytes
    );

    // Always convert to PNG format for OpenAI compatibility, regardless of size
    // If file is already smaller than target and already PNG, return as is
    if (file.size <= targetSizeBytes && file.type === "image/png") {
      console.log(
        "File already small enough and PNG format, returning original"
      );
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = Math.min(maxWidth, width);
            height = width / aspectRatio;
          } else {
            height = Math.min(maxHeight, height);
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to get close to target size
        const tryCompress = (currentQuality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // Fallback to original
                return;
              }

              const compressedSize = blob.size;

              // If we're close enough to target size or quality is too low, use this result
              if (compressedSize <= targetSizeBytes || currentQuality <= 0.1) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/png", // Changed to PNG for OpenAI compatibility
                  lastModified: Date.now(),
                });
                console.log(
                  "Compression complete:",
                  compressedFile.name,
                  compressedFile.size,
                  "bytes",
                  compressedFile.type
                );
                resolve(compressedFile);
              } else {
                // Try with lower quality
                console.log(
                  "Trying lower quality:",
                  currentQuality - 0.1,
                  "current size:",
                  compressedSize
                );
                tryCompress(currentQuality - 0.1);
              }
            },
            "image/png", // Changed to PNG for OpenAI compatibility
            currentQuality
          );
        };

        // Start with the initial quality
        tryCompress(quality);
      };

      img.onerror = () => {
        resolve(file); // Fallback to original
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Update address when userAddress prop changes
  useEffect(() => {
    if (userAddress) {
      setQuoteForm((prev) => ({
        ...prev,
        address: userAddress,
      }));
    }
  }, [userAddress]);

  // Fetch templates for selection
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    if (templatesLoaded) return; // Skip if already loaded

    try {
      const response = await fetch("/api/prompts/templates");

      if (!response.ok) {
        console.error("Error fetching templates:", response.status);
        return;
      }

      const data = await response.json();
      setTemplates(data || []);
      setTemplatesLoaded(true);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const generateImage = async (useCurrentSettings = false) => {
    // Prevent multiple simultaneous executions
    if (isLoading || currentJobId) {
      console.log("Image generation already in progress, skipping...");
      return;
    }

    if (!selectedImage) {
      toast({
        title: "Missing information",
        description: "Please ensure you have an image selected",
        variant: "destructive",
      });
      return;
    }

    const templateToUse = useCurrentSettings
      ? localSelectedTemplate
      : selectedTemplate;
    const promptToUse = useCurrentSettings ? localCustomPrompt : customPrompt;

    if (!templateToUse) {
      toast({
        title: "Missing information",
        description: "Please select a template",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const finalPrompt =
        templateToUse.prompt_text +
        (promptToUse.trim() ? `, ${promptToUse}` : "");

      console.log("Starting async image generation");
      console.log("Final prompt:", finalPrompt);
      console.log(
        "Original image:",
        selectedImage.name,
        selectedImage.size,
        "bytes",
        selectedImage.type
      );

      // Compress image to PNG format for OpenAI compatibility (optimized for US clients)
      const compressedImage = await compressImageToTargetSize(
        selectedImage,
        1.5
      );
      console.log(
        "Compressed image:",
        compressedImage.name,
        compressedImage.size,
        "bytes",
        compressedImage.type
      );

      // Use the new two-step processing approach
      setUploadProgress(0);

      const resultImageUrl = await processImageTwoStep(
        compressedImage,
        finalPrompt,
        (step, status) => {
          const message = getStatusMessage(step, status);
          const progress =
            step === "editing" ? (status === "complete" ? 100 : 50) : 0;

          setJobProgress({
            status:
              status === "complete" || status === "completed"
                ? "completed"
                : "processing",
            message: message,
            progress: progress,
          });

          console.log(`Progress update: ${step} - ${status} - ${message}`);
        }
      );

      console.log("Image processing completed:", resultImageUrl);

      // Set the result image
      setEditedImage(resultImageUrl);
      setJobProgress({
        status: "completed",
        message: "Image generated successfully!",
        progress: 100,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error",
        description: `Failed to generate image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quoteForm.name || !quoteForm.email || !quoteForm.phone) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!editedImage || !imagePreview) {
      toast({
        title: "Missing images",
        description:
          "Please ensure both original and result images are available",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting quote form:", quoteForm);

    try {
      // Get submission data to get the Supabase URLs for both images
      let originalImageUrl = imagePreview; // Fallback to data URL
      let resultImageUrl = editedImage; // Fallback to current editedImage

      if (submissionId) {
        const submission = getSubmission(submissionId);
        if (submission?.originalImageUrl) {
          originalImageUrl = submission.originalImageUrl;
          console.log(
            "Using Supabase URL for original image:",
            originalImageUrl
          );
        }
        if (submission?.resultImageUrl) {
          resultImageUrl = submission.resultImageUrl;
          console.log("Using Supabase URL for result image:", resultImageUrl);
        }
      }

      // Send email with all quote data and images
      const emailData = {
        name: quoteForm.name,
        email: quoteForm.email,
        phone: quoteForm.phone,
        address: quoteForm.address,
        templateName:
          localSelectedTemplate?.name ||
          selectedTemplate?.name ||
          "Unknown Template",
        customDetails: localCustomPrompt || "None provided",
        originalImageUrl: originalImageUrl,
        resultImageUrl: resultImageUrl,
      };

      const response = await fetch("/api/email/send-visualizer-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send quote email");
      }

      // Update submission record
      if (submissionId) {
        await updateSubmission(submissionId, {
          name: quoteForm.name,
          email: quoteForm.email,
          phone: quoteForm.phone,
          address: quoteForm.address,
        });
        console.log("Updated submission with contact information");
      }

      toast({
        title: "Quote Request Submitted!",
        description: "We'll contact you soon with your personalized quote.",
      });
    } catch (error) {
      console.error("Error submitting quote:", error);
      toast({
        title: "Error sending quote request",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setQuoteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegenerateImage = () => {
    generateImage(true);
  };

  // Auto-trigger generation when component mounts (only once)
  useEffect(() => {
    if (
      !editedImage &&
      !isLoading &&
      !currentJobId &&
      !hasTriggeredGeneration.current
    ) {
      hasTriggeredGeneration.current = true;
      generateImage();
    }
  }, [editedImage, isLoading, currentJobId]);

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Loading State */}
          {(isLoading || currentJobId) && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-purple-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-800">
                  {jobProgress.status === "completed"
                    ? "✨ Complete!"
                    : uploadProgress > 0 && uploadProgress < 100
                    ? "📤 Uploading Image..."
                    : "🎨 Transforming Your House..."}
                </h3>
                <p className="text-gray-600 max-w-md">
                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading... ${Math.round(uploadProgress)}%`
                    : jobProgress.message || "Processing your image with AI..."}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress</span>
                  <span>
                    {uploadProgress > 0 && uploadProgress < 100
                      ? Math.round(uploadProgress)
                      : jobProgress.progress}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${
                        uploadProgress > 0 && uploadProgress < 100
                          ? uploadProgress
                          : jobProgress.progress
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Job ID for debugging */}
              {currentJobId && (
                <div className="text-xs text-gray-400 font-mono">
                  Job: {currentJobId}
                </div>
              )}

              {/* Status indicators */}
              <div className="flex space-x-4 text-sm">
                <div
                  className={`flex items-center space-x-2 ${
                    jobProgress.status === "pending"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      jobProgress.status === "pending"
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span>Queued</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    jobProgress.status === "processing"
                      ? "text-purple-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      jobProgress.status === "processing"
                        ? "bg-purple-600"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span>Processing</span>
                </div>
                <div
                  className={`flex items-center space-x-2 ${
                    jobProgress.status === "completed"
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      jobProgress.status === "completed"
                        ? "bg-green-600"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Get a Quote Form - Show first when image is ready */}
          {editedImage && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  Get a Quote Today
                </h3>
                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Name *
                      </label>
                      <Input
                        type="text"
                        value={quoteForm.name}
                        onChange={(e) =>
                          handleFormChange("name", e.target.value)
                        }
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={quoteForm.email}
                        onChange={(e) =>
                          handleFormChange("email", e.target.value)
                        }
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        value={quoteForm.phone}
                        onChange={(e) =>
                          handleFormChange("phone", e.target.value)
                        }
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Address
                      </label>
                      <Input
                        type="text"
                        value={quoteForm.address}
                        onChange={(e) =>
                          handleFormChange("address", e.target.value)
                        }
                        placeholder="Your project address"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Get a Quote
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Generated Image - Show second */}
          {editedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={editedImage}
                  alt="Generated project vision"
                  className="max-w-full rounded-lg shadow-xl border"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {localSelectedTemplate?.name || selectedTemplate?.name}{" "}
                  transformation complete!
                </p>
              </div>
            </div>
          )}

          {/* Template and Prompt Controls - Show last after image */}
          {editedImage && !isLoading && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">
                  Customize Your Vision
                </h3>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Choose Template:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md border ${
                          localSelectedTemplate?.id === template.id
                            ? "border-2 border-blue-500 bg-blue-50 shadow-md"
                            : "hover:border-blue-300 bg-white"
                        }`}
                        onClick={() => setLocalSelectedTemplate(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium text-sm text-stone-800">
                              {template.name}
                            </h4>
                            {localSelectedTemplate?.id === template.id && (
                              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-stone-600 mb-2">
                            {template.one_line}
                          </p>
                          <div className="text-xs bg-stone-100 rounded-full px-2 py-1 inline-block text-stone-600">
                            {template.type}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Custom Details (Optional):
                  </label>
                  <Textarea
                    placeholder="Add any specific details about colors, materials, style preferences, or other customizations..."
                    value={localCustomPrompt}
                    onChange={(e) => setLocalCustomPrompt(e.target.value)}
                    className="min-h-[100px] rounded-xl border-stone-200"
                  />
                </div>

                {/* Regenerate Button */}
                <Button
                  onClick={handleRegenerateImage}
                  disabled={isLoading || !localSelectedTemplate}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Re-Imagine Your Home"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StepFour;
