import { NextRequest, NextResponse } from "next/server";
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
  const { emailBody, hasUnsubscribeLink, sentToCountLast30Days } = parsed.data;

  const issues: string[] = [];

  if (!hasUnsubscribeLink) {
    issues.push("Falta vía de baja/unsubscribe visible (obligatorio en RGPD y CAN-SPAM).");
  }
  if (sentToCountLast30Days >= 3) {
    issues.push("Ya se ha contactado 3+ veces en 30 días: riesgo de acoso comercial, pausar secuencia.");
  }
  const sensitivePatterns = /salud|religión|orientación sexual|origen étnico|afiliación política/i;
  if (sensitivePatterns.test(emailBody)) {
    issues.push("El texto menciona una categoría de dato sensible (RGPD art. 9): revisar manualmente.");
  }

  return NextResponse.json({
    approved: issues.length === 0,
    issues,
  });
}
