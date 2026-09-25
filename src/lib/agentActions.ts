// Lógica reutilizable de los agentes que SÍ pueden actuar hoy (no dependen de
// una API externa que aún no tenemos). Las rutas /api/agents/* son wrappers
// finos alrededor de estas funciones, y el orquestador (src/lib/orchestrator.ts)
// las llama directamente, sin pasar por HTTP, para poder ejecutar la acción
// completa en un solo POST /api/orchestrator/run.

import { anthropic, MODEL } from "@/lib/anthropic";
import { pick, seededRandom, slugifyEmailPart } from "@/lib/simulate";

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

// --- AG-10 Agenda -----------------------------------------------------------
// Cada cliente conecta SU Cal.com: guarda su enlace público en el panel
// (Client.bookingUrl, ej. https://cal.com/mimper/30min) y el agente se lo envía al
// lead para que elija hueco. Cuando el lead reserva, Cal.com avisa a
// /api/webhooks/calcom y el lead pasa a "booked". No hace falta API key de Cal.com.
// CALCOM_BOOKING_URL queda solo como enlace por defecto si el cliente no tiene uno.

export interface BookMeetingInput {
  leadFirstName: string;
  bookingUrl?: string | null;
}
export interface BookMeetingResult {
  simulated: boolean;
  bookingUrl: string | null;
  subject: string;
  body: string;
}

export async function bookMeeting(input: BookMeetingInput): Promise<BookMeetingResult> {
  const bookingUrl = input.bookingUrl || process.env.CALCOM_BOOKING_URL || null;
  const body = bookingUrl
    ? `¡Genial, ${input.leadFirstName}! Para no marear con idas y venidas, aquí puedes elegir el hueco que mejor te venga (30 min):\n\n${bookingUrl}\n\nSi ninguno te encaja, dime un par de opciones y me adapto.`
    : `¡Genial, ${input.leadFirstName}! ¿Qué día y hora te vendrían bien esta semana o la próxima para una llamada de 30 minutos?`;

  return {
    simulated: !bookingUrl,
    bookingUrl,
    subject: "Buscamos hueco para hablar",
    body,
  };
}

// --- AG-04 Enriquecedor --------------------------------------------------------
// Real con APOLLO_API_KEY (People Match de Apollo: busca a la persona y devuelve
// email verificado, cargo y tamaño de empresa). Sin clave, estimación determinista.

export interface EnrichLeadInput {
  fullName: string;
  companyName?: string;
  companyDomain?: string;
}
export interface EnrichLeadResult {
  simulated: boolean;
  note: string;
  email: string | null;
  role: string | null;
  companySize: string | null;
  linkedinUrl?: string | null;
}

const ROLES = ["CEO", "Director/a de Marketing", "Head of Sales", "Responsable de Operaciones", "Founder"];
const SIZES = ["1-10", "11-50", "51-200", "201-500"];

export async function enrichLead(input: EnrichLeadInput): Promise<EnrichLeadResult> {
  const { fullName, companyName, companyDomain } = input;
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ") || first;

  if (process.env.APOLLO_API_KEY) {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": process.env.APOLLO_API_KEY,
      },
      body: JSON.stringify({
        first_name: first,
        last_name: last,
        organization_name: companyName,
        domain: companyDomain,
      }),
    });
    if (!res.ok) throw new Error(`Apollo ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      person?: {
        email?: string | null;
        title?: string | null;
        linkedin_url?: string | null;
        organization?: { estimated_num_employees?: number | null } | null;
      } | null;
    };
    const person = data.person;
    const employees = person?.organization?.estimated_num_employees;
    return {
      simulated: false,
      note: person ? "Datos de Apollo." : "Apollo no encontró a esta persona.",
      email: person?.email ?? null,
      role: person?.title ?? null,
      companySize: employees ? String(employees) : null,
      linkedinUrl: person?.linkedin_url ?? null,
    };
  }

  const rand = seededRandom(fullName + (companyDomain ?? companyName ?? ""));
  return {
    simulated: true,
    note: "Falta APOLLO_API_KEY: email y datos de empresa son una estimación, no verificados.",
    email: companyDomain
      ? `${slugifyEmailPart(first)}.${slugifyEmailPart(last)}@${companyDomain}`
      : null,
    role: pick(rand, ROLES),
    companySize: pick(rand, SIZES),
  };
}
