import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  domain: z.string().min(3),
});

// POST /api/analyze-website  { "domain": "larksilk.com" }
// Devuelve: descripción del negocio + segmentos de cliente ideal con fit score
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "domain requerido" }, { status: 400 });
  }
  const { domain } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Analiza la empresa detrás del dominio ${domain} usando búsqueda web.
Devuelve SOLO un JSON (sin texto extra, sin markdown) con esta forma exacta:
{
  "companyName": string,
  "description": string,
  "segments": [
    { "name": string, "fitScore": number (0-100), "reasoning": string }
  ]
}
Incluye entre 4 y 6 segmentos de cliente potencial, ordenados de mayor a menor fitScore.
"reasoning": UNA sola frase, máximo 20 palabras, con tus propias palabras — sin citas textuales ni comillas largas.
"description": máximo 40 palabras.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  let parsedJson;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    parsedJson = JSON.parse(clean);
  } catch (e) {
    return NextResponse.json(
      {
        error: "No se pudo parsear la respuesta de la IA",
        truncated: message.stop_reason === "max_tokens",
        raw,
      },
      { status: 502 }
    );
  }

  const client = await db.client.upsert({
    where: { domain },
    update: {
      companyName: parsedJson.companyName,
      description: parsedJson.description,
      icpProfile: parsedJson.segments,
    },
    create: {
      domain,
      companyName: parsedJson.companyName,
      description: parsedJson.description,
      icpProfile: parsedJson.segments,
    },
  });

  // AG-02 crea automáticamente una campaña en borrador por cada segmento detectado
  await db.campaign.createMany({
    data: parsedJson.segments.map((s: { name: string; fitScore: number }) => ({
      clientId: client.id,
      name: s.name,
      fitScore: s.fitScore,
      status: "draft",
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ clientId: client.id, ...parsedJson });
}
