import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  description: z.string(),
  icpSegment: z.string(),
  platform: z.enum(["meta", "linkedin"]),
  variantCount: z.number().min(1).max(5).default(3),
});

// POST /api/agents/generate-ad-creative
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, description, icpSegment, platform, variantCount } = parsed.data;

  const styleNote =
    platform === "meta"
      ? "tono cercano, directo, orientado a beneficio inmediato (B2C o self-serve)"
      : "tono profesional, orientado a ROI y credibilidad (B2B)";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Genera ${variantCount} variantes de anuncio para ${companyName} (${description}), dirigidas a "${icpSegment}" en ${platform === "meta" ? "Meta Ads" : "LinkedIn Ads"}.
Estilo: ${styleNote}.
Cada variante: titular (máx 8 palabras) + texto principal (máx 40 palabras) + CTA.

Devuelve SOLO JSON: {"variants": [{"headline": string, "body": string, "cta": string}]}`,
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
