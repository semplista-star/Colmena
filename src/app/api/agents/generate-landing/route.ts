import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  description: z.string(),
  icpSegment: z.string(),   // a quién va dirigida esta landing concreta
  ctaText: z.string().default("Reservar una llamada"),
});

// POST /api/agents/generate-landing
// Devuelve HTML autocontenido (una sola sección: hero + beneficios + CTA), listo
// para servir directamente o guardar como página estática por campaña/segmento.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, description, icpSegment, ctaText } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Genera el HTML completo (con <style> inline, sin dependencias externas) de una landing page
de UNA sola sección para ${companyName} (${description}), dirigida específicamente a "${icpSegment}".
Debe tener: titular potente, 3 beneficios concretos para ese segmento, y un botón con el texto "${ctaText}".
Diseño oscuro, tipografía moderna, sin imágenes externas (solo CSS/SVG si hace falta).
Devuelve SOLO el HTML, empezando por <!DOCTYPE html>, sin explicación ni markdown.`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const html = textBlock && "text" in textBlock ? textBlock.text.replace(/```html|```/g, "").trim() : "";

  return NextResponse.json({ html, icpSegment });
}
