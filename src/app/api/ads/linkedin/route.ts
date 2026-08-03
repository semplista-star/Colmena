import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  description: z.string(),
  icpSegment: z.string(),      // ej: "Directores de RRHH en empresas de 50-500 empleados"
  monthlyBudgetEUR: z.number(),
});

// POST /api/ads/linkedin
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, description, icpSegment, monthlyBudgetEUR } = parsed.data;

  const plan = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `Eres un media buyer experto en LinkedIn Campaign Manager (B2B).
Empresa: ${companyName} — ${description}
Segmento objetivo: ${icpSegment}
Presupuesto mensual: ${monthlyBudgetEUR}€

Devuelve SOLO un JSON:
{
  "objective": "LEAD_GENERATION" | "WEBSITE_CONVERSIONS" | "BRAND_AWARENESS",
  "dailyBudgetEUR": number,
  "targeting": { "jobTitles": string[], "industries": string[], "companySize": string },
  "adCopies": [ { "headline": string, "introText": string } ]  // 3 variantes
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

  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_AD_ACCOUNT_ID) {
    return NextResponse.json({
      campaignPlan,
      published: false,
      note: "Plan generado por IA. Falta LINKEDIN_ACCESS_TOKEN / LINKEDIN_AD_ACCOUNT_ID para publicarlo de verdad.",
    });
  }

  // Llamada real pendiente: LinkedIn Marketing API (api.linkedin.com/rest/adCampaigns)

  return NextResponse.json({ campaignPlan, published: false, note: "Publicación real pendiente de implementar." });
}
