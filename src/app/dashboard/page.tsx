import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const clients = await db.client.findMany({
    include: { campaigns: { include: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="wrap" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32 }}>Panel de control</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 8 }}>
        Datos reales de <code>Client → Campaign → Lead</code>. Vacío hasta que llames a{" "}
        <code>/api/analyze-website</code> por primera vez.
      </p>

      {clients.length === 0 && (
        <p style={{ marginTop: 40, color: "var(--text-dim)" }}>
          Aún no hay clientes. Prueba: <code>curl -X POST localhost:3000/api/analyze-website -d {"'"}{"{"}"domain":"tuweb.com"{"}"}{"'"}</code>
        </p>
      )}

      {clients.map((c) => (
        <div key={c.id} style={{ marginTop: 40, borderTop: "1px solid var(--hairline)", paddingTop: 24 }}>
          <h2 style={{ fontSize: 20 }}>{c.companyName ?? c.domain}</h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 4 }}>{c.description}</p>

          <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                <th style={{ padding: "8px 0" }}>Campaña</th>
                <th>Estado</th>
                <th>Fit score</th>
                <th>Leads</th>
              </tr>
            </thead>
            <tbody>
              {c.campaigns.map((camp) => (
                <tr key={camp.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "10px 0" }}>{camp.name}</td>
                  <td>{camp.status}</td>
                  <td>{camp.fitScore ? `${camp.fitScore}%` : "—"}</td>
                  <td>{camp.leads.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
