import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  leadFirstName: z.string(),
  originalSubject: z.string(),
  followUpNumber: z.number().min(1).max(3),
});

// POST /api/agents/followup
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { leadFirstName, originalSubject, followUpNumber } = parsed.data;

  const tone =
    followUpNumber === 1 ? "amable recordatorio, muy breve"
    : followUpNumber === 2 ? "aportando un dato o caso de éxito nuevo, breve"
    : "último contacto, honesto sobre que es el último email, sin presión";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Escribe el email de seguimiento número ${followUpNumber} para ${leadFirstName}, en respuesta al hilo "${originalSubject}".
Tono: ${tone}. Máximo 50 palabras. En español. Sin saludo formal tipo "Estimado/a".
Devuelve SOLO JSON: {"subject": string, "body": string}`,
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
