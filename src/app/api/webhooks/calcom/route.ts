import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/webhooks/calcom
// En Cal.com: Settings -> Developer -> Webhooks, evento "Booking Created",
// URL https://www.colmenalife.com/api/webhooks/calcom y como secret CALCOM_WEBHOOK_SECRET.
// Cuando un lead reserva con el enlace que le mandó AG-10, pasa a "booked".
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "falta CALCOM_WEBHOOK_SECRET" }, { status: 500 });

  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const received = req.headers.get("x-cal-signature-256") ?? "";
  if (
    received.length !== expected.length ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const event = JSON.parse(raw) as {
    triggerEvent?: string;
    payload?: { startTime?: string; attendees?: { email?: string }[] };
  };
  if (event.triggerEvent !== "BOOKING_CREATED") return NextResponse.json({ ignored: true });

  const emails = (event.payload?.attendees ?? []).map((a) => a.email?.toLowerCase()).filter(Boolean) as string[];
  const updated = [];
  for (const email of emails) {
    const lead = await db.lead.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, status: { not: "booked" } },
      orderBy: { createdAt: "desc" },
    });
    if (!lead) continue;
    await db.lead.update({ where: { id: lead.id }, data: { status: "booked" } });
    await db.emailLog.create({
      data: {
        leadId: lead.id,
        direction: "inbound",
        subject: "Reunión reservada en Cal.com",
        body: `Reserva confirmada para ${event.payload?.startTime ?? "fecha no indicada"}.`,
      },
    });
    updated.push(lead.id);
  }
  return NextResponse.json({ updated });
}
