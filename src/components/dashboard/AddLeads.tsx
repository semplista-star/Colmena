"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { fullName: "", role: "", companyName: "", companyDomain: "", email: "" };

export default function AddLeads({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "one" | "bulk">("closed");
  const [lead, setLead] = useState(EMPTY);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setLead({ ...lead, [k]: e.target.value });

  async function createLead(data: { fullName: string; role?: string; companyName?: string; email: string }) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...data, role: data.role || undefined, companyName: data.companyName || undefined }),
    });
    return res.ok;
  }

  // AG-04: completa email y cargo a partir de nombre + empresa/dominio
  async function enrich() {
    setBusy("enrich");
    setMessage(null);
    const res = await fetch("/api/agents/enrich-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: lead.fullName,
        companyName: lead.companyName || undefined,
        companyDomain: lead.companyDomain || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMessage(data.error ?? "Error al buscar");
    setLead({ ...lead, email: data.email ?? lead.email, role: lead.role || data.role || "" });
    setMessage(data.simulated ? "Estimación (sin Apollo): revisa el email antes de guardar." : data.note);
  }

  async function saveOne(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    const ok = await createLead(lead);
    setBusy(null);
    if (!ok) return setMessage("No se pudo guardar: revisa el email.");
    setLead(EMPTY);
    setMessage("Lead añadido.");
    router.refresh();
  }

  // Una línea por lead: Nombre; Cargo; Empresa; email  (también vale con comas o tabuladores)
  async function saveBulk(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    let ok = 0;
    const failed: string[] = [];
    for (const line of bulk.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const parts = line.split(/[;\t,]/).map((p) => p.trim());
      const email = parts.find((p) => p.includes("@"));
      const rest = parts.filter((p) => p !== email);
      if (!email || !rest[0]) { failed.push(line); continue; }
      if (await createLead({ fullName: rest[0], role: rest[1], companyName: rest[2], email })) ok++;
      else failed.push(line);
    }
    setBusy(null);
    setMessage(`${ok} leads añadidos.${failed.length ? ` No se pudieron leer: ${failed.join(" | ")}` : ""}`);
    if (!failed.length) setBulk("");
    router.refresh();
  }

  if (mode === "closed") {
    return (
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn secondary" onClick={() => setMode("one")}>+ Añadir lead</button>
        <button className="btn secondary" onClick={() => setMode("bulk")}>+ Pegar lista</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
      {mode === "one" ? (
        <form onSubmit={saveOne}>
          <div className="row">
            <label className="field">Nombre<input className="input" value={lead.fullName} onChange={set("fullName")} required /></label>
            <label className="field">Cargo<input className="input" value={lead.role} onChange={set("role")} /></label>
            <label className="field">Empresa<input className="input" value={lead.companyName} onChange={set("companyName")} /></label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <label className="field">Web de su empresa<input className="input" placeholder="empresa.com" value={lead.companyDomain} onChange={set("companyDomain")} /></label>
            <label className="field">Email<input className="input" type="email" value={lead.email} onChange={set("email")} required /></label>
            <button type="button" className="btn secondary" onClick={enrich} disabled={!lead.fullName || busy !== null}>
              {busy === "enrich" ? "Buscando…" : "Buscar email (AG-04)"}
            </button>
            <button className="btn" disabled={busy !== null}>Guardar</button>
          </div>
        </form>
      ) : (
        <form onSubmit={saveBulk}>
          <label className="field">
            Un lead por línea: Nombre; Cargo; Empresa; email
            <textarea className="textarea" placeholder={"Laura Gómez; Directora de Marketing; Acme; laura@acme.com\nPedro Ruiz; CEO; Beta SL; pedro@beta.es"} value={bulk} onChange={(e) => setBulk(e.target.value)} required />
          </label>
          <button className="btn" style={{ marginTop: 8 }} disabled={busy !== null}>{busy ? "Guardando…" : "Añadir todos"}</button>
        </form>
      )}
      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
      <button className="btn secondary" style={{ marginTop: 10, padding: "5px 10px", fontSize: 12.5 }} onClick={() => { setMode("closed"); setMessage(null); }}>Cerrar</button>
    </div>
  );
}
