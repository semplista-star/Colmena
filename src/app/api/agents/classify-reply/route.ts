import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  replyText: z.string().min(1),
});

// POST /api/agents/classify-reply
// Clasifica la respuesta de un lead y, si procede, redacta la contestación.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { replyText } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Clasifica este email de respuesta de un lead: "${replyText}"

Categorías posibles: "interesado", "pregunta", "no_interesado", "fuera_oficina", "baja".
Si es "interesado" o "pregunta", redacta también una respuesta breve y útil.

Devuelve SOLO JSON:
{"category": string, "confidence": number, "suggestedReply": string | null}`,
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
