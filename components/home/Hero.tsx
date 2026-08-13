"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  TreePine,
  Fence,
  PaintBucket,
  Droplets,
  Home,
} from "lucide-react";
import Link from "next/link";

interface LocationConfig {
  state: string;
  city: string;
  description: string;
}

const Hero = () => {
  const [locationConfig, setLocationConfig] = useState<LocationConfig>({
    state: "Florida",
    city: "Jacksonville",
    description:
      "Transforming outdoor spaces across Jacksonville, Florida with expert landscaping, fencing, painting, pressure washing, and gutter cleaning services.",
  });

  useEffect(() => {
    const fetchLocationConfig = async () => {
      try {
        const response = await fetch("/api/config/location");
        if (response.ok) {
          const config = await response.json();
          setLocationConfig(config);
        }
      } catch (error) {
        console.error("Failed to fetch location config:", error);
      }
    };

    fetchLocationConfig();
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image with lighter white overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/lovable-uploads/fe058e35-8911-42bf-88ae-2a4e49e90d6e.png')`,
        }}
      />
      <div className="absolute inset-0 bg-white/65"></div>

      {/* Additional gradient overlay for the aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 via-stone-50/60 to-amber-50/60"></div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-green-100 rounded-full opacity-30 animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-24 h-24 bg-amber-100 rounded-full opacity-40 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-10 w-16 h-16 bg-stone-200 rounded-full opacity-25 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-800 via-stone-700 to-amber-700 bg-clip-text text-transparent">
            Oak & Iron
          </h1>
          <p className="text-2xl md:text-3xl text-stone-600 mb-4 font-medium">
            Premium Outdoor Services
          </p>
          <p className="text-lg text-stone-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            {locationConfig.description}
          </p>
        </div>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Link href="/visualize">
            <Button
              size="lg"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Visualize Your Project
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          {/* <Button
              variant="outline"
              size="lg"
              onClick={() =>
                document
                  .getElementById("contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="border-2 border-stone-300 text-stone-700 hover:bg-stone-100 px-8 py-4 rounded-full text-lg font-medium"
            >
              Get Free Quote
            </Button> */}
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-8 max-w-4xl mx-auto">
          {[
            { name: "Landscaping", icon: TreePine },
            { name: "Fencing", icon: Fence },
            { name: "Painting", icon: PaintBucket },
            { name: "Pressure Washing", icon: Droplets },
            { name: "Gutter Cleaning", icon: Home },
          ].map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.name}
                className="text-center animate-fade-in hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${0.6 + index * 0.1}s` }}
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <p className="text-stone-600 font-medium text-sm">
                  {service.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Hero;
