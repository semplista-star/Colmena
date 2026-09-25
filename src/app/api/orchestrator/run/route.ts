import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";
// Cada acción puede suponer una o dos llamadas a Claude + un envío de email.
export const maxDuration = 60;

// POST /api/orchestrator/run            -> decide y ejecuta (botón del panel)
// POST /api/orchestrator/run?dryRun=1   -> solo decide, no ejecuta nada
// POST /api/orchestrator/run?clientId=x -> solo los leads de ese cliente
export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return NextResponse.json(
    await runOrchestrator({
      dryRun: params.get("dryRun") === "1",
      clientId: params.get("clientId") ?? undefined,
    })
  );
}

// GET lo usa Vercel Cron (vercel.json). El middleware exige el CRON_SECRET.
export async function GET() {
  return NextResponse.json(await runOrchestrator());
}
