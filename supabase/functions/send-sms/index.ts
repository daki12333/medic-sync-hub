import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  recipients: string[];
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TEXTBEE_API_KEY");
    const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

    if (!apiKey || !deviceId) {
      console.error("Missing TextBee credentials");
      return new Response(
        JSON.stringify({ error: "TextBee credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipients, message }: SMSRequest = await req.json();

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || message.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Message is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending SMS to ${recipients.length} recipients`);

    const results = [];
    const errors = [];

    for (const phone of recipients) {
      try {
        const response = await fetch(
          `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/sendSMS`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              recipients: [phone],
              message: message,
            }),
          }
        );

        const data = await response.json();
        
        if (response.ok) {
          console.log(`SMS sent successfully to ${phone}`);
          results.push({ phone, success: true, data });
        } else {
          console.error(`Failed to send SMS to ${phone}:`, data);
          errors.push({ phone, success: false, error: data });
        }
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
        errors.push({ phone, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.length,
        failed: errors.length,
        results,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
