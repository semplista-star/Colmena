import { AGENTS, AgentDept } from "@/lib/agents";
import CheckoutButton from "@/components/CheckoutButton";

const DEPT_LABELS: Record<AgentDept, { range: string; title: string }> = {
  inteligencia: { range: "01—05", title: "Inteligencia de mercado" },
  prospeccion: { range: "06—10", title: "Prospección directa" },
  ads: { range: "11—15", title: "Publicidad de pago" },
  operaciones: { range: "16—20", title: "Operaciones y reporting" },
};

export default function Home() {
  const depts = Object.keys(DEPT_LABELS) as AgentDept[];

  return (
    <>
      <nav>
        <div className="wrap">
          <div className="logo"><span className="dot" />COLMENA</div>
          <div className="navlinks">
            <a href="#agentes">Agentes</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#canales">Canales</a>
            <a href="#precios">Precios</a>
          </div>
          <a href="#precios" className="navcta">Empezar</a>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow"><span className="pulse" />20 AGENTES · SIEMPRE ACTIVOS</div>
          <h1>Una colmena de agentes de IA que <em>encuentra</em>, <em>convence</em> y <em>agenda</em> a tus próximos clientes.</h1>
          <p className="lead">Colmena analiza tu negocio, encuentra a las personas que sí te van a comprar, les escribe, les lanza anuncios en Meta y LinkedIn, y te trae la reunión agendada. Sin equipo de ventas, sin agencia.</p>
          <div className="ctas">
            <a href="#precios" className="btn-primary">Activar mi colmena</a>
            <a href="#agentes" className="btn-ghost">Ver los 20 agentes</a>
          </div>
        </div>
      </section>

      <section className="hive-section" id="agentes">
        <div className="wrap">
          <div className="hive-header">
            <div className="k">// Plantilla completa</div>
            <h2>20 agentes especializados, organizados en 4 equipos</h2>
          </div>

          {depts.map((dept) => (
            <div className="dept" key={dept}>
              <div className="dept-title">
                <span className="n">{DEPT_LABELS[dept].range}</span> {DEPT_LABELS[dept].title}
              </div>
              <div className="hive-grid">
                {AGENTS.filter((a) => a.dept === dept).map((agent) => (
                  <div className="cell" key={agent.id}>
                    <span className="status" style={{ background: agent.status === "implemented" ? "var(--cyan)" : agent.status === "stub" ? "var(--amber)" : "#5A6270" }} />
                    <div className="id">{agent.id}</div>
                    <div className="name">{agent.name}</div>
                    <div className="role">{agent.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flow" id="como-funciona">
        <div className="wrap">
          <div className="k mono" style={{ color: "var(--amber)", fontSize: 12, letterSpacing: "0.08em" }}>// Puesta en marcha</div>
          <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", marginTop: 10, letterSpacing: "-0.02em" }}>De tu dominio a la primera reunión agendada</h2>
          <div className="flow-grid">
            <div className="flow-step"><div className="num">01</div><h3>Nos das tu web</h3><p>La colmena la analiza junto a tus competidores y define tu cliente ideal.</p></div>
            <div className="flow-step"><div className="num">02</div><h3>Elegimos canales</h3><p>Email frío, Meta Ads o LinkedIn Ads según dónde esté tu cliente.</p></div>
            <div className="flow-step"><div className="num">03</div><h3>La colmena trabaja</h3><p>Busca, escribe, publica anuncios y responde, 24/7, sin supervisión constante.</p></div>
            <div className="flow-step"><div className="num">04</div><h3>Tú recibes reuniones</h3><p>Llegan agendadas en tu calendario, con el contexto completo del lead.</p></div>
          </div>
        </div>
      </section>

      <section className="channels" id="canales">
        <div className="wrap">
          <div className="k mono" style={{ color: "var(--amber)", fontSize: 12, letterSpacing: "0.08em" }}>// Multicanal</div>
          <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", marginTop: 10, letterSpacing: "-0.02em" }}>El agente elige el canal según tu tipo de cliente</h2>
          <div className="ch-grid">
            <div className="ch-card"><h3>Email en frío</h3><p>Prospección directa a decisores, con dominios propios calentados y seguimiento automático.</p><span className="tag">AG-06 · AG-07 · AG-08</span></div>
            <div className="ch-card"><h3>Meta Ads</h3><p>Ideal para negocios B2C o con ciclo de venta corto: Facebook e Instagram.</p><span className="tag">AG-11 · AG-13 · AG-15</span></div>
            <div className="ch-card"><h3>LinkedIn Ads</h3><p>Para B2B y ventas complejas: llega a cargos y empresas concretas.</p><span className="tag">AG-12 · AG-13 · AG-15</span></div>
          </div>
        </div>
      </section>

      <section className="pricing" id="precios">
        <div className="wrap">
          <div className="k mono" style={{ color: "var(--amber)", fontSize: 12, letterSpacing: "0.08em" }}>// Licencia</div>
          <h2 style={{ fontSize: "clamp(26px,3.4vw,38px)", marginTop: 10, letterSpacing: "-0.02em" }}>Un precio, la colmena entera</h2>
          <div className="price-grid">
            <div className="price-card">
              <div className="label">PAGO SEMESTRAL</div>
              <div className="amount">1.500€<span>/6 meses</span></div>
              <ul>
                <li>Los 20 agentes activos</li>
                <li>Email + Meta Ads + LinkedIn Ads</li>
                <li>Soporte por email</li>
              </ul>
              <CheckoutButton plan="semiannual" label="Contratar" variant="ghost" />
            </div>
            <div className="price-card featured">
              <div className="badge">2 MESES GRATIS</div>
              <div className="label">PAGO ANUAL</div>
              <div className="amount">3.000€<span>/año</span></div>
              <ul>
                <li>Los 20 agentes activos</li>
                <li>Email + Meta Ads + LinkedIn Ads</li>
                <li>Soporte prioritario</li>
              </ul>
              <CheckoutButton plan="annual" label="Contratar" variant="primary" />
            </div>
          </div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 18 }}>
            El botón "Contratar" ya llama de verdad a Stripe Checkout — solo hace falta tener <code>STRIPE_SECRET_KEY</code> y los price IDs configurados (ver README).
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="logo"><span className="dot" />COLMENA</div>
          <div className="f-text">© 2026 Colmena. Licencia de uso anual o semestral. Costes de envío, anuncios y APIs de terceros no incluidos.</div>
        </div>
      </footer>
    </>
  );
}
