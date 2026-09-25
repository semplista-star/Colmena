import { db } from "@/lib/db";

/** "Ana Pérez <ana@empresa.com>" -> "ana@empresa.com" */
export function extractAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

/** Quita el hilo citado ("> ...", "El lun, ... escribió:") para quedarnos solo con lo nuevo. */
export function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex(
    (l) => /^>/.test(l) || /^(El|On) .+(escribió|wrote):?\s*$/i.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l)
  );
  return (cut === -1 ? lines : lines.slice(0, cut)).join("\n").trim() || text.trim();
}

/**
 * Registra la respuesta de un lead como EmailLog entrante. El orquestador la
 * verá en su siguiente pasada y AG-09 la clasificará.
 */
export async function recordInboundReply(params: { from: string; subject?: string; text: string }) {
  const address = extractAddress(params.from);
  const lead = await db.lead.findFirst({
    where: { email: { equals: address, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (!lead) return null;

  return db.emailLog.create({
    data: {
      leadId: lead.id,
      direction: "inbound",
      subject: params.subject ?? null,
      body: stripQuotedReply(params.text),
    },
  });
}
