import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  clientName: z.string(),
  weekRange: z.string(), // ej "28 jul - 3 ago"
  leadsGenerated: z.number(),
  emailsSent: z.number(),
  meetingsBooked: z.number(),
  totalSpendEUR: z.number(),
});

// POST /api/agents/weekly-report
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const data = parsed.data;
  const costPerLead = data.leadsGenerated > 0 ? (data.totalSpendEUR / data.leadsGenerated).toFixed(2) : "0";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 350,
    messages: [{
      role: "user",
      content: `Escribe un resumen semanal breve (5-6 frases, español, tono directo y cercano) para ${data.clientName}
sobre la semana ${data.weekRange}: ${data.leadsGenerated} leads generados, ${data.emailsSent} emails enviados,
${data.meetingsBooked} reuniones agendadas, ${data.totalSpendEUR}€ gastados (${costPerLead}€ por lead).
Termina con una recomendación concreta de cara a la semana siguiente.`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const summary = textBlock && "text" in textBlock ? textBlock.text : "";

  return NextResponse.json({ summary, metrics: { ...data, costPerLead } });
}
