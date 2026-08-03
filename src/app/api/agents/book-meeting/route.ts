import { NextRequest, NextResponse } from "next/server";
import { bookMeeting } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  leadFirstName: z.string(),
});

// POST /api/agents/book-meeting  (AG-10 Agenda)
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  return NextResponse.json(await bookMeeting(parsed.data));
}
