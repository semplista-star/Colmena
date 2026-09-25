"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Cada cliente conecta SU Cal.com: pega aquí su enlace público y configura en su
// cuenta el webhook que avisa a Colmena cuando un lead reserva.
export default function BookingSettings({
  clientId,
  bookingUrl,
  webhookUrl,
  webhookSecret,
}: {
  clientId: string;
  bookingUrl: string | null;
  webhookUrl: string;
  webhookSecret: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(bookingUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(!bookingUrl);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clientId, bookingUrl: value.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMessage(data.error ?? "No se pudo guardar");
    setMessage("Guardado.");
    router.refresh();
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>Agenda del cliente (Cal.com)</h2>
        {bookingUrl ? <span className="pill ok">conectada</span> : <span className="pill warn">sin conectar</span>}
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        Cuando un lead muestra interés, AG-10 le envía este enlace para que reserve directamente en la agenda del cliente.
        Sin enlace, el agente le pregunta por email qué día le va bien.
      </p>
      <form onSubmit={save} className="row" style={{ marginTop: 12 }}>
        <label className="field">
          Enlace público de Cal.com del cliente
          <input className="input" placeholder="https://cal.com/empresa/30min" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
      </form>
      {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}

      <button className="btn secondary" style={{ marginTop: 14, padding: "5px 10px", fontSize: 12.5 }} onClick={() => setShowSteps(!showSteps)}>
        {showSteps ? "Ocultar instrucciones para el cliente" : "Ver instrucciones para el cliente"}
      </button>
      {showSteps && (
        <ol className="muted" style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Crear una cuenta gratis en <b>cal.com</b> y conectar su Google Calendar u Outlook.</li>
          <li>Crear un tipo de evento de 30 min y copiar su enlace público (el de arriba).</li>
          <li>
            En Cal.com: <b>Settings → Developer → Webhooks → New</b>, evento <b>Booking Created</b>, con:
            <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>URL: {webhookUrl}</div>
            <div className="mono" style={{ fontSize: 12 }}>Secret: {webhookSecret ?? "(falta CALCOM_WEBHOOK_SECRET en Vercel)"}</div>
          </li>
          <li>Con eso, cada reserva marca al lead como <b>reunión</b> en este panel automáticamente.</li>
        </ol>
      )}
    </div>
  );
}
