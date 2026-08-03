// El orquestador NO es un agente más: es la lógica que decide, para cada lead,
// qué agente debe actuar a continuación según su estado actual.
// En producción esto se dispara con un cron/cola (Inngest, BullMQ) cada pocos minutos.
// Aquí está la lógica pura, desacoplada del scheduler, para poder testearla y
// llamarla también manualmente desde /api/orchestrator/run.

export type LeadStatus = "new" | "emailed" | "opened" | "replied" | "booked" | "rejected";

export interface OrchestratorDecision {
  leadId: string;
  nextAgent: string;   // id del agente que debe actuar, ej "AG-06"
  action: string;       // acción concreta a ejecutar
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
