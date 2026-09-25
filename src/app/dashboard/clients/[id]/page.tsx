import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CampaignStatus from "@/components/dashboard/CampaignStatus";
import AddLeads from "@/components/dashboard/AddLeads";
import LeadRow from "@/components/dashboard/LeadRow";
import OrchestratorPanel from "@/components/dashboard/OrchestratorPanel";
import DbError from "@/components/dashboard/DbError";
import BookingSettings from "@/components/dashboard/BookingSettings";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { id: string } }) {
  let client;
  try {
    client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      campaigns: {
        orderBy: { fitScore: "desc" },
        include: {
          leads: { orderBy: { createdAt: "desc" }, include: { emailLogs: { orderBy: { sentAt: "asc" } } } },
        },
      },
    },
    });
  } catch (error) {
    return <><Link href="/dashboard" className="muted">← Clientes</Link><DbError error={error} /></>;
  }
  if (!client) notFound();

  const allLeads = client.campaigns.flatMap((c) => c.leads);
  const count = (s: string) => allLeads.filter((l) => l.status === s).length;
  const sent = allLeads.reduce((n, l) => n + l.emailLogs.filter((e) => e.direction === "outbound").length, 0);

  return (
    <>
      <Link href="/dashboard" className="muted">← Clientes</Link>
      <h1 style={{ fontSize: 30, marginTop: 10 }}>{client.companyName ?? client.domain}</h1>
      <p className="muted" style={{ marginTop: 6, maxWidth: 720 }}>{client.description}</p>

      <div className="row" style={{ marginTop: 18, gap: 8 }}>
        <span className="pill">{allLeads.length} leads</span>
        <span className="pill">{sent} emails enviados</span>
        <span className="pill">{count("replied") + count("meeting_sent")} interesados</span>
        <span className="pill ok">{count("booked")} reuniones</span>
      </div>

      <OrchestratorPanel clientId={client.id} />

      <BookingSettings
        clientId={client.id}
        bookingUrl={client.bookingUrl}
        webhookUrl={`${process.env.APP_URL?.startsWith("https://") ? process.env.APP_URL : "https://www.colmenalife.com"}/api/webhooks/calcom`}
        webhookSecret={process.env.CALCOM_WEBHOOK_SECRET ?? null}
      />

      {client.campaigns.map((camp) => (
        <div className="card" key={camp.id}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>{camp.name}</h2>
              <p className="muted">Encaje {camp.fitScore ?? "—"}% · {camp.leads.length} leads</p>
            </div>
            <CampaignStatus id={camp.id} status={camp.status} />
          </div>

          {camp.leads.length > 0 && (
            <div className="scroll-x">
              <table className="table">
                <thead><tr><th>Lead</th><th>Empresa</th><th>Email</th><th>Estado</th><th>Emails</th><th></th></tr></thead>
                <tbody>
                  {camp.leads.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={{
                        id: lead.id,
                        fullName: lead.fullName,
                        role: lead.role,
                        companyName: lead.companyName,
                        email: lead.email,
                        status: lead.status,
                        logs: lead.emailLogs.map((l) => ({
                          id: l.id,
                          direction: l.direction,
                          subject: l.subject,
                          body: l.body,
                          simulated: l.simulated,
                          sentAt: l.sentAt.toISOString(),
                        })),
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AddLeads campaignId={camp.id} />
        </div>
      ))}
    </>
  );
}
