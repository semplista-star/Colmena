// Qué servicios externos están configurados (solo mira si existen las variables,
// nunca expone su valor). Lo usa el panel para enseñar qué es real y qué simulado.

export interface IntegrationStatus {
  name: string;
  agents: string;
  configured: boolean;
  missing: string[];
  whatItUnlocks: string;
}

const INTEGRATIONS: { name: string; agents: string; vars: string[]; whatItUnlocks: string }[] = [
  { name: "Claude (Anthropic)", agents: "Todos", vars: ["ANTHROPIC_API_KEY"], whatItUnlocks: "La IA de todos los agentes." },
  { name: "Base de datos (Supabase)", agents: "Todos", vars: ["DATABASE_URL"], whatItUnlocks: "Guardar clientes, campañas y leads." },
  { name: "Contraseña del panel", agents: "—", vars: ["ADMIN_PASSWORD"], whatItUnlocks: "Que nadie más pueda entrar al panel ni lanzar agentes." },
  { name: "Envío de email (Resend)", agents: "AG-06, AG-07, AG-09, AG-10", vars: ["RESEND_API_KEY", "EMAIL_FROM"], whatItUnlocks: "Los emails salen de verdad en vez de simularse." },
  { name: "Respuestas entrantes", agents: "AG-09", vars: ["INBOUND_SECRET"], whatItUnlocks: "Las respuestas de los leads entran solas por /api/webhooks/inbound." },
  { name: "Reservas de Cal.com", agents: "AG-10", vars: ["CALCOM_WEBHOOK_SECRET"], whatItUnlocks: "El lead pasa a \"reunión\" en cuanto reserva. Cada cliente pone su enlace de Cal.com en su ficha." },
  { name: "Datos de contacto (Apollo)", agents: "AG-04", vars: ["APOLLO_API_KEY"], whatItUnlocks: "Emails y cargos verificados en vez de estimados." },
  { name: "Cron automático", agents: "Orquestador", vars: ["CRON_SECRET"], whatItUnlocks: "El orquestador se ejecuta solo cada mañana laborable." },
  { name: "Meta Ads", agents: "AG-11, AG-15", vars: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"], whatItUnlocks: "Publicar campañas en Facebook/Instagram." },
  { name: "LinkedIn Ads", agents: "AG-12, AG-15", vars: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AD_ACCOUNT_ID"], whatItUnlocks: "Publicar campañas en LinkedIn." },
  { name: "Google Ads", agents: "AG-22", vars: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"], whatItUnlocks: "Publicar campañas de búsqueda." },
];

export function getIntegrations(): IntegrationStatus[] {
  return INTEGRATIONS.map((i) => {
    const missing = i.vars.filter((v) => !process.env[v]);
    return { name: i.name, agents: i.agents, configured: missing.length === 0, missing, whatItUnlocks: i.whatItUnlocks };
  });
}
