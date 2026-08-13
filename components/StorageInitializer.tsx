"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function StorageInitializer() {
  const [isChecking, setIsChecking] = useState(true);
  const [initStatus, setInitStatus] = useState<{
    checked: boolean;
    success: boolean;
    message?: string;
  }>({ checked: false, success: false });
  const { toast } = useToast();

  useEffect(() => {
    const checkStorage = async () => {
      try {
        console.log("🔍 Checking storage setup...");

        const response = await fetch("/api/storage/setup");

        if (!response.ok) {
          throw new Error(`Storage setup failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log("✅ Storage setup completed");
          setInitStatus({
            checked: true,
            success: true,
            message: "Submission images bucket ready for uploads",
          });
        } else {
          console.log("⚠️ Storage setup failed:", result.error);
          setInitStatus({
            checked: true,
            success: false,
            message: result.details || result.error || "Storage setup failed",
          });
        }
      } catch (error) {
        console.error("❌ Storage check error:", error);
        setInitStatus({
          checked: true,
          success: false,
          message:
            error instanceof Error ? error.message : "Storage check failed",
        });

        toast({
          title: "Storage Setup Warning",
          description:
            "Submission images bucket setup failed. Image uploads may not work. Check console for details.",
          variant: "destructive",
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkStorage();
  }, [toast]);

  // Show full-screen loader while checking, or error message if failed
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className=" p-6 rounded-lg shadow-lg max-w-md mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show error if there's an issue after checking is complete
  if (!initStatus.checked || initStatus.success) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          <div>
            <h3 className="font-semibold text-gray-900">Storage Setup</h3>
            <p className="text-sm text-gray-600 mt-1">{initStatus.message}</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Submission images bucket setup failed. Image uploads may not work
            properly.
          </p>
          <p className="text-xs text-red-600 mt-2">
            Check the console for details or run the storage setup manually.
          </p>
        </div>
      </div>
    </div>
  );
}
