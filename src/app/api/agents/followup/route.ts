import { NextRequest, NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  leadFirstName: z.string(),
  originalSubject: z.string(),
  followUpNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

// POST /api/agents/followup
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  try {
    return NextResponse.json(await generateFollowUp(parsed.data));
  } catch (raw) {
    return NextResponse.json({ error: "parseo fallido", raw: String(raw) }, { status: 502 });
  }
}
