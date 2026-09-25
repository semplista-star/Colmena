"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  leadName: string;
  decision: { nextAgent: string; action: string; reason: string };
  execution?: { executed: boolean; summary: string; details?: unknown };
}

export default function OrchestratorPanel({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"dry" | "run" | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    setLoading(dryRun ? "dry" : "run");
    setError(null);
    try {
      const res = await fetch(`/api/orchestrator/run?clientId=${clientId}${dryRun ? "&dryRun=1" : ""}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResults(data.results);
      if (!dryRun) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card">
      <h2>Orquestador</h2>
      <p className="muted" style={{ marginTop: 6 }}>
        Decide qué agente toca con cada lead de las campañas <b>activas</b> y lo ejecuta: primer email, seguimientos a los 3 días,
        clasificar respuestas, enviar el enlace para agendar. Se ejecuta solo cada mañana laborable; aquí puedes lanzarlo a mano.
      </p>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn secondary" onClick={() => run(true)} disabled={loading !== null}>
          {loading === "dry" ? "Pensando…" : "Ver qué haría (sin enviar)"}
        </button>
        <button className="btn" onClick={() => run(false)} disabled={loading !== null}>
          {loading === "run" ? "Ejecutando…" : "Ejecutar ahora"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {results && (
        results.length === 0 ? (
          <p className="muted" style={{ marginTop: 14 }}>No hay leads pendientes en campañas activas. Activa una campaña y añade leads.</p>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Lead</th><th>Agente</th><th>Decisión</th><th>Resultado</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.leadName}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.decision.nextAgent}</td>
                    <td className="muted">{r.decision.reason}</td>
                    <td>
                      {r.execution
                        ? <span className={`pill ${r.execution.executed ? "ok" : "warn"}`} title={typeof r.execution.details === "string" ? r.execution.details : undefined}>{r.execution.summary}</span>
                        : <span className="muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
