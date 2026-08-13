'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import StepOne from '@/components/visualize/StepOne';
import StepTwo from '@/components/visualize/StepTwo';
import StepThree from '@/components/visualize/StepThree';
import StepFour from '@/components/visualize/StepFour';

export default function VisualizeProjectPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string>('');
  const [userAddress, setUserAddress] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return selectedImage && imagePreview;
      case 3:
        return selectedTemplate;
      case 4:
        return true; // Can always proceed to step 4 once we have template
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-green-50 to-amber-50">
      <div className="container mx-auto py-8 px-4">
        {/* Navigation back to home */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-800 via-stone-700 to-amber-700 bg-clip-text text-transparent">
            Visualize Your Project
          </h1>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto">
            Transform your outdoor space with AI-powered visualization. See your landscaping and fencing dreams come to life in just a few simple steps.
          </p>
          
          {/* Steps Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            {[
              { number: 1, title: "Image of Your House", desc: "Upload a photo" },
              { number: 2, title: "Choose Template", desc: "Select project type" },
              { number: 3, title: "Customize", desc: "Add your details" },
              { number: 4, title: "Generate", desc: "AI creates your vision" }
            ].map((step, index) => (
              <Card key={index} className={`border-0 shadow-md ${currentStep === step.number ? 'border-green-500 bg-green-50 shadow-lg' : 'bg-white/80'}`}>
                <CardContent className="p-4 text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold ${
                    currentStep >= step.number ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-stone-300'
                  }`}>
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-sm text-stone-800">{step.title}</h3>
                  <p className="text-xs text-stone-600">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 1 && (
            <StepOne
              selectedImage={selectedImage}
              imagePreview={imagePreview}
              setSelectedImage={setSelectedImage}
              setImagePreview={setImagePreview}
              setUserAddress={setUserAddress}
              onNext={() => setCurrentStep(2)}
              canProceed={canProceedToStep(2)}
              submissionId={submissionId}
              setSubmissionId={setSubmissionId}
            />
          )}

          {currentStep === 2 && (
            <StepTwo
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              canProceed={canProceedToStep(3)}
            />
          )}

          {currentStep === 3 && (
            <StepThree
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              selectedTemplate={selectedTemplate}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
              submissionId={submissionId}
            />
          )}

          {currentStep === 4 && (
            <StepFour
              selectedImage={selectedImage}
              selectedTemplate={selectedTemplate}
              customPrompt={customPrompt}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              editedImage={editedImage}
              setEditedImage={setEditedImage}
              onBack={() => setCurrentStep(3)}
              imagePreview={imagePreview}
              userAddress={userAddress}
              submissionId={submissionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
