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
import { sendEmail } from "@/lib/email";

export type LeadStatus = "new" | "emailed" | "opened" | "replied" | "meeting_sent" | "booked" | "rejected";

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
  /** Hay algún email entrante que AG-09 aún no ha clasificado */
  hasUnclassifiedReply: boolean;
}): OrchestratorDecision {
  const { leadId, status, daysInStatus, hasUnclassifiedReply } = params;

  if (status === "new") {
    return {
      leadId,
      nextAgent: "AG-19",
      action: "compliance-check",
      reason: "Todo lead nuevo pasa primero por el chequeo de cumplimiento antes de contactarlo.",
    };
  }

  if (hasUnclassifiedReply && ["emailed", "replied", "meeting_sent"].includes(status)) {
    return {
      leadId,
      nextAgent: "AG-09",
      action: "classify-reply",
      reason: "El lead ha respondido: hay que clasificar la intención antes de seguir.",
    };
  }

  if (status === "emailed" && daysInStatus >= 3) {
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

/** Envía el email (Resend, o simulado si no hay clave) y lo deja registrado en EmailLog. */
async function sendAndLog(lead: LeadWithContext, subject: string, body: string) {
  const sent = await sendEmail({ to: lead.email, subject, text: body });
  await db.emailLog.create({
    data: {
      leadId: lead.id,
      direction: "outbound",
      subject,
      body,
      messageId: sent.messageId,
      simulated: sent.simulated,
    },
  });
  return sent;
}

function sentLabel(simulated: boolean) {
  return simulated ? "envío simulado (falta RESEND_API_KEY/EMAIL_FROM)" : "enviado";
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
        senderCompany:
          lead.campaign.client.companyName ?? lead.campaign.client.domain ?? "tu empresa",
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

      const sent = await sendAndLog(lead, email.subject, email.body);
      await db.lead.update({ where: { id: lead.id }, data: { status: "emailed" } });

      return {
        executed: true,
        summary: `Email inicial a ${lead.email} aprobado por AG-19: ${sentLabel(sent.simulated)}.`,
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
      if (classification.category === "no_interesado" || classification.category === "baja") {
        newStatus = "rejected";
      } else if (
        (classification.category === "interesado" || classification.category === "pregunta") &&
        lead.status !== "meeting_sent" // ya tiene el enlace de reserva: no se lo reenviamos
      ) {
        newStatus = "replied";
      }
      await db.lead.update({
        where: { id: lead.id },
        data: { lastClassifiedAt: new Date(), ...(newStatus ? { status: newStatus } : {}) },
      });
      // Solo se contesta a las preguntas: si está "interesado", el siguiente paso
      // (AG-10) ya le escribe con el enlace para agendar, sin mandarle dos emails.
      if (classification.category === "pregunta" && classification.suggestedReply) {
        const lastOutboundSubject = [...lead.emailLogs].reverse().find((l) => l.direction === "outbound")?.subject;
        await sendAndLog(
          lead,
          lastOutboundSubject ? `Re: ${lastOutboundSubject.replace(/^Re:\s*/i, "")}` : "Re:",
          classification.suggestedReply
        );
      }

      const summary = `Respuesta clasificada como "${classification.category}"${newStatus ? ` -> status "${newStatus}"` : ""}.`;

      // Si está interesado, AG-10 le manda el enlace para agendar ya, sin esperar
      // a la siguiente pasada del cron (que puede ser mañana).
      if (classification.category === "interesado" && newStatus === "replied") {
        const booking = await executeDecision(
          { ...lead, status: "replied" },
          { leadId: lead.id, nextAgent: "AG-10", action: "book-meeting", reason: "Interesado: agendar ya." }
        );
        return { executed: true, summary: `${summary} ${booking.summary}`, details: { classification, booking: booking.details } };
      }

      return { executed: true, summary, details: classification };
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

      const sent = await sendAndLog(lead, email.subject, email.body);

      return {
        executed: true,
        summary: `Seguimiento nº${followUpNumber}: ${sentLabel(sent.simulated)}.`,
        details: email,
      };
    }

    case "book-meeting": {
      const result = await bookMeeting({
        leadFirstName: lead.fullName.split(" ")[0],
        bookingUrl: lead.campaign.client.bookingUrl,
      });
      const sent = await sendAndLog(lead, result.subject, result.body);
      // Pasa a "booked" cuando el lead reserve de verdad (webhook de Cal.com)
      await db.lead.update({ where: { id: lead.id }, data: { status: "meeting_sent" } });

      return {
        executed: true,
        summary: result.bookingUrl
          ? `Enlace de reserva de Cal.com: ${sentLabel(sent.simulated)}. Pasará a "reunión" cuando reserve.`
          : `Propuesta de reunión por email (el cliente no tiene enlace de Cal.com): ${sentLabel(sent.simulated)}.`,
        details: result,
      };
    }

    default:
      return { executed: false, summary: "Sin acción que ejecutar por ahora." };
  }
}

export interface RunOptions {
  dryRun?: boolean;
  clientId?: string;
}

/**
 * Recorre los leads de campañas ACTIVAS (working/scaling: las que están en borrador
 * o pausadas no se tocan), decide qué agente debe actuar en cada uno y lo ejecuta.
 * Como mucho MAX_ACTIONS_PER_RUN acciones por pasada (20 por defecto), para no pasarse
 * del tiempo máximo de la función ni quemar el dominio enviando de golpe.
 */
export async function runOrchestrator({ dryRun = false, clientId }: RunOptions = {}) {
  const maxActions = Number(process.env.MAX_ACTIONS_PER_RUN) || 20;

  const leads = await db.lead.findMany({
    where: {
      status: { notIn: ["booked", "rejected"] },
      campaign: { status: { in: ["working", "scaling"] }, ...(clientId ? { clientId } : {}) },
    },
    include: {
      emailLogs: { orderBy: { sentAt: "asc" } },
      campaign: { include: { client: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const results: { leadId: string; leadName: string; decision: OrchestratorDecision; execution?: ExecutionResult }[] = [];
  let actions = 0;
  for (const lead of leads) {
    const lastLog = lead.emailLogs[lead.emailLogs.length - 1];
    const daysInStatus = lastLog
      ? Math.floor((Date.now() - lastLog.sentAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const classifiedAt = lead.lastClassifiedAt?.getTime() ?? 0;
    const hasUnclassifiedReply = lead.emailLogs.some(
      (l) => l.direction === "inbound" && l.sentAt.getTime() > classifiedAt
    );

    const decision = decideNextAction({
      leadId: lead.id,
      status: lead.status as LeadStatus,
      daysInStatus,
      hasUnclassifiedReply,
    });
    const base = { leadId: lead.id, leadName: lead.fullName, decision };

    if (dryRun || decision.action === "no-op") {
      results.push(base);
      continue;
    }
    if (actions >= maxActions) {
      results.push({ ...base, execution: { executed: false, summary: "Límite de acciones por pasada alcanzado; se hará en la siguiente." } });
      continue;
    }
    actions++;

    try {
      results.push({ ...base, execution: await executeDecision(lead, decision) });
    } catch (err) {
      // Un fallo en un lead (respuesta de Claude no parseable, rate limit, Resend
      // rechaza el email...) no debe tumbar el resto del batch.
      results.push({ ...base, execution: { executed: false, summary: "Error al ejecutar la acción.", details: String(err) } });
    }
  }

  return { processed: leads.length, actions, dryRun, results };
}
