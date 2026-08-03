import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  campaignName: z.string(),
  last72hSpendEUR: z.number(),
  last72hLeadsGenerated: z.number(),
  targetCostPerLeadEUR: z.number(),
});

// POST /api/agents/bid-adjustment  (AG-14 Puja)
// Regla de negocio determinista, igual que AG-17 (campaign-status): no necesita IA.
// Lo que SÍ falta es la fuente real de gasto/leads de las últimas 72h — hoy se
// pasa a mano en el body; cuando META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN estén
// conectados, ese dato vendría directo de sus APIs de reporting.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { campaignName, last72hSpendEUR, last72hLeadsGenerated, targetCostPerLeadEUR } = parsed.data;

  const costPerLead = last72hLeadsGenerated > 0 ? last72hSpendEUR / last72hLeadsGenerated : null;

  let decision: "subir" | "bajar" | "mantener";
  let budgetMultiplier: number;
  let reason: string;

  if (costPerLead === null) {
    decision = "bajar";
    budgetMultiplier = 0.8;
    reason = "Sin leads en las últimas 72h: reducir presupuesto hasta ver señales de rendimiento.";
  } else if (costPerLead <= targetCostPerLeadEUR * 0.8) {
    decision = "subir";
    budgetMultiplier = 1.2;
    reason = `Coste por lead (${costPerLead.toFixed(2)}€) muy por debajo del objetivo (${targetCostPerLeadEUR}€): margen para escalar.`;
  } else if (costPerLead > targetCostPerLeadEUR * 1.3) {
    decision = "bajar";
    budgetMultiplier = 0.7;
    reason = `Coste por lead (${costPerLead.toFixed(2)}€) supera 1.3x el objetivo (${targetCostPerLeadEUR}€): reducir para no quemar presupuesto.`;
  } else {
    decision = "mantener";
    budgetMultiplier = 1;
    reason = "Coste por lead dentro de rango aceptable: mantener presupuesto actual.";
  }

  return NextResponse.json({
    campaignName,
    costPerLead,
    decision,
    budgetMultiplier,
    reason,
    note:
      !process.env.META_ACCESS_TOKEN && !process.env.LINKEDIN_ACCESS_TOKEN
        ? "El dato de gasto/leads de 72h se pasa a mano: falta META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN para leerlo en automático de sus APIs de reporting."
        : undefined,
  });
}
