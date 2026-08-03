import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/anthropic";
import { z } from "zod";

const bodySchema = z.object({
  domain: z.string(),
  description: z.string(),
});

// POST /api/agents/seo-audit
// Nota: sin GOOGLE_SEARCH_CONSOLE_* o AHREFS_API_KEY esto es una estimación
// razonada por IA, no datos reales de volumen de búsqueda. Útil para arrancar,
// pero para cifras exactas hay que conectar Search Console (gratis) o Ahrefs/Semrush (de pago).
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { domain, description } = parsed.data;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `Eres consultor SEO. Web: ${domain} — ${description}. Usa búsqueda web para entender el sector.

Devuelve SOLO JSON:
{
  "keywords": [ { "term": string, "intent": "informacional"|"comercial"|"transaccional", "priority": "alta"|"media"|"baja" } ],  // 10-15 palabras clave
  "onPageFixes": string[],   // 5-8 mejoras concretas y accionables
  "contentIdeas": string[]   // 5 ideas de artículo de blog para captar tráfico
}`,
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
