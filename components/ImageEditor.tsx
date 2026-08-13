"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Wand2,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { compressImageToTargetSize } from "@/lib/image-compression";
import { processImageTwoStep, getStatusMessage } from "@/lib/image-processing";

const ImageEditor = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [editedImage, setEditedImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState({
    status: "",
    message: "",
    progress: 0,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    if (file && file.type.startsWith("image/")) {
      try {
        // Compress image to 4.5MB limit with high quality
        const compressedFile = await compressImageToTargetSize(
          file,
          4.5,
          1920,
          1080,
          0.85
        );

        setSelectedImage(compressedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
        setEditedImage(""); // Clear previous result
      } catch (error) {
        // Silent fallback to original file
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setEditedImage("");
      }
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a valid image file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const editImage = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload an image and enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Starting async image edit request");
      console.log(
        "Image file:",
        selectedImage.name,
        selectedImage.size,
        "bytes"
      );
      console.log("Prompt:", prompt);

      // Use the new two-step processing approach
      setUploadProgress(0);

      const resultImageUrl = await processImageTwoStep(
        selectedImage,
        prompt,
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
      console.error("Error editing image:", error);
      toast({
        title: "Error",
        description: `Failed to edit image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 25; // Optimized for US user patience
    let attempts = 0;
    let pollInterval = 1000; // Start with 1 second for US expectations

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        console.log(`Polling job ${jobId}, attempt ${attempts}`);

        const response = await fetch(`/api/ai/job-status?jobId=${jobId}`, {
          cache: "no-cache", // Prevent caching
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to check job status");
        }

        const statusData = await response.json();
        console.log("Job status:", statusData);

        if (statusData.status === "completed" && statusData.imageUrl) {
          console.log("Job completed! Setting image URL:", statusData.imageUrl);

          // Preload the image for faster display
          const img = new Image();
          img.onload = () => {
            console.log("Image preloaded successfully");
            setEditedImage(statusData.imageUrl);
            setJobProgress({
              status: "completed",
              message: "Image processing completed!",
              progress: 100,
            });
            setCurrentJobId(null);
          };
          img.onerror = () => {
            console.log("Image preload failed, setting URL anyway");
            setEditedImage(statusData.imageUrl);
            setJobProgress({
              status: "completed",
              message: "Image processing completed!",
              progress: 100,
            });
            setCurrentJobId(null);
          };
          img.src = statusData.imageUrl;

          toast({
            title: "Success!",
            description: "Your image has been edited successfully",
          });
          return;
        } else if (statusData.status === "failed") {
          setJobProgress({
            status: "failed",
            message: "Image processing failed",
            progress: 0,
          });
          setCurrentJobId(null);
          throw new Error(statusData.error || "Image processing failed");
        } else if (
          statusData.status === "pending" ||
          statusData.status === "processing"
        ) {
          setJobProgress({
            status: statusData.status,
            message:
              statusData.status === "pending"
                ? "Queuing your request..."
                : "Processing your image with AI...",
            progress: statusData.status === "pending" ? 20 : 60,
          });

          if (attempts >= maxAttempts) {
            setJobProgress({
              status: "timeout",
              message: "Processing is taking longer than expected",
              progress: 0,
            });
            setCurrentJobId(null);
            throw new Error(
              "Processing is taking longer than expected. Please try again."
            );
          }
          // Exponential backoff optimized for US: 1s, 1.5s, 2.5s, 4s, 6s, 9s, then cap at 12s
          pollInterval = Math.min(pollInterval * 1.5, 12000);
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        throw error;
      }
    };

    // Start polling
    await poll();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          AI Image Editor
        </h1>
        <p className="text-lg text-muted-foreground">
          Upload an image and describe how you&apos;d like to edit it
        </p>
        <div className="flex items-center gap-2 justify-center text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm">
            Powered by secure backend processing with OpenAI&apos;s latest image
            editing technology
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragOver
                  ? "border-primary bg-primary/5 scale-105"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Click or drag to change image
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drop your image here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prompt Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Edit Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Describe your edit:
              </label>
              <Input
                type="text"
                placeholder="e.g., Add a white picket fence in the front yard"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={editImage}
              disabled={!selectedImage || !prompt.trim() || isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Editing Image...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Edit Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {(isLoading || currentJobId) && (
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
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
                    : "🎨 Editing Your Image..."}
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
          </CardContent>
        </Card>
      )}

      {/* Result Section */}
      {editedImage && (
        <Card className="overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5">
          <CardHeader>
            <CardTitle className="text-center">Edited Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={editedImage}
                alt="Edited result"
                className="max-w-full rounded-lg shadow-xl border"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageEditor;
