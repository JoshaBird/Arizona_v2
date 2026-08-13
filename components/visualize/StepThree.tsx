"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft } from "lucide-react";
import { useLocalSubmissions } from "@/hooks/useLocalSubmissions";

interface StepThreeProps {
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  selectedTemplate: any;
  onNext: () => void;
  onBack: () => void;
  submissionId: string | null;
}

const StepThree = ({
  customPrompt,
  setCustomPrompt,
  selectedTemplate,
  onNext,
  onBack,
  submissionId,
}: StepThreeProps) => {
  const { updateSubmission } = useLocalSubmissions();

  const handleTransformClick = async () => {
    if (selectedTemplate && submissionId) {
      // Combine template prompt with custom prompt
      const finalPrompt =
        selectedTemplate.prompt_text +
        (customPrompt.trim() ? `, ${customPrompt}` : "");

      console.log("Saving prompt to submission:", finalPrompt);

      // Update submission with the complete prompt
      try {
        await updateSubmission(submissionId, { prompt: finalPrompt });
        console.log("Prompt saved to submission");
      } catch (error) {
        console.error("Failed to save prompt:", error);
      }
    }

    onNext();
  };

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardContent className="space-y-6 pt-6">
        <div>
          <Card className="bg-green-50 border-green-200 border-0 shadow-md">
            <CardContent className="p-4">
              <h4 className="font-medium text-stone-800">
                {selectedTemplate?.name}
              </h4>
              <p className="text-sm text-stone-600">
                {selectedTemplate?.one_line}
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-stone-700">
            Add Your Custom Details (Optional):
          </label>
          <Textarea
            placeholder="Add any specific details about colors, materials, style preferences, or other customizations you'd like to see..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[120px] rounded-xl border-stone-200"
          />
          <p className="text-xs text-stone-500 mt-2">
            This will be added to the base template to create your unique
            vision.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-stone-300 text-stone-700 hover:bg-stone-100 rounded-full"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
          <Button
            onClick={handleTransformClick}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full"
          >
            Transform My House
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepThree;
