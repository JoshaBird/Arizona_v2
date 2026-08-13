"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ProjectGallery = () => {
  const [currentProject, setCurrentProject] = useState(0);

  const projects = [
    {
      title: "Modern Landscape Design",
      category: "Landscaping",
      description:
        "Complete backyard transformation with native plants and stone pathways.",
      image: "🌿",
      color: "from-green-400 to-green-600",
    },
    {
      title: "Custom Wood Fencing",
      category: "Fencing",
      description: "Privacy fence with decorative elements and matching gate.",
      image: "🏗️",
      color: "from-amber-400 to-amber-600",
    },
    {
      title: "Exterior Home Refresh",
      category: "Painting",
      description: "Complete exterior painting with modern color palette.",
      image: "🎨",
      color: "from-blue-400 to-blue-600",
    },
    {
      title: "Driveway Restoration",
      category: "Pressure Washing",
      description: "Deep cleaning and sealing of concrete surfaces.",
      image: "💧",
      color: "from-cyan-400 to-cyan-600",
    },
  ];

  const nextProject = () => {
    setCurrentProject((prev) => (prev + 1) % projects.length);
  };

  const prevProject = () => {
    setCurrentProject((prev) => (prev - 1 + projects.length) % projects.length);
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4">
            Featured Projects
          </h2>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto">
            See how we&apos;ve transformed outdoor spaces across Jackson,
            Mississippi.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div
                  className={`h-80 bg-gradient-to-br ${projects[currentProject].color} flex items-center justify-center relative`}
                >
                  <div className="text-center text-white">
                    <div className="text-8xl mb-4">
                      {projects[currentProject].image}
                    </div>
                    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-sm font-medium">
                        {projects[currentProject].category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-3xl font-bold text-stone-800 mb-4">
                    {projects[currentProject].title}
                  </h3>
                  <p className="text-lg text-stone-600 mb-6">
                    {projects[currentProject].description}
                  </p>
                  <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full">
                    View Project Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm border-white shadow-lg hover:bg-white"
              onClick={prevProject}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm border-white shadow-lg hover:bg-white"
              onClick={nextProject}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Project indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {projects.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentProject
                    ? "bg-green-600 scale-125"
                    : "bg-stone-300"
                }`}
                onClick={() => setCurrentProject(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectGallery;
