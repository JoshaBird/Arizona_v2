"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: number;
  name: string;
  one_line: string;
  prompt_text: string;
  type: string;
  created_at: string;
}

interface StepTwoProps {
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const StepTwo = ({
  selectedTemplate,
  setSelectedTemplate,
  onNext,
  onBack,
  canProceed,
}: StepTwoProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      console.log("Fetching templates from API route...");

      const response = await fetch("/api/prompts/templates");

      if (!response.ok) {
        console.error("Error fetching templates:", response.status);
        toast({
          title: "Error",
          description: "Failed to load templates. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      console.log("Successfully fetched templates:", data);
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl bg-white">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardContent className="space-y-6 pt-6">
        <p className="text-stone-600">
          Select a template that best matches your landscaping or fencing
          project
        </p>

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg border-0 shadow-md ${
                  selectedTemplate?.id === template.id
                    ? "border-2 border-green-500 bg-green-50 shadow-xl"
                    : "hover:border-green-300 bg-white/80"
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-stone-800">
                      {template.name}
                    </h3>
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-stone-600 mb-3">
                    {template.one_line}
                  </p>
                  <div className="text-xs bg-stone-100 rounded-full px-3 py-1 inline-block text-stone-600">
                    {template.type}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md bg-white/80">
            <CardContent className="p-8 text-center">
              <p className="text-stone-600">
                No templates found in the database
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2 border-stone-300 text-stone-700 hover:bg-stone-100 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Image
          </Button>

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 flex items-center gap-2 rounded-full"
          >
            Continue to Customize
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepTwo;
