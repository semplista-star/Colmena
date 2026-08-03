// Lógica reutilizable de los agentes que SÍ pueden actuar hoy (no dependen de
// una API externa que aún no tenemos). Las rutas /api/agents/* son wrappers
// finos alrededor de estas funciones, y el orquestador (src/lib/orchestrator.ts)
// las llama directamente, sin pasar por HTTP, para poder ejecutar la acción
// completa en un solo POST /api/orchestrator/run.

import { anthropic, MODEL } from "@/lib/anthropic";

function extractJson(raw: string): unknown {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

async function askClaudeJson(prompt: string, maxTokens: number): Promise<unknown> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  return extractJson(raw);
}

// --- AG-06 Redactor -------------------------------------------------------

export interface GenerateEmailInput {
  senderCompany: string;
  senderDescription: string;
  lead: { fullName: string; role?: string; companyName?: string };
}
export interface GeneratedEmail {
  subject: string;
  body: string;
}

export async function generateEmail(input: GenerateEmailInput): Promise<GeneratedEmail> {
  const { senderCompany, senderDescription, lead } = input;
  const result = await askClaudeJson(
    `Eres un SDR escribiendo un email de prospección en frío en español, breve (máx 80 palabras), sin sonar a plantilla genérica.

Remitente: ${senderCompany} — ${senderDescription}
Destinatario: ${lead.fullName}, ${lead.role ?? "responsable"} en ${lead.companyName ?? "su empresa"}

Reglas:
- Personaliza mencionando algo específico y plausible del destinatario/su empresa.
- Termina con una pregunta de bajo compromiso (no pidas una demo directamente).
- Sin firma, sin "Saludos", solo el cuerpo.

Devuelve SOLO un JSON: {"subject": string, "body": string}`,
    500
  );
  const email = result as GeneratedEmail;
  return { ...email, body: withUnsubscribeFooter(email.body) };
}

// Vía de baja real (no generada por IA, para garantizar que siempre está presente
// y que AG-19 Cumplimiento pueda aprobar el envío conforme a RGPD/CAN-SPAM).
function withUnsubscribeFooter(body: string): string {
  return `${body}\n\nSi prefieres no recibir más emails, responde "BAJA" a este correo.`;
}

// --- AG-19 Cumplimiento -----------------------------------------------------

export interface ComplianceInput {
  emailBody: string;
  hasUnsubscribeLink: boolean;
  sentToCountLast30Days: number;
}
export interface ComplianceResult {
  approved: boolean;
  issues: string[];
}

export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const { emailBody, hasUnsubscribeLink, sentToCountLast30Days } = input;
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

  return { approved: issues.length === 0, issues };
}

// --- AG-09 Conserje ----------------------------------------------------------

export interface ClassifyReplyInput {
  replyText: string;
}
export interface ClassifyReplyResult {
  category: "interesado" | "pregunta" | "no_interesado" | "fuera_oficina" | "baja";
  confidence: number;
  suggestedReply: string | null;
}

export async function classifyReply(input: ClassifyReplyInput): Promise<ClassifyReplyResult> {
  const result = await askClaudeJson(
    `Clasifica este email de respuesta de un lead: "${input.replyText}"

Categorías posibles: "interesado", "pregunta", "no_interesado", "fuera_oficina", "baja".
Si es "interesado" o "pregunta", redacta también una respuesta breve y útil.

Devuelve SOLO JSON:
{"category": string, "confidence": number, "suggestedReply": string | null}`,
    400
  );
  return result as ClassifyReplyResult;
}

// --- AG-07 Rotafolios ----------------------------------------------------

export interface FollowUpInput {
  leadFirstName: string;
  originalSubject: string;
  followUpNumber: 1 | 2 | 3;
}

export async function generateFollowUp(input: FollowUpInput): Promise<GeneratedEmail> {
  const { leadFirstName, originalSubject, followUpNumber } = input;
  const tone =
    followUpNumber === 1
      ? "amable recordatorio, muy breve"
      : followUpNumber === 2
      ? "aportando un dato o caso de éxito nuevo, breve"
      : "último contacto, honesto sobre que es el último email, sin presión";

  const result = await askClaudeJson(
    `Escribe el email de seguimiento número ${followUpNumber} para ${leadFirstName}, en respuesta al hilo "${originalSubject}".
Tono: ${tone}. Máximo 50 palabras. En español. Sin saludo formal tipo "Estimado/a".
Devuelve SOLO JSON: {"subject": string, "body": string}`,
    300
  );
  const email = result as GeneratedEmail;
  return { ...email, body: withUnsubscribeFooter(email.body) };
}

// --- AG-10 Agenda (simulado hasta tener CALCOM_API_KEY) --------------------

export interface BookMeetingInput {
  leadFirstName: string;
}
export interface BookMeetingResult {
  booked: boolean;
  simulated: boolean;
  slot: string; // ISO datetime
  note: string;
}

export async function bookMeeting(input: BookMeetingInput): Promise<BookMeetingResult> {
  // TODO cuando exista CALCOM_API_KEY: sustituir por una llamada real a
  // POST https://api.cal.com/v2/bookings con los huecos disponibles reales.
  const slot = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // "dentro de 3 días", determinista para pruebas
  slot.setHours(10, 0, 0, 0);

  return {
    booked: true,
    simulated: !process.env.CALCOM_API_KEY,
    slot: slot.toISOString(),
    note: process.env.CALCOM_API_KEY
      ? "CALCOM_API_KEY detectada, pero la integración real aún no está implementada en el código."
      : `Reunión simulada para ${input.leadFirstName}. Falta CALCOM_API_KEY para agendar de verdad en Cal.com.`,
  };
}
