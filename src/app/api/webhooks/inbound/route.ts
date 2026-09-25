import { NextRequest, NextResponse } from "next/server";
import { recordInboundReply } from "@/lib/inbound";

export const dynamic = "force-dynamic";

// POST /api/webhooks/inbound?token=INBOUND_SECRET
// Recibe las respuestas de los leads. Acepta dos formatos:
//  - Genérico (Zapier/Make, reenvío de Gmail, Cloudmailin...): { from, subject, text }
//  - Webhook "email.received" de Resend Inbound: { type, data: { email_id, from, subject, text? } }
//    Si el webhook no trae el cuerpo, se descarga de la API de Resend con el email_id.
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret || req.nextUrl.searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const data = payload?.data ?? payload;
  const from: string | undefined = typeof data?.from === "string" ? data.from : data?.from?.email;
  if (!from) return NextResponse.json({ error: "falta from" }, { status: 400 });

  let text: string | undefined = data.text ?? data.plain ?? data["body-plain"];
  if (!text && data.email_id && process.env.RESEND_API_KEY) {
    const res = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) text = ((await res.json()) as { text?: string }).text;
  }

  const log = await recordInboundReply({ from, subject: data.subject, text: text ?? data.subject ?? "" });
  // 200 aunque no sea de ningún lead, para que el proveedor no reintente sin fin
  return NextResponse.json({ matched: Boolean(log), emailLogId: log?.id ?? null });
}
