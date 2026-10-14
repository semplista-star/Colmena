"use client";

import { useState, type FormEvent } from "react";

interface CheckoutButtonProps {
  plan: "annual" | "semiannual";
  label: string;
}

type Stage = "idle" | "email" | "loading" | "error";

// Botón de contratación de la web pública: pide el email y lleva a Stripe Checkout
// (/api/billing/checkout). Los estilos viven en src/app/landing.css (.cp-checkout).
export default function CheckoutButton({ plan, label }: CheckoutButtonProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.");
        setStage("error");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("No hay conexión con el servidor de pago. Revisa tu conexión e inténtalo de nuevo.");
      setStage("error");
    }
  }

  if (stage === "idle") {
    return (
      <div className="cp-checkout">
        <button type="button" className="cp-button" onClick={() => setStage("email")}>
          {label}
        </button>
      </div>
    );
  }

  return (
    <form className="cp-checkout" onSubmit={handleSubmit}>
      <label htmlFor={`checkout-email-${plan}`} className="sr-only">Email de tu empresa</label>
      <input
        id={`checkout-email-${plan}`}
        type="email"
        required
        autoFocus
        placeholder="tu@empresa.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={stage === "loading"}
      />
      <button type="submit" className="cp-button" disabled={stage === "loading"}>
        {stage === "loading" ? "Abriendo el pago…" : "Continuar al pago"}
      </button>
      {stage === "error" && error && <p className="cp-error" role="alert">{error}</p>}
      <button type="button" className="cp-secondary" disabled={stage === "loading"} onClick={() => setStage("idle")}>
        Cancelar
      </button>
    </form>
  );
}
