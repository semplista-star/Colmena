"use client";

import { useState } from "react";
import type { AgentEndpoint } from "@/lib/agentEndpoints";

interface AgentItem {
  id: string;
  name: string;
  summary: string;
  status: string;
  endpoint?: AgentEndpoint;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  implemented: { label: "real", cls: "ok" },
  stub: { label: "parcial", cls: "warn" },
  planned: { label: "planificado", cls: "" },
};

export default function AgentConsole({ agents }: { agents: AgentItem[] }) {
  const [selectedId, setSelectedId] = useState(agents[0]?.id);
  const selected = agents.find((a) => a.id === selectedId)!;
  const [input, setInput] = useState(JSON.stringify(selected.endpoint?.example ?? {}, null, 2));
  const [output, setOutput] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(id: string) {
    const agent = agents.find((a) => a.id === id)!;
    setSelectedId(id);
    setInput(JSON.stringify(agent.endpoint?.example ?? {}, null, 2));
    setOutput(null);
    setError(null);
  }

  async function run() {
    const ep = selected.endpoint;
    if (!ep) return;
    setRunning(true);
    setError(null);
    setOutput(null);
    try {
      const body = JSON.parse(input);
      const url = ep.method === "GET" ? `${ep.path}?${new URLSearchParams(body).toString()}` : ep.path;
      const res = await fetch(url, {
        method: ep.method,
        headers: ep.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: ep.method === "POST" ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({ error: `Respuesta no JSON (${res.status})` }));
      if (!res.ok) setError(data.error ?? `Error ${res.status}`);
      setOutput(data);
    } catch (err) {
      setError(err instanceof SyntaxError ? "La entrada no es JSON válido." : String(err));
    } finally {
      setRunning(false);
    }
  }

  const html = output && typeof output === "object" && "html" in output ? String((output as { html: unknown }).html) : null;

  return (
    <div className="card">
      <div className="row">
        <label className="field" style={{ maxWidth: 420 }}>
          Agente
          <select className="select" value={selectedId} onChange={(e) => choose(e.target.value)}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
          </select>
        </label>
        <span className={`pill ${STATUS[selected.status]?.cls ?? ""}`}>{STATUS[selected.status]?.label ?? selected.status}</span>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{selected.summary}</p>
      {selected.endpoint && (
        <p className="mono muted" style={{ fontSize: 12, marginTop: 4 }}>{selected.endpoint.method} {selected.endpoint.path}</p>
      )}

      <label className="field" style={{ marginTop: 14 }}>
        Entrada (JSON; cambia los datos de ejemplo por los tuyos)
        <textarea className="textarea" value={input} onChange={(e) => setInput(e.target.value)} />
      </label>
      <button className="btn" style={{ marginTop: 10 }} onClick={run} disabled={running || !selected.endpoint}>
        {running ? "Trabajando…" : `Ejecutar ${selected.name}`}
      </button>

      {error && <p className="error">{error}</p>}
      {html && (
        <iframe title="Vista previa" srcDoc={html} sandbox="" style={{ width: "100%", height: 520, border: "1px solid var(--hairline)", borderRadius: 6, marginTop: 14, background: "#fff" }} />
      )}
      {output !== null && <pre className="out">{JSON.stringify(html ? { ...(output as object), html: "(ver vista previa arriba)" } : output, null, 2)}</pre>}
    </div>
  );
}
