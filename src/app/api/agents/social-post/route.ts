import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  topic: z.string(),
  platforms: z.array(z.enum(["linkedin", "instagram", "x"])).min(1),
});

// POST /api/agents/social-post
// Genera el texto. La publicación real (programada) requiere el token de cada red
// (Meta Graph API para Instagram, LinkedIn Marketing API, X API) — se deja para
// cuando conectes esas cuentas; el contenido ya se puede copiar/pegar hoy mismo.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, topic, platforms } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `Genera un post de ${companyName} sobre "${topic}" para cada una de estas redes: ${platforms.join(", ")}.
Reglas por red: LinkedIn (profesional, hasta 3 párrafos cortos, sin hashtags excesivos),
Instagram (cercano, con 3-5 hashtags relevantes al final), X (máx 280 caracteres, directo).

Devuelve SOLO JSON: {"posts": [{"platform": string, "text": string}]}`,
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
