import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  campaignName: z.string(),
  leadsGenerated: z.number(),
  meetingsBooked: z.number(),
  totalSpendEUR: z.number(),
  avgDealValueEUR: z.number().optional(),
});

// POST /api/agents/roi-report  (AG-16 Contable)
// Es puro cálculo, no necesita IA ni API externa. Lo único pendiente es que el
// gasto (totalSpendEUR) hoy se pasa a mano; con META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN
// conectados vendría automáticamente de sus APIs de reporting.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { campaignName, leadsGenerated, meetingsBooked, totalSpendEUR, avgDealValueEUR } = parsed.data;

  const costPerLead = leadsGenerated > 0 ? totalSpendEUR / leadsGenerated : null;
  const costPerMeeting = meetingsBooked > 0 ? totalSpendEUR / meetingsBooked : null;
  const estimatedRevenue = avgDealValueEUR != null ? avgDealValueEUR * meetingsBooked : null;
  const estimatedROI =
    estimatedRevenue != null && totalSpendEUR > 0
      ? (estimatedRevenue - totalSpendEUR) / totalSpendEUR
      : null;

  return NextResponse.json({
    campaignName,
    costPerLead,
    costPerMeeting,
    estimatedRevenue,
    estimatedROI,
    note: !process.env.META_ACCESS_TOKEN && !process.env.LINKEDIN_ACCESS_TOKEN
      ? "totalSpendEUR se pasa a mano: falta META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN para leerlo automáticamente."
      : undefined,
  });
}
