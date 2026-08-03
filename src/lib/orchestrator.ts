// El orquestador NO es un agente más: es la lógica que decide, para cada lead,
// qué agente debe actuar a continuación según su estado actual — y luego EJECUTA
// esa acción de verdad (genera el email, comprueba cumplimiento, clasifica la
// respuesta, agenda la reunión...), persistiendo el resultado en la base de datos.
// En producción esto se dispara con un cron/cola (Inngest, BullMQ) cada pocos minutos.
// Aquí está la lógica pura, desacoplada del scheduler, para poder testearla y
// llamarla también manualmente desde /api/orchestrator/run.

import type { Campaign, Client, EmailLog, Lead } from "@prisma/client";
import { db } from "@/lib/db";
import {
  bookMeeting,
  checkCompliance,
  classifyReply,
  generateEmail,
  generateFollowUp,
} from "@/lib/agentActions";

export type LeadStatus = "new" | "emailed" | "opened" | "replied" | "booked" | "rejected";

export interface OrchestratorDecision {
  leadId: string;
  nextAgent: string; // id del agente que debe actuar, ej "AG-06"
  action: string; // acción concreta a ejecutar
  reason: string;
}

/**
 * Dado el estado de un lead y cuánto tiempo lleva en ese estado,
 * decide qué agente debe actuar a continuación.
 */
export function decideNextAction(params: {
  leadId: string;
  status: LeadStatus;
  daysInStatus: number;
  hasReplied: boolean;
}): OrchestratorDecision {
  const { leadId, status, daysInStatus, hasReplied } = params;

  if (status === "new") {
    return {
      leadId,
      nextAgent: "AG-19",
      action: "compliance-check",
      reason: "Todo lead nuevo pasa primero por el chequeo de cumplimiento antes de contactarlo.",
    };
  }

  if (status === "emailed" && hasReplied) {
    return {
      leadId,
      nextAgent: "AG-09",
      action: "classify-reply",
      reason: "El lead ha respondido: hay que clasificar la intención antes de seguir.",
    };
  }

  if (status === "emailed" && !hasReplied && daysInStatus >= 3) {
    return {
      leadId,
      nextAgent: "AG-07",
      action: "followup",
      reason: "Han pasado 3+ días sin respuesta: toca el primer seguimiento.",
    };
  }

  if (status === "replied") {
    return {
      leadId,
      nextAgent: "AG-10",
      action: "book-meeting",
      reason: "El lead mostró interés: intentar agendar la reunión.",
    };
  }

  return {
    leadId,
    nextAgent: "AG-20",
    action: "no-op",
    reason: "Sin acción pendiente por ahora.",
  };
}

export type LeadWithContext = Lead & {
  emailLogs: EmailLog[];
  campaign: Campaign & { client: Client };
};

export interface ExecutionResult {
  executed: boolean;
  summary: string;
  details?: unknown;
}

/**
 * Ejecuta de verdad la decisión del orquestador: llama al agente correspondiente
 * (vía src/lib/agentActions) y persiste el resultado (EmailLog, cambio de status).
 */
export async function executeDecision(
  lead: LeadWithContext,
  decision: OrchestratorDecision
): Promise<ExecutionResult> {
  switch (decision.action) {
    case "compliance-check": {
      const email = await generateEmail({
        senderCompany: lead.campaign.client.companyName ?? lead.campaign.client.domain,
        senderDescription: lead.campaign.client.description ?? "",
        lead: {
          fullName: lead.fullName,
          role: lead.role ?? undefined,
          companyName: lead.companyName ?? undefined,
        },
      });

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const sentToCountLast30Days = lead.emailLogs.filter(
        (l) => l.direction === "outbound" && l.sentAt.getTime() >= thirtyDaysAgo
      ).length;

      const compliance = checkCompliance({
        emailBody: email.body,
        hasUnsubscribeLink: true, // agentActions.generateEmail añade siempre la vía de baja
        sentToCountLast30Days,
      });

      if (!compliance.approved) {
        return {
          executed: false,
          summary: "Email generado pero bloqueado por el chequeo de cumplimiento.",
          details: { email, compliance },
        };
      }

      await db.emailLog.create({
        data: { leadId: lead.id, direction: "outbound", subject: email.subject, body: email.body },
      });
      await db.lead.update({ where: { id: lead.id }, data: { status: "emailed" } });

      return {
        executed: true,
        summary: `Email inicial generado, aprobado y enviado (simulado) a ${lead.email}.`,
        details: { email, compliance },
      };
    }

    case "classify-reply": {
      const lastInbound = [...lead.emailLogs].reverse().find((l) => l.direction === "inbound");
      if (!lastInbound) {
        return { executed: false, summary: "No hay ningún email entrante que clasificar todavía." };
      }

      const classification = await classifyReply({ replyText: lastInbound.body });

      let newStatus: LeadStatus | null = null;
      if (classification.category === "interesado" || classification.category === "pregunta") {
        newStatus = "replied";
      } else if (classification.category === "no_interesado" || classification.category === "baja") {
        newStatus = "rejected";
      }
      if (newStatus) {
        await db.lead.update({ where: { id: lead.id }, data: { status: newStatus } });
      }
      if (classification.suggestedReply) {
        const lastOutboundSubject = [...lead.emailLogs].reverse().find((l) => l.direction === "outbound")?.subject;
        await db.emailLog.create({
          data: {
            leadId: lead.id,
            direction: "outbound",
            subject: lastOutboundSubject ? `Re: ${lastOutboundSubject}` : "Re:",
            body: classification.suggestedReply,
          },
        });
      }

      return {
        executed: true,
        summary: `Respuesta clasificada como "${classification.category}"${newStatus ? ` -> status "${newStatus}"` : ""}.`,
        details: classification,
      };
    }

    case "followup": {
      const outbound = lead.emailLogs.filter((l) => l.direction === "outbound");
      const followUpNumber = outbound.length; // el 1er outbound es el email inicial (no cuenta como seguimiento)
      if (followUpNumber < 1 || followUpNumber > 3) {
        return {
          executed: false,
          summary: "Ya se enviaron los 3 seguimientos posibles; requiere revisión manual.",
        };
      }

      const originalSubject = outbound[0]?.subject ?? "tu email anterior";
      const email = await generateFollowUp({
        leadFirstName: lead.fullName.split(" ")[0],
        originalSubject,
        followUpNumber: followUpNumber as 1 | 2 | 3,
      });

      await db.emailLog.create({
        data: { leadId: lead.id, direction: "outbound", subject: email.subject, body: email.body },
      });

      return {
        executed: true,
        summary: `Seguimiento nº${followUpNumber} generado y enviado (simulado).`,
        details: email,
      };
    }

    case "book-meeting": {
      const result = await bookMeeting({ leadFirstName: lead.fullName.split(" ")[0] });
      await db.lead.update({ where: { id: lead.id }, data: { status: "booked" } });
      await db.emailLog.create({
        data: {
          leadId: lead.id,
          direction: "outbound",
          subject: "Reunión confirmada",
          body: `Reunión agendada para ${result.slot}. ${result.note}`,
        },
      });

      return {
        executed: true,
        summary: `Reunión ${result.simulated ? "simulada" : "real"} agendada para ${result.slot}.`,
        details: result,
      };
    }

    default:
      return { executed: false, summary: "Sin acción que ejecutar por ahora." };
  }
}
