import { NextRequest, NextResponse } from "next/server";
import { checkCompliance } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  emailBody: z.string(),
  hasUnsubscribeLink: z.boolean(),
  sentToCountLast30Days: z.number(), // veces que se ha contactado a este lead en 30 días
});

// POST /api/agents/compliance-check
// Reglas deterministas de cumplimiento básico (RGPD art. 21 + CAN-SPAM):
// esto NO sustituye asesoría legal, es una primera capa de seguridad automática.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  return NextResponse.json(checkCompliance(parsed.data));
}
