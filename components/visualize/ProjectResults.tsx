"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw } from "lucide-react";

interface ProjectResultsProps {
  originalImage: string;
  editedImage: string;
  selectedTemplate: any;
  customPrompt: string;
  onStartOver: () => void;
}

const ProjectResults = ({
  originalImage,
  editedImage,
  selectedTemplate,
  customPrompt,
  onStartOver,
}: ProjectResultsProps) => {
  return (
    <div className="mt-12">
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-6 h-6" />
            Project Vision Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-green-700">
            Your project visualization has been generated successfully! Compare
            your original house with the AI-generated vision below.
          </p>

          {/* Before and After */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-center">Before</h3>
              <img
                src={originalImage}
                alt="Original house"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-center">
                After - Your Vision
              </h3>
              <img
                src={editedImage}
                alt="Project vision"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </div>

          {/* Project Details */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    Template Used:
                  </h4>
                  <p className="text-sm">{selectedTemplate?.name}</p>
                </div>
                {customPrompt && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Custom Details:
                    </h4>
                    <p className="text-sm">{customPrompt}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onStartOver}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Create Another Vision
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Contact Us About This Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectResults;
