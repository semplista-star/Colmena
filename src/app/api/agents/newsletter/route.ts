import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  audience: z.string(),          // ej: "clientes actuales", "leads que aún no compraron"
  updates: z.array(z.string()).min(1).max(4), // novedades a incluir
});

// POST /api/agents/newsletter
// El envío real (a una lista de suscriptores) requiere RESEND_API_KEY o similar,
// aquí se genera el contenido, que es la parte que sí puede hacer la IA de forma fiable.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, audience, updates } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `Escribe una newsletter de ${companyName} para "${audience}", en español, tono cercano y directo.
Novedades a incluir: ${updates.join(" | ")}
Debe tener UNA sola llamada a la acción clara al final.

Devuelve SOLO JSON:
{"subject": string, "preheader": string, "body": string}`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  try {
    return NextResponse.json(JSON.parse(raw.replace(/```json|```/g, "").trim()));
  } catch {
    return NextResponse.json({ error: "parseo fallido", raw }, { status: 502 });
  }
}
