"use client";

// Red de seguridad para cualquier otro error del panel
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card">
      <h2>Algo ha fallado en el panel</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Código del error: <code>{error.digest ?? error.message}</code>. Búscalo en Vercel → Logs para ver el detalle.
      </p>
      <button className="btn" style={{ marginTop: 14 }} onClick={reset}>Reintentar</button>
    </div>
  );
}
