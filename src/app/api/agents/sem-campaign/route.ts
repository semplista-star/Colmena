import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  description: z.string(),
  icpSegment: z.string(),
  monthlyBudgetEUR: z.number(),
});

// POST /api/agents/sem-campaign
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, description, icpSegment, monthlyBudgetEUR } = parsed.data;

  const plan = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Eres un media buyer experto en Google Ads (red de búsqueda).
Empresa: ${companyName} — ${description}
Segmento objetivo: ${icpSegment}
Presupuesto mensual: ${monthlyBudgetEUR}€

Devuelve SOLO JSON:
{
  "campaignType": "Search",
  "dailyBudgetEUR": number,
  "adGroups": [
    {
      "name": string,
      "keywords": [ { "term": string, "matchType": "exacta"|"frase"|"amplia" } ],
      "negativeKeywords": string[],
      "ads": [ { "headlines": string[], "descriptions": string[] } ]  // 3 titulares, 2 descripciones (formato responsive search ad)
    }
  ]
}`,
    }],
  });

  const textBlock = plan.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  let campaignPlan;
  try {
    campaignPlan = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return NextResponse.json({ error: "parseo fallido", raw }, { status: 502 });
  }

  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_CUSTOMER_ID) {
    return NextResponse.json({
      campaignPlan,
      published: false,
      note: "Plan generado por IA. Falta GOOGLE_ADS_DEVELOPER_TOKEN / GOOGLE_ADS_CUSTOMER_ID para publicarlo de verdad.",
    });
  }

  // Llamada real pendiente: Google Ads API (googleads.googleapis.com)

  return NextResponse.json({ campaignPlan, published: false, note: "Publicación real pendiente de implementar." });
}
