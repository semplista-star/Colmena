import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seededRandom } from "@/lib/simulate";
import { z } from "zod";

const bodySchema = z.object({
  leadId: z.string(),
  crm: z.enum(["hubspot", "pipedrive", "salesforce"]),
});

const KEY_BY_CRM: Record<string, string> = {
  hubspot: "HUBSPOT_API_KEY",
  pipedrive: "PIPEDRIVE_API_KEY",
  salesforce: "SALESFORCE_API_KEY",
};

// POST /api/agents/crm-sync  (AG-18 CRM)
// TODO: sustituir por la llamada real al CRM del cliente (HubSpot/Pipedrive/Salesforce API)
// cuando tengamos la clave correspondiente (aún no está ni en .env.example: se añade
// cuando el cliente elija su CRM).
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { leadId, crm } = parsed.data;

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "lead no encontrado" }, { status: 404 });

  const requiredKey = KEY_BY_CRM[crm];
  const rand = seededRandom(`${crm}-${leadId}`);
  const externalId = `${crm}_${Math.floor(rand() * 1e9)}`;

  return NextResponse.json({
    simulated: !process.env[requiredKey],
    note: `Falta ${requiredKey}: contacto no creado de verdad en ${crm}, solo simulado.`,
    leadId,
    crm,
    externalId,
    syncedFields: { fullName: lead.fullName, email: lead.email, companyName: lead.companyName },
  });
}
