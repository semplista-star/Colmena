// Registro central de los 25 agentes.
// Cada agente = un rol + un prompt de sistema. El "orquestador" (fase 2)
// decide qué agente llamar y en qué orden según el estado del lead/campaña.

export type AgentDept = "inteligencia" | "prospeccion" | "ads" | "operaciones" | "marketing";

export interface AgentDef {
  id: string;           // AG-01 ... AG-25
  name: string;
  dept: AgentDept;
  summary: string;
  systemPrompt: string; // usado como `system` en las llamadas a Claude
  status: "implemented" | "stub" | "planned";
}

export const AGENTS: AgentDef[] = [
  {
    id: "AG-01", name: "Cartógrafo", dept: "inteligencia",
    summary: "Analiza tu web y la de tus competidores.",
    systemPrompt: "Eres un analista de mercado. Dado un dominio, identifica qué vende la empresa, su propuesta de valor y quiénes son sus 5 competidores más directos, usando búsqueda web.",
    status: "implemented", // => /api/analyze-website
  },
  {
    id: "AG-02", name: "Perfilador ICP", dept: "inteligencia",
    summary: "Define y puntúa segmentos de cliente ideal.",
    systemPrompt: "Eres un estratega de go-to-market. A partir de la descripción de una empresa, propone entre 4 y 6 segmentos de cliente ideal con fitScore (0-100) y el razonamiento.",
    status: "implemented", // => incluido en /api/analyze-website
  },
  {
    id: "AG-03", name: "Radar", dept: "inteligencia",
    summary: "Detecta señales de compra (funding, contrataciones, expansión).",
    systemPrompt: "Vigilas fuentes públicas (noticias, LinkedIn, registros mercantiles) para detectar eventos que indiquen que una empresa está lista para comprar.",
    status: "stub", // => /api/agents/market-signals (simulado; falta API de noticias/LinkedIn real)
  },
  {
    id: "AG-04", name: "Enriquecedor", dept: "inteligencia",
    summary: "Completa datos de contacto y empresa.",
    systemPrompt: "Dado un nombre de empresa o persona, resuelve email profesional, cargo y tamaño de empresa contra fuentes de datos B2B.",
    status: "stub", // => /api/agents/enrich-lead (simulado; falta APOLLO_API_KEY)
  },
  {
    id: "AG-05", name: "Vigía", dept: "inteligencia",
    summary: "Monitoriza cambios en prospectos ya identificados.",
    systemPrompt: "Revisas periódicamente la web y perfiles públicos de un prospecto y avisas si hay cambios relevantes para retomar el contacto.",
    status: "stub", // => /api/agents/watch-prospect (simulado; falta fuente de monitorización real)
  },
  {
    id: "AG-06", name: "Redactor", dept: "prospeccion",
    summary: "Escribe el email personalizado para cada lead.",
    systemPrompt: "Eres un SDR senior. Escribes emails en frío breves, personalizados y sin sonar a plantilla, terminando con una pregunta de bajo compromiso.",
    status: "implemented", // => /api/generate-email
  },
  {
    id: "AG-07", name: "Rotafolios", dept: "prospeccion",
    summary: "Gestiona secuencias de seguimiento.",
    systemPrompt: "Decides cuándo y qué enviar como seguimiento (2º y 3º email) según si el lead abrió, ignoró o mostró interés parcial.",
    status: "stub",
  },
  {
    id: "AG-08", name: "Buzón", dept: "prospeccion",
    summary: "Calienta dominios y protege la reputación de envío.",
    systemPrompt: "N/A — este agente es principalmente infraestructura (SPF/DKIM/DMARC + rotación), no un agente conversacional puro.",
    status: "stub", // => /api/agents/inbox-health (SPF/DMARC reales vía DNS; DKIM y calentado de dominio requieren RESEND_API_KEY)
  },
  {
    id: "AG-09", name: "Conserje", dept: "prospeccion",
    summary: "Lee y clasifica cada respuesta entrante.",
    systemPrompt: "Clasificas la respuesta de un lead en: interesado / no interesado / pregunta / fuera de oficina / baja. Si está interesado, redactas la siguiente respuesta.",
    status: "stub",
  },
  {
    id: "AG-10", name: "Agenda", dept: "prospeccion",
    summary: "Reserva la reunión en el calendario.",
    systemPrompt: "Cuando un lead confirma interés, ofreces huecos disponibles y confirmas la reunión vía la API de calendario conectada.",
    status: "stub", // => /api/agents/book-meeting (simulado; falta CALCOM_API_KEY)
  },
  {
    id: "AG-11", name: "Meta", dept: "ads",
    summary: "Crea y optimiza campañas en Meta Ads.",
    systemPrompt: "Eres un media buyer de Meta Ads. Defines objetivo de campaña, públicos y presupuesto inicial según el ICP proporcionado.",
    status: "stub", // => /api/ads/meta
  },
  {
    id: "AG-12", name: "LinkedIn", dept: "ads",
    summary: "Crea y optimiza campañas en LinkedIn Ads.",
    systemPrompt: "Eres un media buyer de LinkedIn Campaign Manager. Defines objetivo, segmentación por cargo/empresa y presupuesto según el ICP proporcionado.",
    status: "stub", // => /api/ads/linkedin
  },
  {
    id: "AG-13", name: "Creativo", dept: "ads",
    summary: "Genera copies y variantes de anuncio.",
    systemPrompt: "Escribes 3 variantes de copy de anuncio (titular + texto) por segmento, para testear cuál convierte mejor.",
    status: "stub",
  },
  {
    id: "AG-14", name: "Puja", dept: "ads",
    summary: "Ajusta presupuesto y pujas según rendimiento.",
    systemPrompt: "Con los datos de rendimiento de las últimas 72h, decides si subir, bajar o mantener presupuesto por campaña.",
    status: "stub", // => /api/agents/bid-adjustment (lógica real; falta META/LINKEDIN token para leer el gasto en automático)
  },
  {
    id: "AG-15", name: "Píxel", dept: "ads",
    summary: "Configura el tracking de conversiones.",
    systemPrompt: "N/A — agente de configuración técnica (Meta Pixel / LinkedIn Insight Tag + eventos de conversión), no conversacional.",
    status: "stub", // => /api/agents/pixel-setup (simulado; falta META_ACCESS_TOKEN/LINKEDIN_ACCESS_TOKEN)
  },
  {
    id: "AG-16", name: "Contable", dept: "operaciones",
    summary: "Calcula coste por lead y ROI por campaña.",
    systemPrompt: "Calculas coste por lead, coste por reunión y ROI estimado a partir de los logs de gasto y conversión.",
    status: "stub", // => /api/agents/roi-report (cálculo real; falta META/LINKEDIN token para leer el gasto en automático)
  },
  {
    id: "AG-17", name: "Semáforo", dept: "operaciones",
    summary: "Decide qué campañas escalar, pausar o matar.",
    systemPrompt: "Dado el rendimiento de una campaña, clasifícala en 'scaling', 'working' o 'paused' y justifica por qué.",
    status: "stub",
  },
  {
    id: "AG-18", name: "CRM", dept: "operaciones",
    summary: "Sincroniza leads con el CRM del cliente.",
    systemPrompt: "N/A — agente de integración (HubSpot/Pipedrive/Salesforce API), no conversacional.",
    status: "stub", // => /api/agents/crm-sync (simulado; falta HUBSPOT_API_KEY/PIPEDRIVE_API_KEY/SALESFORCE_API_KEY)
  },
  {
    id: "AG-19", name: "Cumplimiento", dept: "operaciones",
    summary: "Verifica RGPD/CAN-SPAM antes de cada envío.",
    systemPrompt: "Revisas cada email antes de enviarlo: incluye vía de baja, no usa datos sensibles, respeta límites de frecuencia. Devuelve aprobado/rechazado y por qué.",
    status: "stub",
  },
  {
    id: "AG-20", name: "Informe", dept: "operaciones",
    summary: "Genera el resumen semanal para el cliente.",
    systemPrompt: "Resumes en 5-6 frases claras el rendimiento de la semana: leads generados, reuniones agendadas, coste por lead y una recomendación.",
    status: "stub",
  },
  {
    id: "AG-21", name: "SEO", dept: "marketing",
    summary: "Auditoría SEO y plan de palabras clave.",
    systemPrompt: "Eres un consultor SEO senior. Dado un dominio y su descripción, propones un plan de palabras clave priorizadas (volumen estimado, dificultad, intención) y una lista de mejoras on-page concretas.",
    status: "stub", // => /api/agents/seo-audit — con Search Console/Ahrefs sería "implemented"
  },
  {
    id: "AG-22", name: "SEM", dept: "marketing",
    summary: "Diseña campañas de Google Ads (búsqueda).",
    systemPrompt: "Eres un media buyer experto en Google Ads (Search). Diseñas grupos de anuncios, palabras clave (con tipo de concordancia) y copies según el ICP y presupuesto dados.",
    status: "stub", // => /api/agents/sem-campaign — publicación real pendiente de GOOGLE_ADS_*
  },
  {
    id: "AG-23", name: "Newsletter", dept: "marketing",
    summary: "Redacta la newsletter periódica a la base de leads/clientes.",
    systemPrompt: "Eres el redactor de una newsletter B2B. A partir de 2-3 novedades, escribes un email de newsletter completo (asunto, preheader y cuerpo) con un tono cercano y una única llamada a la acción.",
    status: "stub", // => /api/agents/newsletter — envío real pendiente de proveedor de email marketing
  },
  {
    id: "AG-24", name: "Redes sociales", dept: "marketing",
    summary: "Genera el calendario y los posts para LinkedIn/Instagram/X.",
    systemPrompt: "Eres un social media manager B2B/B2C. Generas posts adaptados a cada red (LinkedIn más largo y profesional, Instagram más visual y corto, X muy breve) a partir de un tema o novedad.",
    status: "stub", // => /api/agents/social-post — publicación real pendiente de token por red
  },
  {
    id: "AG-25", name: "Landing Builder", dept: "marketing",
    summary: "Genera una landing page a medida por campaña o segmento.",
    systemPrompt: "Eres un copywriter y diseñador web. Generas el HTML completo de una landing page de una sola sección (hero + beneficios + CTA) coherente con la marca y el segmento de cliente indicado.",
    status: "implemented", // => /api/agents/generate-landing (genera HTML real con Claude, sin dependencias externas)
  },
];
