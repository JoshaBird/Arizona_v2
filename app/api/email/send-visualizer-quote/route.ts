import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VisualizerQuoteData {
  name: string;
  email: string;
  phone: string;
  address: string;
  templateName: string;
  customDetails: string;
  originalImageUrl: string;
  resultImageUrl: string;
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const quoteData: VisualizerQuoteData = await request.json();

    console.log("Received visualizer quote submission:", quoteData);

    const emailHtml = `
      <h2>New Quote Request from Oak & Iron Visualizer</h2>
      
      <h3>Contact Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${quoteData.name}</li>
        <li><strong>Email:</strong> ${quoteData.email}</li>
        <li><strong>Phone:</strong> ${quoteData.phone}</li>
        <li><strong>Address:</strong> ${
          quoteData.address || "Not provided"
        }</li>
      </ul>
      
      <h3>Project Details:</h3>
      <ul>
        <li><strong>Template Used:</strong> ${quoteData.templateName}</li>
        <li><strong>Custom Details:</strong> ${
          quoteData.customDetails || "None provided"
        }</li>
      </ul>
      
      <h3>Project Images:</h3>
      <div style="margin: 20px 0;">
        <h4>Before Image:</h4>
        <img src="${
          quoteData.originalImageUrl
        }" alt="Original house image" style="max-width: 400px; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0;">
      </div>
      
      <div style="margin: 20px 0;">
        <h4>After Image (Visualized Result):</h4>
        <img src="${
          quoteData.resultImageUrl
        }" alt="Visualized transformation" style="max-width: 400px; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0;">
      </div>
      
      <hr>
      <p><em>This email was sent from the Oak & Iron project visualizer.</em></p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Oak & Iron <onboarding@resend.dev>",
      to: [process.env.RECIPIENT_EMAIL || "jbird@troboncompanies.com"],
      subject: "Oak & Iron — New Quote Request",
      html: emailHtml,
    });

    console.log("Visualizer quote email sent successfully:", emailResponse);

    return NextResponse.json(
      { success: true, data: emailResponse },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-visualizer-quote API route:", error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}
