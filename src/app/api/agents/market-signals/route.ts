import { NextRequest, NextResponse } from "next/server";
import { seededRandom, pick } from "@/lib/simulate";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string(),
  domain: z.string(),
});

const SIGNAL_TYPES = [
  { type: "funding", template: (c: string) => `${c} cerró una ronda de financiación reciente.` },
  { type: "hiring", template: (c: string) => `${c} está contratando activamente para su equipo comercial.` },
  { type: "expansion", template: (c: string) => `${c} anunció expansión a un nuevo mercado.` },
  { type: "sin_señales", template: (c: string) => `No se detectan señales de compra recientes para ${c}.` },
] as const;

// POST /api/agents/market-signals  (AG-03 Radar)
// TODO: cuando haya API de noticias/LinkedIn conectada, sustituir la simulación
// por consultas reales (ej. NewsAPI, Google News RSS, LinkedIn Company Updates).
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { companyName, domain } = parsed.data;

  const rand = seededRandom(domain);
  const signal = pick(rand, SIGNAL_TYPES);

  return NextResponse.json({
    simulated: true,
    note: "Sin fuente de noticias/LinkedIn conectada todavía: señal generada de forma simulada.",
    signals: [
      {
        type: signal.type,
        description: signal.template(companyName),
        detectedAt: new Date().toISOString(),
      },
    ],
  });
}
