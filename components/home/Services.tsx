"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TreePine, Fence, PaintBucket, Droplets, Home } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: TreePine,
      title: "Landscaping",
      description:
        "Transform your outdoor space with expert design, planting, and maintenance services.",
      features: [
        "Garden Design",
        "Tree & Shrub Planting",
        "Lawn Care",
        "Seasonal Maintenance",
      ],
    },
    {
      icon: Fence,
      title: "Fencing",
      description:
        "Secure and beautify your property with quality fencing solutions.",
      features: ["Wood Fencing", "Vinyl Fencing", "Chain Link", "Fence Repair"],
    },
    {
      icon: PaintBucket,
      title: "Painting",
      description:
        "Refresh your home's appearance with professional interior and exterior painting.",
      features: [
        "Exterior Painting",
        "Interior Painting",
        "Deck Staining",
        "Color Consultation",
      ],
    },
    {
      icon: Droplets,
      title: "Pressure Washing",
      description:
        "Restore the beauty of your surfaces with our professional cleaning services.",
      features: [
        "House Washing",
        "Driveway Cleaning",
        "Deck Cleaning",
        "Roof Cleaning",
      ],
    },
    {
      icon: Home,
      title: "Gutter Cleaning",
      description:
        "Protect your home with thorough gutter cleaning and maintenance services.",
      features: [
        "Gutter Cleaning",
        "Downspout Clearing",
        "Gutter Repair",
        "Installation",
      ],
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4">
            Our Services
          </h2>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto">
            From concept to completion, we provide comprehensive outdoor
            services to enhance and protect your property throughout Jackson,
            Mississippi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {services.map((service, index) => (
            <Card
              key={service.title}
              className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-stone-50 to-green-50 hover:scale-105 ${
                index < 3 ? "lg:col-span-2" : "lg:col-span-3"
              }`}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-stone-800">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-stone-600 mb-6 leading-relaxed">
                  {service.description}
                </p>
                <ul className="text-sm text-stone-500 space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center justify-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-full"
                >
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
