import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SingleSMSRequest {
  phone: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get("SMSGATE_USERNAME");
    const password = Deno.env.get("SMSGATE_PASSWORD");
    const deviceId = Deno.env.get("SMSGATE_DEVICE_ID");

    if (!username || !password || !deviceId) {
      console.error("Missing SMS Gate credentials");
      return new Response(
        JSON.stringify({ success: false, error: "SMS Gate credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, message }: SingleSMSRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "No phone number provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || message.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Message is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending single SMS to ${phone} via SMS Gate`);

    // Basic Auth encoding
    const credentials = btoa(`${username}:${password}`);

    const requestBody = {
      phoneNumbers: [phone],
      message: message,
    };

    const response = await fetch(
      `https://api.sms-gate.app/3rdparty/v1/message?skipPhoneValidation=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${credentials}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseText = await response.text();
    console.log(`Response status: ${response.status}, body: ${responseText}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (response.ok) {
      console.log(`SMS sent successfully to ${phone}`);
      return new Response(
        JSON.stringify({ success: true, phone, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error(`Failed to send SMS to ${phone}: ${responseText}`);
      return new Response(
        JSON.stringify({ success: false, phone, error: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in send-single-sms function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
