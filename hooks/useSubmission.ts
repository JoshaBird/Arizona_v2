import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSubmission = () => {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadImageToStorage = async (
    file: File,
    path: string
  ): Promise<string> => {
    console.log("Attempting to upload to storage via API:", path);

    // Try API route first (uses service role key)
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", path);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      console.log("API upload successful:", data.publicUrl);
      return data.publicUrl;
    } catch (apiError) {
      console.warn("API upload failed, trying direct upload:", apiError);

      // Fallback to direct upload
      const { data, error } = await supabase.storage
        .from("submission-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Direct storage upload error:", error);
        throw new Error(`Failed to upload image to storage: ${error.message}`);
      }

      console.log("Direct storage upload successful:", data);

      const {
        data: { publicUrl },
      } = supabase.storage.from("submission-images").getPublicUrl(data.path);

      console.log("Public URL generated:", publicUrl);
      return publicUrl;
    }
  };

  const createSubmissionMutation = useMutation({
    mutationFn: async ({
      originalFile,
      address,
    }: {
      originalFile?: File;
      address?: string;
    }) => {
      console.log("Creating submission with:", {
        hasFile: !!originalFile,
        address,
      });

      let originalStorageUrl = "";

      if (originalFile) {
        const timestamp = Date.now();
        const fileName = `original_${timestamp}_${originalFile.name}`;
        try {
          originalStorageUrl = await uploadImageToStorage(
            originalFile,
            fileName
          );
          console.log(
            "Original image uploaded to storage:",
            originalStorageUrl
          );
        } catch (storageError) {
          console.warn("Storage upload failed:", storageError);
          throw storageError;
        }
      }

      const submissionData = {
        original_image_storage_url: originalStorageUrl || null,
        address: address || null,
      };

      console.log("Inserting submission data:", submissionData);

      const { data, error } = await supabase
        .from("submissions")
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error("Error creating submission:", error);
        throw error;
      }

      console.log("Submission created successfully:", data);
      return data.id;
    },
    onSuccess: (id) => {
      setSubmissionId(id);
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast({
        title: "Submission created",
        description: "Your project has been saved successfully",
      });
    },
    onError: (error) => {
      console.error("Error in createSubmission:", error);
      toast({
        title: "Error",
        description: "Failed to create submission. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSubmission = async (originalFile?: File, address?: string) => {
    return createSubmissionMutation.mutateAsync({ originalFile, address });
  };

  const updateSubmissionMutation = useMutation({
    mutationFn: async ({
      submissionIdToUpdate,
      updates,
    }: {
      submissionIdToUpdate: string;
      updates: {
        prompt?: string;
        result_image_storage_url?: string;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
      };
    }) => {
      if (!submissionIdToUpdate) {
        throw new Error("No submission ID provided for update");
      }

      console.log(
        "Updating submission:",
        submissionIdToUpdate,
        "with:",
        updates
      );

      const { error } = await supabase
        .from("submissions")
        .update(updates)
        .eq("id", submissionIdToUpdate);

      if (error) {
        console.error("Error updating submission:", error);
        throw error;
      }

      console.log("Submission updated successfully");
      return submissionIdToUpdate;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (error) => {
      console.error("Error in updateSubmission:", error);
    },
  });

  const updateSubmission = async (
    submissionIdToUpdate: string,
    updates: {
      prompt?: string;
      result_image_storage_url?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    }
  ) => {
    return updateSubmissionMutation.mutateAsync({
      submissionIdToUpdate,
      updates,
    });
  };

  const uploadResultImage = async (imageDataUrl: string): Promise<string> => {
    try {
      console.log("Uploading result image to storage");

      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const timestamp = Date.now();
      const fileName = `result_${timestamp}.png`;

      return await uploadImageToStorage(
        new File([blob], fileName, { type: "image/png" }),
        fileName
      );
    } catch (error) {
      console.error("Error uploading result image:", error);
      throw error;
    }
  };

  return {
    submissionId,
    createSubmission,
    updateSubmission,
    uploadResultImage,
    uploadImageToStorage,
    isCreatingSubmission: createSubmissionMutation.isPending,
    isUpdatingSubmission: updateSubmissionMutation.isPending,
    createSubmissionError: createSubmissionMutation.error,
    updateSubmissionError: updateSubmissionMutation.error,
  };
};
