import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/campaigns?clientId=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;
  const campaigns = await db.campaign.findMany({
    where: clientId ? { clientId } : undefined,
    include: { leads: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "scaling", "working", "paused"]),
});

// PATCH /api/campaigns — usado por AG-17 (Semáforo) para actualizar el estado
export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const updated = await db.campaign.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json(updated);
}
