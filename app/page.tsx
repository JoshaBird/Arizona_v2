import React from "react";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import About from "@/components/home/About";
import ProjectGallery from "@/components/home/ProjectGallery";
import Contact from "@/components/home/Contact";
import Footer from "@/components/home/Footer";
import JobCleanup from "@/components/JobCleanup";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-green-50">
      <JobCleanup />
      <Hero />
      {/* <Services />
      <About />
      <ProjectGallery />
      <Contact />
      <Footer /> */}
    </div>
  );
}
