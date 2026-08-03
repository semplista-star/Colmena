import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decideNextAction, executeDecision, LeadStatus, LeadWithContext } from "@/lib/orchestrator";

// POST /api/orchestrator/run
// POST /api/orchestrator/run?dryRun=1  -> decide pero no ejecuta (solo lectura)
// En producción, esto lo dispara un cron cada 15 min (Vercel Cron / Inngest).
// Recorre los leads activos, decide qué agente debe actuar en cada uno y EJECUTA
// esa acción (genera el email, comprueba cumplimiento, clasifica respuestas, agenda...).
export async function POST(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const leads = await db.lead.findMany({
    where: { status: { notIn: ["booked", "rejected"] } },
    include: {
      emailLogs: { orderBy: { sentAt: "asc" } },
      campaign: { include: { client: true } },
    },
  });

  const results = [];
  for (const lead of leads) {
    const lastLog = lead.emailLogs[lead.emailLogs.length - 1];
    const daysInStatus = lastLog
      ? Math.floor((Date.now() - lastLog.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const hasReplied = lead.emailLogs.some((l) => l.direction === "inbound");

    const decision = decideNextAction({
      leadId: lead.id,
      status: lead.status as LeadStatus,
      daysInStatus,
      hasReplied,
    });

    if (dryRun || decision.action === "no-op") {
      results.push({ decision });
      continue;
    }

    try {
      const execution = await executeDecision(lead as LeadWithContext, decision);
      results.push({ decision, execution });
    } catch (err) {
      // Un fallo en un lead (ej. respuesta de Claude no parseable, rate limit,
      // falta ANTHROPIC_API_KEY) no debe tumbar el resto del batch.
      results.push({
        decision,
        execution: { executed: false, summary: "Error al ejecutar la acción.", details: String(err) },
      });
    }
  }

  return NextResponse.json({ processed: leads.length, dryRun, results });
}
