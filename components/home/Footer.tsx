"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="bg-stone-800 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-400 to-amber-400 bg-clip-text text-transparent">
              Oak & Iron
            </h3>
            <p className="text-stone-300 leading-relaxed">
              Premium outdoor services in Jackson, Mississippi. Transforming
              spaces with quality and care.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-stone-200">Services</h4>
            <ul className="space-y-2 text-stone-300">
              <li>Landscaping</li>
              <li>Fencing</li>
              <li>Painting</li>
              <li>Pressure Washing</li>
              <li>Gutter Cleaning</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-stone-200">Company</h4>
            <ul className="space-y-2 text-stone-300">
              <li>About Us</li>
              <li>Our Work</li>
              <li>Testimonials</li>
              <li>Contact</li>
              <li>Free Quote</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-stone-200">Contact Info</h4>
            <ul className="space-y-2 text-stone-300">
              <li>(601) 555-0123</li>
              <li>info@oakandiron.com</li>
              <li>Jackson, MS</li>
              <li>Mon-Fri: 7AM-6PM</li>
            </ul>
          </div>
        </div>

        <Separator className="bg-stone-600 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-stone-400">
          <p>&copy; 2024 Oak & Iron. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-white cursor-pointer">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
