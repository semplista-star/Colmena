import { NextRequest, NextResponse } from "next/server";
import { seededRandom, pick, slugifyEmailPart } from "@/lib/simulate";
import { z } from "zod";

const bodySchema = z.object({
  fullName: z.string(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
});

const ROLES = ["CEO", "Director/a de Marketing", "Head of Sales", "Responsable de Operaciones", "Founder"];
const SIZES = ["1-10", "11-50", "51-200", "201-500"];

// POST /api/agents/enrich-lead  (AG-04 Enriquecedor)
// TODO: cuando exista APOLLO_API_KEY, sustituir por una llamada real a
// la People Search API de Apollo (o Clearbit) para resolver estos datos de verdad.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { fullName, companyName, companyDomain } = parsed.data;

  const rand = seededRandom(fullName + (companyDomain ?? companyName ?? ""));
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ") || first;
  const guessedEmail = companyDomain
    ? `${slugifyEmailPart(first)}.${slugifyEmailPart(last)}@${companyDomain}`
    : null;

  return NextResponse.json({
    simulated: !process.env.APOLLO_API_KEY,
    note: process.env.APOLLO_API_KEY
      ? "APOLLO_API_KEY detectada, pero la integración real aún no está implementada en el código."
      : "Falta APOLLO_API_KEY: email y datos de empresa son una estimación, no verificados.",
    email: guessedEmail,
    role: pick(rand, ROLES),
    companySize: pick(rand, SIZES),
  });
}
