import { NextRequest, NextResponse } from "next/server";
import { resolveTxt } from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/agents/inbox-health?domain=tuweb.com  (AG-08 Buzón)
// SPF y DMARC son registros DNS públicos: se comprueban de verdad, sin API key.
// DKIM depende de un "selector" específico del proveedor de email (ej. resend._domainkey),
// así que eso sigue pendiente de RESEND_API_KEY / configurarlo a mano.
async function findTxtRecord(hostname: string, prefix: string): Promise<string | null> {
  try {
    const records = await resolveTxt(hostname);
    const match = records.map((r) => r.join("")).find((r) => r.startsWith(prefix));
    return match ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return NextResponse.json({ error: "domain requerido" }, { status: 400 });

  const [spf, dmarc] = await Promise.all([
    findTxtRecord(domain, "v=spf1"),
    findTxtRecord(`_dmarc.${domain}`, "v=DMARC1"),
  ]);

  return NextResponse.json({
    domain,
    spf: spf ? { configured: true, record: spf } : { configured: false },
    dmarc: dmarc ? { configured: true, record: dmarc } : { configured: false },
    dkim: {
      checked: false,
      note: "DKIM depende del selector de tu proveedor de email (ej. resend._domainkey); configúralo con RESEND_API_KEY y vuelve a revisar.",
    },
  });
}
