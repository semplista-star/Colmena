import Link from "next/link";
import { AGENTS, AgentDept } from "@/lib/agents";
import CheckoutButton from "@/components/CheckoutButton";
import "./landing.css";

// Web pública de Colmena Life. Diseño y textos entregados por el cliente
// (14-oct-2026); los 25 agentes se pintan desde src/lib/agents.ts para que
// la web y el panel nunca se desincronicen.

const DEPTS: { id: AgentDept; range: string; title: string }[] = [
  { id: "inteligencia", range: "01—05", title: "Inteligencia de mercado" },
  { id: "prospeccion", range: "06—10", title: "Prospección directa" },
  { id: "ads", range: "11—15", title: "Publicidad de pago" },
  { id: "operaciones", range: "16—20", title: "Operaciones y reporting" },
  { id: "marketing", range: "21—25", title: "Marketing de contenido" },
];

const TEAMS = [
  { img: "inteligencia-mercado", title: ["Inteligencia de", "mercado"], text: "Agentes especializados en analizar en profundidad tu negocio, competidores y tendencias globales." },
  { img: "prospeccion-directa", title: ["Prospección directa"], text: "Identificación y contacto automatizado de clientes potenciales cualificados para tu embudo de ventas." },
  { img: "publicidad-pago", title: ["Publicidad de pago"], text: "Gestión experta de campañas en Meta y LinkedIn para optimizar el retorno de tu inversión publicitaria." },
  { img: "operaciones-reporting", title: ["Operaciones y", "reporting"], text: "Agentes técnicos que aseguran que todo funcione correctamente y reportan resultados en tiempo real." },
  { img: "marketing-contenido", title: ["Marketing de", "contenido"], text: "Generación de narrativas persuasivas para atraer y educar a tu audiencia a través de canales digitales." },
  { img: "optimizacion-continua", title: ["Optimización", "continua"], text: "Ajuste constante de las estrategias para que los agentes mejoren su rendimiento a partir de los resultados." },
];

const STEPS = [
  { title: ["Análisis de", "web"], text: "Analizamos tu sitio web y competidores para extraer tu propuesta de valor y definir una estrategia de captación ganadora." },
  { title: ["Activación de", "agentes"], text: "Nuestra colmena de 25 agentes de IA se pone en marcha, organizándose en equipos de prospección y marketing para tu negocio." },
  { title: ["Campañas", "multicanal"], text: "Lanzamos prospección directa vía email y campañas optimizadas en Meta y LinkedIn Ads para alcanzar a tus clientes ideales." },
  { title: ["Reuniones en", "agenda"], text: "Los agentes gestionan toda la comunicación inicial y agendan las reuniones de venta directamente en tu calendario comercial." },
];

const CHANNELS = [
  { img: "email-frio", title: ["Email en frío"], text: "Ideal para prospección directa. Nuestros agentes analizan y contactan clientes potenciales de forma autónoma." },
  { img: "meta-ads", title: ["Meta Ads (B2C)"], text: "Estrategia perfecta para negocios B2C o ciclos de venta cortos, maximizando el alcance y la conversión rápida." },
  { img: "linkedin-ads", title: ["LinkedIn Ads", "(B2B)"], text: "Diseñado para ventas B2B y procesos complejos. Conectamos tu marca con los tomadores de decisiones clave." },
];

const FAQ = [
  { q: "¿Qué es Colmena Life?", a: "Colmena Life reúne 25 agentes de inteligencia artificial, cada uno pensado para ayudarte en un ámbito concreto, dentro de una misma propuesta." },
  { q: "¿Qué hace cada agente?", a: "Cada agente está especializado en una tarea o área diferente. Puedes consultar la descripción de los 25 agentes en la sección Agentes de esta página." },
  { q: "¿Cómo empieza a trabajar Colmena con mi negocio?", a: "Nos das tu web y Colmena la analiza junto a tus competidores para definir tu cliente ideal. Después se eligen los canales de captación: email en frío, Meta Ads o LinkedIn Ads." },
  { q: "¿Tengo que hacer los seguimientos y agendar las reuniones?", a: "Colmena gestiona las secuencias de seguimiento, lee y clasifica las respuestas y reserva las reuniones en tu calendario. Recibes cada cita con el contexto del contacto." },
];

