export default function Bienvenido() {
  return (
    <div className="wrap" style={{ paddingTop: 100, textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32 }}>Bienvenido a Colmena 🐝</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 12 }}>
        Tu licencia está activa. En breve recibirás por email los siguientes pasos para conectar tu web.
      </p>
    </div>
  );
}
