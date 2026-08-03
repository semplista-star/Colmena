import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  campaignName: z.string(),
  leadsGenerated: z.number(),
  costPerLeadEUR: z.number(),
  targetCostPerLeadEUR: z.number(),
  meetingsBooked: z.number(),
});

// POST /api/agents/campaign-status
// Regla de negocio determinista (no hace falta IA para esto, es más barato y fiable así):
// - Escala si el coste por lead está por debajo del objetivo y hay reuniones agendadas.
// - Pausa si el coste por lead supera 1.5x el objetivo, o si no hay ni un lead tras umbral razonable.
// - Si no, se mantiene ("working") mientras se recogen más datos.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { campaignName, leadsGenerated, costPerLeadEUR, targetCostPerLeadEUR, meetingsBooked } = parsed.data;

  let status: "scaling" | "working" | "paused";
  let reason: string;

  if (costPerLeadEUR > targetCostPerLeadEUR * 1.5) {
    status = "paused";
    reason = `Coste por lead (${costPerLeadEUR}€) supera 1.5x el objetivo (${targetCostPerLeadEUR}€).`;
  } else if (leadsGenerated >= 10 && costPerLeadEUR <= targetCostPerLeadEUR && meetingsBooked > 0) {
    status = "scaling";
    reason = "Coste por lead dentro de objetivo y ya generando reuniones: aumentar presupuesto.";
  } else {
    status = "working";
    reason = "Rendimiento dentro de rango normal, seguir recogiendo datos antes de decidir.";
  }

  return NextResponse.json({ campaignName, status, reason });
}
