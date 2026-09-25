"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = {
  draft: "Borrador (no envía)",
  working: "Activa",
  scaling: "Escalando",
  paused: "Pausada",
};

export default function CampaignStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    await fetch("/api/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select className="select" style={{ width: "auto" }} value={value} disabled={saving} onChange={(e) => change(e.target.value)}>
      {Object.entries(LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );
}
