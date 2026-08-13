"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, Clock, MapPin } from "lucide-react";
const About = () => {
  const stats = [
    {
      icon: Users,
      label: "Happy Customers",
      value: "500+",
    },
    {
      icon: Award,
      label: "Years Experience",
      value: "15+",
    },
    {
      icon: Clock,
      label: "Projects Completed",
      value: "1000+",
    },
    {
      icon: MapPin,
      label: "Service Areas",
      value: "20+",
    },
  ];
  return (
    <section className="py-20 bg-gradient-to-b from-green-50 to-stone-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6">
              About Oak & Iron
            </h2>
            <p className="text-lg text-stone-600 mb-6 leading-relaxed">
              Founded in the heart of Jackson, Mississippi, the team at Oak &
              Iron has been transforming outdoor spaces for over 15 years. We
              combine traditional craftsmanship with modern techniques to
              deliver exceptional results that stand the test of time.
            </p>
            <p className="text-lg text-stone-600 mb-8 leading-relaxed">
              Our team of skilled professionals takes pride in every project,
              from small residential improvements to large commercial
              installations. We believe in building lasting relationships with
              our clients through quality work and exceptional service.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <Card
                  key={stat.label}
                  className="text-center border-0 shadow-md bg-white/80"
                >
                  <CardContent className="p-6">
                    <stat.icon className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-stone-800 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-stone-600">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-green-200 to-stone-200 rounded-3xl relative overflow-hidden">
              <div className="absolute inset-8 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌳</div>
                  <h3 className="text-2xl font-bold text-stone-800 mb-2">
                    Quality & Craft
                  </h3>
                  <p className="text-stone-600">
                    Built to last, designed to impress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default About;
