"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewClientForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      router.push(`/dashboard/clients/${data.clientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="row" style={{ marginTop: 14 }}>
      <label className="field">
        Web de la empresa
        <input className="input" placeholder="mimper.com" value={domain} onChange={(e) => setDomain(e.target.value)} required disabled={loading} />
      </label>
      <button className="btn" disabled={loading}>{loading ? "Analizando… (hasta 1 min)" : "Analizar y crear campañas"}</button>
      {error && <p className="error" style={{ width: "100%" }}>{error}</p>}
    </form>
  );
}
