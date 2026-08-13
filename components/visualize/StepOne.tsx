"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalSubmissions } from "@/hooks/useLocalSubmissions";
import { useSubmission } from "@/hooks/useSubmission";
import { compressImageToTargetSize } from "@/lib/image-compression";

interface StepOneProps {
  selectedImage: File | null;
  imagePreview: string;
  setSelectedImage: (file: File | null) => void;
  setImagePreview: (url: string) => void;
  setUserAddress: (address: string) => void;
  onNext: () => void;
  canProceed: boolean;
  submissionId: string | null;
  setSubmissionId: (id: string) => void;
}

const StepOne = ({
  selectedImage,
  imagePreview,
  setSelectedImage,
  setImagePreview,
  setUserAddress,
  onNext,
  canProceed,
  submissionId,
  setSubmissionId,
}: StepOneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const { saveSubmission } = useLocalSubmissions();
  const { uploadImageToStorage } = useSubmission();

  const handleImageUpload = async (file: File) => {
    if (file && file.type.startsWith("image/")) {
      console.log("Processing uploaded file:", file.name, file.size, "bytes");

      try {
        // Compress image to 4.5MB limit with high quality
        const compressedFile = await compressImageToTargetSize(
          file,
          4.5,
          1920,
          1080,
          0.85
        );
        console.log(
          `Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(
            compressedFile.size /
            1024 /
            1024
          ).toFixed(2)}MB`
        );

        setSelectedImage(compressedFile);

        // Create preview URL for immediate display
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageUrl = e.target?.result as string;
          setImagePreview(imageUrl);

          console.log("Image preview set, uploading to Supabase...");

          try {
            // Upload compressed file to Supabase storage
            const timestamp = Date.now();
            const fileName = `original_${timestamp}_${compressedFile.name}`;
            const storageUrl = await uploadImageToStorage(
              compressedFile,
              fileName
            );

            console.log("Image uploaded to Supabase:", storageUrl);

            // Create submission record only if we don't have one yet
            if (!submissionId) {
              try {
                const submission = await saveSubmission({
                  name: "",
                  email: "",
                  phone: "",
                  address: "",
                  prompt: "",
                  originalImageUrl: storageUrl, // Use Supabase URL instead of data URL
                });
                setSubmissionId(submission.id);
                console.log("Submission created with ID:", submission.id);
              } catch (error) {
                console.error("Failed to create submission:", error);
              }
            }

            toast({
              title: "Image uploaded",
              description:
                "Your image has been uploaded to Supabase successfully",
            });
          } catch (uploadError) {
            console.error("Failed to upload to Supabase:", uploadError);
            toast({
              title: "Upload failed",
              description:
                "Failed to upload image to storage. Please try again.",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(compressedFile);

        // Clear address when uploading image manually
        setUserAddress("");
      } catch (error) {
        console.error("Compression failed, using original file:", error);
        // Fallback to original file
        setSelectedImage(file);

        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageUrl = e.target?.result as string;
          setImagePreview(imageUrl);

          console.log("Image preview set, uploading to Supabase...");

          try {
            // Upload original file to Supabase storage
            const timestamp = Date.now();
            const fileName = `original_${timestamp}_${file.name}`;
            const storageUrl = await uploadImageToStorage(file, fileName);

            console.log("Image uploaded to Supabase:", storageUrl);

            // Create submission record only if we don't have one yet
            if (!submissionId) {
              try {
                const submission = await saveSubmission({
                  name: "",
                  email: "",
                  phone: "",
                  address: "",
                  prompt: "",
                  originalImageUrl: storageUrl,
                });
                setSubmissionId(submission.id);
                console.log("Submission created with ID:", submission.id);
              } catch (error) {
                console.error("Failed to create submission:", error);
              }
            }

            toast({
              title: "Image uploaded",
              description:
                "Your image has been uploaded to Supabase successfully",
            });
          } catch (uploadError) {
            console.error("Failed to upload to Supabase:", uploadError);
            toast({
              title: "Upload failed",
              description:
                "Failed to upload image to storage. Please try again.",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);

        // Clear address when uploading image manually
        setUserAddress("");
      }
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a valid image file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Your House Photo
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
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drop your image here</p>
              <p className="text-sm text-muted-foreground mt-2">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports JPG, PNG, WebP files up to 50MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {imagePreview && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <img
                  src={imagePreview}
                  alt="Selected house"
                  className="max-w-full max-h-64 rounded-lg shadow-lg"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Button */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Continue to Templates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepOne;
