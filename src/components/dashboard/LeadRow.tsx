"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

export interface LeadView {
  id: string;
  fullName: string;
  role: string | null;
  companyName: string | null;
  email: string;
  status: string;
  logs: { id: string; direction: string; subject: string | null; body: string; simulated: boolean; sentAt: string }[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "nuevo", cls: "" },
  emailed: { label: "contactado", cls: "" },
  replied: { label: "interesado", cls: "ok" },
  meeting_sent: { label: "enlace enviado", cls: "ok" },
  booked: { label: "reunión", cls: "ok" },
  rejected: { label: "descartado", cls: "bad" },
};

export default function LeadRow({ lead }: { lead: LeadView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const status = STATUS[lead.status] ?? { label: lead.status, cls: "" };
  const outbound = lead.logs.filter((l) => l.direction === "outbound").length;

  async function saveReply(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/leads/${lead.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply }),
    });
    setReply("");
    setSaving(false);
    router.refresh();
  }

  return (
    <Fragment>
      <tr>
        <td><b>{lead.fullName}</b><div className="muted">{lead.role}</div></td>
        <td>{lead.companyName ?? "—"}</td>
        <td className="muted">{lead.email}</td>
        <td><span className={`pill ${status.cls}`}>{status.label}</span></td>
        <td>{outbound}</td>
        <td><button className="btn secondary" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={() => setOpen(!open)}>{open ? "Cerrar" : "Ver"}</button></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6}>
            {lead.logs.length === 0 && <p className="muted">Aún no se le ha escrito. Activa la campaña y ejecuta el orquestador.</p>}
            {lead.logs.map((l) => (
              <div key={l.id} className={`log ${l.direction === "inbound" ? "in" : ""}`}>
                <div className="meta">
                  {l.direction === "inbound" ? "← respuesta" : "→ enviado"} · {new Date(l.sentAt).toLocaleString("es-ES")}
                  {l.simulated && " · simulado"}
                  {l.subject && ` · ${l.subject}`}
                </div>
                {l.body}
              </div>
            ))}
            {!["booked", "rejected"].includes(lead.status) && (
              <form onSubmit={saveReply} style={{ marginTop: 14 }}>
                <label className="field">
                  ¿Ha contestado? Pega aquí su respuesta (AG-09 la clasificará en la próxima ejecución)
                  <textarea className="textarea" style={{ minHeight: 70, fontFamily: "inherit" }} value={reply} onChange={(e) => setReply(e.target.value)} required />
                </label>
                <button className="btn secondary" style={{ marginTop: 8 }} disabled={saving}>{saving ? "Guardando…" : "Registrar respuesta"}</button>
              </form>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
