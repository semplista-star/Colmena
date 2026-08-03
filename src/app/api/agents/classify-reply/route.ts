import { NextRequest, NextResponse } from "next/server";
import { classifyReply } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  replyText: z.string().min(1),
});

// POST /api/agents/classify-reply
// Clasifica la respuesta de un lead y, si procede, redacta la contestación.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  try {
    return NextResponse.json(await classifyReply(parsed.data));
  } catch (raw) {
    return NextResponse.json({ error: "parseo fallido", raw: String(raw) }, { status: 502 });
  }
}
