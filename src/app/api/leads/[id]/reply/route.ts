import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripQuotedReply } from "@/lib/inbound";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ text: z.string().min(1), subject: z.string().optional() });

// POST /api/leads/:id/reply — registrar a mano una respuesta del lead (desde el panel),
// para cuando aún no está configurado el webhook de entrada.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "texto requerido" }, { status: 400 });
  const log = await db.emailLog.create({
    data: {
      leadId: params.id,
      direction: "inbound",
      subject: parsed.data.subject ?? null,
      body: stripQuotedReply(parsed.data.text),
    },
  });
  return NextResponse.json(log, { status: 201 });
}
