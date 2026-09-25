import Link from "next/link";
import { db } from "@/lib/db";
import { getIntegrations } from "@/lib/integrations";
import NewClientForm from "@/components/dashboard/NewClientForm";
import DbError from "@/components/dashboard/DbError";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let clients;
  try {
    clients = await db.client.findMany({
      include: { campaigns: { include: { _count: { select: { leads: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    return <><h1 style={{ fontSize: 30 }}>Panel de control</h1><DbError error={error} /></>;
  }
  const integrations = getIntegrations();
  const pending = integrations.filter((i) => !i.configured);

  return (
    <>
      <h1 style={{ fontSize: 30 }}>Panel de control</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Da de alta un cliente con su web: AG-01 y AG-02 analizan el negocio y crean una campaña por cada segmento de cliente ideal.
      </p>

      <div className="card">
        <h2>Nuevo cliente</h2>
        <NewClientForm />
      </div>

      <div className="card">
        <h2>Clientes</h2>
        {clients.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>Aún no hay clientes.</p>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr><th>Empresa</th><th>Dominio</th><th>Campañas</th><th>Leads</th><th>Licencia</th></tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/dashboard/clients/${c.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{c.companyName ?? c.email ?? c.id}</Link></td>
                    <td className="muted">{c.domain ?? "—"}</td>
                    <td>{c.campaigns.length}</td>
                    <td>{c.campaigns.reduce((n, camp) => n + camp._count.leads, 0)}</td>
                    <td>{c.licenseActive ? <span className="pill ok">activa</span> : <span className="pill">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Integraciones</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {pending.length === 0
            ? "Todo configurado: los agentes actúan de verdad."
            : `${pending.length} pendientes. Mientras falten, esos agentes funcionan en modo simulado. Guía paso a paso en docs/CLAVES.md.`}
        </p>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th>Servicio</th><th>Agentes</th><th>Estado</th><th>Para qué sirve</th></tr></thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.name}>
                  <td>{i.name}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{i.agents}</td>
                  <td>
                    {i.configured
                      ? <span className="pill ok">conectado</span>
                      : <span className="pill warn" title={i.missing.join(", ")}>falta {i.missing.join(", ")}</span>}
                  </td>
                  <td className="muted">{i.whatItUnlocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
