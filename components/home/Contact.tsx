
'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

const Contact = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactFormData>();
  const { toast } = useToast();

  const onSubmit = async (data: ContactFormData) => {
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: data
      });

      if (error) throw error;

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you as soon as possible.",
      });
      
      reset();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-stone-50 to-green-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4">
            Get Your Free Quote
          </h2>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto">
            Ready to transform your outdoor space? Contact us today for a free consultation 
            and detailed quote for your project.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-stone-800">Send Us a Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input 
                      placeholder="First Name" 
                      className="rounded-xl" 
                      {...register("firstName", { required: "First name is required" })}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Input 
                      placeholder="Last Name" 
                      className="rounded-xl" 
                      {...register("lastName", { required: "Last name is required" })}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Input 
                    placeholder="Email Address" 
                    type="email" 
                    className="rounded-xl" 
                    {...register("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Please enter a valid email address"
                      }
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Input 
                    placeholder="Phone Number" 
                    type="tel" 
                    className="rounded-xl" 
                    {...register("phone", { required: "Phone number is required" })}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                  )}
                </div>
                
                <div>
                  <select 
                    className="w-full p-3 border border-input rounded-xl bg-background"
                    {...register("service", { required: "Please select a service" })}
                  >
                    <option value="">Select Service</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Fencing">Fencing</option>
                    <option value="Painting">Painting</option>
                    <option value="Pressure Washing">Pressure Washing</option>
                    <option value="Gutter Cleaning">Gutter Cleaning</option>
                  </select>
                  {errors.service && (
                    <p className="text-sm text-destructive mt-1">{errors.service.message}</p>
                  )}
                </div>
                
                <div>
                  <Textarea 
                    placeholder="Tell us about your project..."
                    className="min-h-[120px] rounded-xl"
                    {...register("message", { required: "Please tell us about your project" })}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl py-3"
                >
                  {isSubmitting ? "Sending..." : "Get Free Quote"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card className="border-0 shadow-md bg-white/80">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">Call Us</h3>
                  <p className="text-stone-600">(601) 555-0123</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">Email Us</h3>
                  <p className="text-stone-600">info@oakandiron.com</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">Service Area</h3>
                  <p className="text-stone-600">Jackson, MS & Surrounding Areas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/80">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">Business Hours</h3>
                  <p className="text-stone-600">Mon-Fri: 7AM-6PM<br />Sat: 8AM-4PM</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
