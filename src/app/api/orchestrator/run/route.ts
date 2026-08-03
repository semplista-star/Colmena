import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decideNextAction, LeadStatus } from "@/lib/orchestrator";

// POST /api/orchestrator/run
// En producción, esto lo dispara un cron cada 15 min (Vercel Cron / Inngest).
// Recorre los leads activos y decide qué agente debe actuar en cada uno.
export async function POST() {
  const leads = await db.lead.findMany({
    where: { status: { notIn: ["booked", "rejected"] } },
    include: { emailLogs: { orderBy: { sentAt: "desc" }, take: 1 } },
  });

  const decisions = leads.map((lead) => {
    const lastLog = lead.emailLogs[0];
    const daysInStatus = lastLog
      ? Math.floor((Date.now() - lastLog.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const hasReplied = lead.emailLogs.some((l) => l.direction === "inbound");

    return decideNextAction({
      leadId: lead.id,
      status: lead.status as LeadStatus,
      daysInStatus,
      hasReplied,
    });
  });

  // Aquí, para cada decisión, se llamaría al endpoint del agente correspondiente
  // (AG-06 generate-email, AG-07 followup, AG-09 classify-reply, etc.)
  // Se deja como lista de tareas para no disparar acciones reales sin supervisión aún.

  return NextResponse.json({ processed: leads.length, decisions });
}
