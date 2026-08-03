import { NextRequest, NextResponse } from "next/server";
import { generateEmail } from "@/lib/agentActions";
import { z } from "zod";

const bodySchema = z.object({
  senderCompany: z.string(),
  senderDescription: z.string(),
  lead: z.object({
    fullName: z.string(),
    role: z.string().optional(),
    companyName: z.string().optional(),
  }),
});

// POST /api/generate-email
// Devuelve { subject, body } personalizado para ese lead concreto
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  try {
    const email = await generateEmail(parsed.data);
    return NextResponse.json(email);
  } catch (raw) {
    return NextResponse.json({ error: "parseo fallido", raw: String(raw) }, { status: 502 });
  }
}
