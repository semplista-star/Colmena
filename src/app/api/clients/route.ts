import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/clients — lista todos los clientes con sus campañas
export async function GET() {
  const clients = await db.client.findMany({
    include: { campaigns: { include: { _count: { select: { leads: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}
