import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  recipients: string[];
  message: string;
  userId: string;
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
        JSON.stringify({ error: "SMS Gate credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipients, message, userId }: SMSRequest = await req.json();

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

    console.log(`Sending SMS to ${recipients.length} recipients via SMS Gate`);
    console.log(`Using device ID: ${deviceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Basic Auth encoding
    const credentials = btoa(`${username}:${password}`);

    const results = [];
    const errors = [];

    for (const phone of recipients) {
      try {
        console.log(`Sending SMS to ${phone}`);
        
        // SMS Gate API format: phoneNumbers array and textMessage object
        const requestBody = {
          phoneNumbers: [phone],
          message: message,
        };
        
        console.log(`Request body: ${JSON.stringify(requestBody)}`);
        
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
          results.push({ phone, success: true, data });
        } else {
          console.error(`Failed to send SMS to ${phone}: ${responseText}`);
          errors.push({ phone, success: false, error: data });
        }
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error.message);
        errors.push({ phone, success: false, error: error.message });
      }
    }

    // Save campaign to database
    if (userId) {
      const { error: campaignError } = await supabase
        .from('sms_campaigns')
        .insert({
          message: message,
          total_recipients: recipients.length,
          successful_sends: results.length,
          failed_sends: errors.length,
          created_by: userId
        });

      if (campaignError) {
        console.error('Error saving campaign:', campaignError);
      } else {
        console.log('Campaign saved successfully');
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
