import { NextRequest, NextResponse } from "next/server";
import { seededRandom } from "@/lib/simulate";
import { z } from "zod";

const bodySchema = z.object({
  platform: z.enum(["meta", "linkedin"]),
  domain: z.string(),
});

const EVENTS = ["PageView", "Lead", "Purchase"];

// POST /api/agents/pixel-setup  (AG-15 Píxel)
// TODO: cuando haya META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN, sustituir por la
// creación real del Meta Pixel / LinkedIn Insight Tag vía sus APIs y devolver
// el snippet de tracking real para instalar en la web del cliente.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { platform, domain } = parsed.data;

  const rand = seededRandom(`${platform}-${domain}`);
  const pixelId = String(Math.floor(rand() * 9e14) + 1e14);
  const keyMissing = platform === "meta" ? !process.env.META_ACCESS_TOKEN : !process.env.LINKEDIN_ACCESS_TOKEN;

  return NextResponse.json({
    simulated: keyMissing,
    note: keyMissing
      ? `Falta ${platform === "meta" ? "META_ACCESS_TOKEN" : "LINKEDIN_ACCESS_TOKEN"}: pixelId simulado, no instalado de verdad.`
      : "Clave detectada, pero la creación real del píxel aún no está implementada en el código.",
    platform,
    domain,
    pixelId,
    events: EVENTS,
  });
}
