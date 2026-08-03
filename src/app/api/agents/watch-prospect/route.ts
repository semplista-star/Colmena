import { NextRequest, NextResponse } from "next/server";
import { seededRandom } from "@/lib/simulate";
import { z } from "zod";

const bodySchema = z.object({
  domain: z.string(),
});

// POST /api/agents/watch-prospect  (AG-05 Vigía)
// TODO: sustituir por un scrape/diff real de la web + perfiles públicos del prospecto
// (o una API de monitorización) cuando esté disponible.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { domain } = parsed.data;

  // Determinista por dominio + día, para que el resultado sea estable dentro del mismo día
  // pero pueda variar de un día a otro en pruebas repetidas.
  const today = new Date().toISOString().slice(0, 10);
  const rand = seededRandom(`${domain}-${today}`);
  const changesDetected = rand() > 0.7;

  return NextResponse.json({
    simulated: true,
    note: "Sin fuente de monitorización real conectada: resultado simulado.",
    changesDetected,
    changes: changesDetected ? ["Se detectó un cambio de titular/CEO en la web pública."] : [],
    checkedAt: new Date().toISOString(),
  });
}
