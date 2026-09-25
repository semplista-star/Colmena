import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Sin esto, Next.js intenta pre-renderizar esta ruta como estática en build time
// (ejecutando la query contra la BD durante el build) y rompe el deploy si la BD
// no está disponible en ese momento.
export const dynamic = "force-dynamic";

// GET /api/clients — lista todos los clientes con sus campañas
export async function GET() {
  const clients = await db.client.findMany({
    include: { campaigns: { include: { _count: { select: { leads: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}

const patchSchema = z.object({
  id: z.string(),
  // Enlace público de Cal.com del cliente; "" lo borra
  bookingUrl: z.union([z.string().url().startsWith("https://"), z.literal("")]),
});

// PATCH /api/clients — el panel guarda aquí el enlace de Cal.com de cada cliente
export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enlace no válido: debe empezar por https://" }, { status: 400 });
  const updated = await db.client.update({
    where: { id: parsed.data.id },
    data: { bookingUrl: parsed.data.bookingUrl || null },
  });
  return NextResponse.json(updated);
}
