"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

interface CheckoutButtonProps {
  plan: "annual" | "semiannual";
  label: string;
  variant: "primary" | "ghost";
}

type Stage = "idle" | "email" | "loading" | "error";

export default function CheckoutButton({ plan, label, variant }: CheckoutButtonProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const btnClass = variant === "primary" ? "btn-primary" : "btn-ghost";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStage("loading");
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, customerEmail: email }),
      });
      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago. Inténtalo de nuevo.");
        setStage("error");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Error de red al contactar con el servidor de pago.");
      setStage("error");
    }
  }

  const buttonStyle: CSSProperties = {
    fontFamily: "inherit",
    cursor: "pointer",
    border: variant === "ghost" ? undefined : "none",
  };

  if (stage === "idle" || stage === "error") {
    return (
      <div>
        <button type="button" className={btnClass} style={buttonStyle} onClick={() => setStage("email")}>
          {label}
        </button>
        {stage === "error" && error && (
          <p style={{ color: "var(--amber)", fontSize: 12.5, marginTop: 8, maxWidth: 220 }}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}
    >
      <input
        type="email"
        required
        autoFocus
        placeholder="tu@empresa.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={stage === "loading"}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--hairline)",
          borderRadius: 6,
          padding: "10px 12px",
          color: "var(--text)",
          fontSize: 14,
          width: "100%",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className={btnClass} style={buttonStyle} disabled={stage === "loading"}>
          {stage === "loading" ? "Redirigiendo…" : "Ir a pago"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ fontFamily: "inherit", cursor: "pointer" }}
          disabled={stage === "loading"}
          onClick={() => setStage("idle")}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
