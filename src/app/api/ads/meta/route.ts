import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  description: z.string(),
  icpSegment: z.string(), // ej: "Wedding floral studios"
  monthlyBudgetEUR: z.number(),
});

// POST /api/ads/meta
// PASO 1 (implementado): la IA (AG-11) diseña la estructura de campaña.
// PASO 2 (pendiente de tu META_ACCESS_TOKEN): publicarla de verdad en Meta Marketing API.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, description, icpSegment, monthlyBudgetEUR } = parsed.data;

  const plan = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `Eres un media buyer experto en Meta Ads (Facebook/Instagram).
Empresa: ${companyName} — ${description}
Segmento objetivo: ${icpSegment}
Presupuesto mensual: ${monthlyBudgetEUR}€

Devuelve SOLO un JSON con esta forma:
{
  "objective": "LEAD_GENERATION" | "CONVERSIONS" | "TRAFFIC",
  "dailyBudgetEUR": number,
  "audience": { "ageRange": string, "interests": string[], "placements": string[] },
  "adCopies": [ { "headline": string, "primaryText": string } ]  // 3 variantes
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

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
    return NextResponse.json({
      campaignPlan,
      published: false,
      note: "Plan generado por IA. Falta META_ACCESS_TOKEN / META_AD_ACCOUNT_ID para publicarlo de verdad en Meta.",
    });
  }

  // Aquí iría la llamada real a Meta Marketing API (graph.facebook.com/v21.0/{ad_account_id}/campaigns)
  // usando process.env.META_ACCESS_TOKEN. Se deja preparado para cuando tengas las credenciales.

  return NextResponse.json({ campaignPlan, published: false, note: "Publicación real pendiente de implementar." });
}
