import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  leadId: z.string(),
});

// POST /api/score-lead  { "leadId": "..." }
// Puntúa un lead concreto contra el ICP guardado de su cliente y actualiza fitScore.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "leadId requerido" }, { status: 400 });

  const lead = await db.lead.findUnique({
    where: { id: parsed.data.leadId },
    include: { campaign: { include: { client: true } } },
  });
  if (!lead) return NextResponse.json({ error: "lead no encontrado" }, { status: 404 });

  const icp = lead.campaign.client.icpProfile;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Perfil de cliente ideal (ICP) de ${lead.campaign.client.companyName}: ${JSON.stringify(icp)}

Lead a evaluar: ${lead.fullName}, ${lead.role ?? "cargo desconocido"} en ${lead.companyName ?? "empresa desconocida"}.

Devuelve SOLO JSON: {"fitScore": number (0-100), "reasoning": string}`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  let scored;
  try {
    scored = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return NextResponse.json({ error: "parseo fallido", raw }, { status: 502 });
  }

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: { fitScore: scored.fitScore },
  });

  return NextResponse.json({ lead: updated, reasoning: scored.reasoning });
}
