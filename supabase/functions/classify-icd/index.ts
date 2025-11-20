import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diagnosis, anamnesis, objectiveFindings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!diagnosis) {
      return new Response(
        JSON.stringify({ error: "Dijagnoza je obavezna" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const systemPrompt = `Ti si medicinski asistent specijalizovan za međunarodnu klasifikaciju bolesti (ICD-10).
Tvoj zadatak je da na osnovu dijagnoze, anamneze i objektivnog nalaza dodeli odgovarajuće ICD-10 kodove.

Pravila:
- Uvek navedi 1-3 najrelevantnije ICD-10 koda
- Za svaki kod navedi naziv dijagnoze na srpskom jeziku
- Budi precizan i koristi samo validne ICD-10 kodove
- Ako ima više relevantnih stanja, navedi ih po prioritetu`;

    const userPrompt = `Molim te dodeli ICD-10 kodove za sledeći medicinski slučaj:

Dijagnoza: ${diagnosis}
${anamnesis ? `\nAnamneza: ${anamnesis}` : ''}
${objectiveFindings ? `\nObjektivni nalaz: ${objectiveFindings}` : ''}`;

    console.log("Calling Lovable AI for ICD classification");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_icd",
              description: "Klasifikuj dijagnozu prema ICD-10 standardu",
              parameters: {
                type: "object",
                properties: {
                  codes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: { 
                          type: "string",
                          description: "ICD-10 kod (npr. I10, E11.9)"
                        },
                        description: { 
                          type: "string",
                          description: "Naziv dijagnoze na srpskom"
                        }
                      },
                      required: ["code", "description"],
                      additionalProperties: false
                    },
                    minItems: 1,
                    maxItems: 3
                  }
                },
                required: ["codes"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_icd" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Previše zahteva, pokušajte ponovo za koji trenutak." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Potrebno je dodati kredite za AI funkcionalnost." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway greška");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI nije vratio strukturirane podatke");
    }

    const icdCodes = JSON.parse(toolCall.function.arguments);
    console.log("ICD Codes extracted:", icdCodes);

    return new Response(
      JSON.stringify(icdCodes),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in classify-icd function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Greška pri klasifikaciji"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