// Títulos con salto de línea opcional, como en el diseño original
function Lines({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {p}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div className="colmena-landing">
      <header className="colmena-header">
        <Link className="ch-logo" href="/" aria-label="Colmena, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imagenes/logo-colmena.webp" alt="Colmena" width={300} height={90} decoding="async" />
        </Link>
      </header>

      <section className="colmena-premium" aria-label="Colmena">
        <div className="colmena-panel">
          <div className="colmena-content">
            <h1 className="colmena-title">
              <span>25 agentes inteligentes</span> <span>enfocados en disparar tus</span> <span>ganancias</span>
            </h1>
            <p className="colmena-description">
              Buscar clientes, escribir emails y hacer seguimientos consume el tiempo que necesitas para gestionar tu negocio.
              Colmena reúne 25 agentes de IA que analizan tu empresa, identifican prospectos y gestionan emails y campañas en
              Meta y LinkedIn para agendar reuniones en tu calendario, con el contexto de cada contacto.
            </p>
            <a className="colmena-button" href="#colmena-destino">EMPEZAR<br />AHORA</a>
          </div>
        </div>
      </section>

      <section className="colmena-team-grid" aria-label="Equipos y optimización de Colmena">
        <div className="ctg-wrap">
          <h2>Nuestros equipos de IA</h2>
          <div className="ctg-grid">
            {TEAMS.map((t) => (
              <article className="ctg-card" key={t.img}>
                <span className="ctg-icon" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/imagenes/${t.img}.webp`} alt="" width={84} height={84} loading="lazy" decoding="async" />
                </span>
                <h3><Lines parts={t.title} /></h3>
                <p>{t.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div id="colmena-destino" style={{ scrollMarginTop: 100 }} />
      <section className="colmena-equipos" id="agentes" aria-label="Equipos de agentes de Colmena">
        <div className="cm-wrap">
          <p className="cm-label">Inteligencia coordinada</p>
          <h2>25 agentes especializados,<br />organizados en 5 equipos</h2>
          {DEPTS.map((d) => (
            // name agrupa los desplegables: al abrir uno se cierra el anterior
            <details className="cm-team" key={d.id} {...{ name: "colmena-equipos" }}>
              <summary>
                <span className="cm-range">{d.range}</span>
                <span className="cm-title">{d.title}</span>
                <span className="cm-toggle" aria-hidden="true" />
              </summary>
              <div className="cm-agents">
                {AGENTS.filter((a) => a.dept === d.id).map((a) => (
                  <article className="cm-agent" key={a.id}>
                    <span className="cm-id">{a.id}</span>
                    <h3>{a.name}</h3>
                    <p>{a.summary}</p>
                  </article>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="colmena-como" aria-label="Cómo funciona Colmena">
        <div className="cmc-wrap">
          <h2>Cómo funciona</h2>
          <div className="cmc-grid">
            {STEPS.map((s, i) => (
              <article className="cmc-step" key={i}>
                <div className="cmc-track" aria-hidden="true" />
                <span className="cmc-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3><Lines parts={s.title} /></h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="colmena-canales" aria-label="Canales de captación de Colmena">
        <div className="cc-bg" aria-hidden="true">
          <div className="cc-lines" />
          <div className="cc-shape s1" />
          <div className="cc-shape s2" />
          <div className="cc-shape s3" />
        </div>
        <div className="cc-wrap">
          <h2>Email, Meta y LinkedIn</h2>
          <div className="cc-grid">
            {CHANNELS.map((c) => (
              <article className="cc-card" key={c.img}>
                <div className="cc-top">
                  <span className="cc-icon" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/imagenes/${c.img}.webp`} alt="" width={64} height={64} loading="lazy" decoding="async" />
                  </span>
                  <h3><Lines parts={c.title} /></h3>
                </div>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="colmena-precios" id="precios" aria-label="Planes de Colmena">
        <div className="cp-wrap">
          <article className="cp-card">
            <h3>Pago semestral</h3>
            <div className="cp-price"><span className="cp-amount">1.500 €</span><span className="cp-period">/ 6 meses</span></div>
            <ul className="cp-features">
              <li>25 agentes de IA siempre activos</li>
              <li>Gestión de campañas Email</li>
              <li>Meta Ads y LinkedIn Ads</li>
              <li>Soporte estándar vía email</li>
            </ul>
            <CheckoutButton plan="semiannual" label="Empezar ahora" />
          </article>
          <article className="cp-card cp-annual">
            <span className="cp-badge">Ahorra 100 €</span>
            <h3>Pago anual</h3>
            <div className="cp-price"><span className="cp-amount">2.900 €</span><span className="cp-period">/ año</span></div>
            <p className="cp-saving">Frente a 3.000 € por dos pagos semestrales.</p>
            <ul className="cp-features">
              <li><span><strong>25 agentes v.2</strong> full-stack</span></li>
              <li>Canales: Email, Meta y LinkedIn</li>
              <li><strong>Soporte prioritario 24/7</strong></li>
              <li>Actualizaciones automáticas</li>
            </ul>
            <CheckoutButton plan="annual" label="Obtener plan anual" />
          </article>
        </div>
        <p className="cp-note">Costes de envío, anuncios y APIs de terceros no incluidos.</p>
      </section>

      <section className="colmena-faq" aria-label="Preguntas frecuentes">
        <div className="cf-layout">
          <div>
            <span className="cf-label">PREGUNTAS FRECUENTES</span>
            <h2 className="cf-title">Resolvemos tus<br />dudas</h2>
            <p className="cf-intro">Todo lo que necesitas saber sobre Colmena Life, sus agentes de IA y cómo elegir el plan que mejor encaja contigo.</p>
            <div className="cf-rule" aria-hidden="true" />
          </div>
          <div className="cf-list">
            {FAQ.map((f) => (
              <article className="cf-card" key={f.q}>
                <h3 className="cf-question">{f.q}</h3>
                <p className="cf-answer">{f.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="colmena-footer">
        <div className="cfo-wrap">
          <span>© 2026 Colmena Life</span>
          <Link href="/dashboard">Acceso clientes →</Link>
        </div>
      </footer>
    </div>
  );
}
