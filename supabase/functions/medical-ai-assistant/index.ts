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
    const { type, symptoms, anamnesis, objectiveFindings, diagnosis } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";
    let toolDefinition: any = null;

    if (type === "diagnosis") {
      systemPrompt = `Ti si iskusan lekar specijalizovan za dijagnostiku. 
Tvoj zadatak je da na osnovu simptoma, anamneze i objektivnog nalaza predložiš 3-5 mogućih dijagnoza sa ICD-10 kodovima.
Dijagnoze treba da budu poređane po verovatnoći (od najverovatnije ka najmanje verovatnoj).
VAŽNO: Objašnjenje mora biti maksimalno 2 kratke rečenice.`;

      userPrompt = `Na osnovu sledećih podataka predloži dijagnoze:
${symptoms ? `\nSimptomi: ${symptoms}` : ''}
${anamnesis ? `\nAnamneza: ${anamnesis}` : ''}
${objectiveFindings ? `\nObjektivni nalaz: ${objectiveFindings}` : ''}`;

      toolDefinition = {
        type: "function",
        function: {
          name: "suggest_diagnoses",
          description: "Predloži dijagnoze sa ICD-10 kodovima",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    diagnosis: { 
                      type: "string",
                      description: "Naziv dijagnoze"
                    },
                    icd_code: { 
                      type: "string",
                      description: "ICD-10 kod"
                    },
                    probability: { 
                      type: "string",
                      enum: ["visoka", "srednja", "niska"],
                      description: "Verovatnoća dijagnoze"
                    },
                    explanation: { 
                      type: "string",
                      description: "Kratko objašnjenje zašto je ova dijagnoza moguća"
                    }
                  },
                  required: ["diagnosis", "icd_code", "probability", "explanation"],
                  additionalProperties: false
                },
                minItems: 3,
                maxItems: 5
              }
            },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      };

    } else if (type === "therapy") {
      if (!diagnosis) {
        return new Response(
          JSON.stringify({ error: "Dijagnoza je obavezna za predlog terapije" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = `Ti si iskusan lekar specijalizovan za farmakoterapiju.
Tvoj zadatak je da na osnovu dijagnoze predložiš odgovarajuću terapiju prema važećim medicinskim protokolima.
VAŽNO: Odgovor mora biti maksimalno 3 rečenice - kratko i jasno samo lekove, dozu i trajanje.`;

      userPrompt = `Predloži terapiju za sledeću dijagnozu:
Dijagnoza: ${diagnosis}
${anamnesis ? `\nAnamneza: ${anamnesis}` : ''}`;

      toolDefinition = {
        type: "function",
        function: {
          name: "suggest_therapy",
          description: "Predloži terapiju",
              parameters: {
                type: "object",
                properties: {
                  therapy: {
                    type: "string",
                    description: "Kratka terapija u maksimalno 3 rečenice - samo lekovi, doze i trajanje"
                  }
                },
                required: ["therapy"],
                additionalProperties: false
              }
        }
      };

    } else if (type === "control") {
      if (!diagnosis) {
        return new Response(
          JSON.stringify({ error: "Dijagnoza je obavezna za predlog kontrole" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = `Ti si iskusan lekar specijalizovan za praćenje i monitoring pacijenata.
Tvoj zadatak je da predložiš plan kontrolnih pregleda i analiza na osnovu dijagnoze.`;

      userPrompt = `Predloži plan kontrole za sledeću dijagnozu:
Dijagnoza: ${diagnosis}`;

      toolDefinition = {
        type: "function",
        function: {
          name: "suggest_control",
          description: "Predloži plan kontrole",
          parameters: {
            type: "object",
            properties: {
              control_plan: {
                type: "string",
                description: "Detaljan plan kontrolnih pregleda i analiza"
              },
              timeline: {
                type: "string",
                description: "Vremenski okvir za kontrole"
              }
            },
            required: ["control_plan"],
            additionalProperties: false
          }
        }
      };

    } else {
      return new Response(
        JSON.stringify({ error: "Nepoznat tip zahteva" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Calling Lovable AI for medical assistance - type: ${type}`);

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
        tools: [toolDefinition],
        tool_choice: { type: "function", function: { name: toolDefinition.function.name } }
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

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Result extracted:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in medical-ai-assistant function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Greška pri AI asistenciji"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
