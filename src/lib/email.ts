// Envío real de emails vía Resend (https://resend.com), usando su API REST
// directamente con fetch para no añadir dependencias.
// Sin RESEND_API_KEY + EMAIL_FROM el envío se simula: el flujo completo sigue
// funcionando (se guarda en EmailLog con simulated=true) pero nada sale a Internet.

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}
export interface SendEmailResult {
  simulated: boolean;
  messageId: string | null;
}

export function emailSendingEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!emailSendingEnabled()) return { simulated: true, messageId: null };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM, // ej: "Marta de Colmena <marta@mail.colmenalife.com>"
      to: [input.to],
      subject: input.subject,
      text: input.text,
      // Las respuestas deben llegar a un buzón que reenvíe a /api/webhooks/inbound
      reply_to: process.env.EMAIL_REPLY_TO || undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string };
  return { simulated: false, messageId: data.id ?? null };
}
