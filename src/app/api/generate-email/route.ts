import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  senderCompany: z.string(),
  senderDescription: z.string(),
  lead: z.object({
    fullName: z.string(),
    role: z.string().optional(),
    companyName: z.string().optional(),
  }),
});

// POST /api/generate-email
// Devuelve { subject, body } personalizado para ese lead concreto
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }
  const { senderCompany, senderDescription, lead } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Eres un SDR escribiendo un email de prospección en frío en español, breve (máx 80 palabras), sin sonar a plantilla genérica.

Remitente: ${senderCompany} — ${senderDescription}
Destinatario: ${lead.fullName}, ${lead.role ?? "responsable"} en ${lead.companyName ?? "su empresa"}

Reglas:
- Personaliza mencionando algo específico y plausible del destinatario/su empresa.
- Termina con una pregunta de bajo compromiso (no pidas una demo directamente).
- Sin firma, sin "Saludos", solo el cuerpo.

Devuelve SOLO un JSON: {"subject": string, "body": string}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch {
    return NextResponse.json({ error: "parseo fallido", raw }, { status: 502 });
  }
}
