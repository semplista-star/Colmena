import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
