import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// GET /api/leads?campaignId=xxx
export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId") ?? undefined;
  const leads = await db.lead.findMany({
    where: campaignId ? { campaignId } : undefined,
    include: { emailLogs: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

const createSchema = z.object({
  campaignId: z.string(),
  fullName: z.string(),
  role: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email(),
  fitScore: z.number().optional(),
});

// POST /api/leads — crea un lead nuevo (viene de AG-04 Enriquecedor o de importación manual)
export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const lead = await db.lead.create({ data: parsed.data });
  return NextResponse.json(lead, { status: 201 });
}
