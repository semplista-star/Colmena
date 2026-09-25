import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  fullName: z.string(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
});

// POST /api/agents/enrich-lead  (AG-04 Enriquecedor)
// Real con APOLLO_API_KEY; sin ella devuelve una estimación marcada como simulated.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  try {
    return NextResponse.json(await enrichLead(parsed.data));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
