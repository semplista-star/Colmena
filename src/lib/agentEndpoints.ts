// Cómo invocar cada agente desde la consola del panel: endpoint + ejemplo de entrada.
// Los agentes sin endpoint propio (AG-01/02 van juntos) apuntan al que los contiene.

export interface AgentEndpoint {
  method: "GET" | "POST";
  path: string;
  example: Record<string, unknown>; // en GET se manda como query string
}

const company = { companyName: "Acme Eventos", description: "Agencia que organiza eventos corporativos y congresos en Barcelona." };

export const AGENT_ENDPOINTS: Record<string, AgentEndpoint> = {
  "AG-01": { method: "POST", path: "/api/analyze-website", example: { domain: "acme.com" } },
  "AG-02": { method: "POST", path: "/api/analyze-website", example: { domain: "acme.com" } },
  "AG-03": { method: "POST", path: "/api/agents/market-signals", example: { companyName: "Acme", domain: "acme.com" } },
  "AG-04": { method: "POST", path: "/api/agents/enrich-lead", example: { fullName: "Laura Gómez", companyName: "Acme", companyDomain: "acme.com" } },
  "AG-05": { method: "POST", path: "/api/agents/watch-prospect", example: { domain: "acme.com" } },
  "AG-06": { method: "POST", path: "/api/generate-email", example: { senderCompany: company.companyName, senderDescription: company.description, lead: { fullName: "Laura Gómez", role: "Directora de Marketing", companyName: "Farmacéutica Norte" } } },
  "AG-07": { method: "POST", path: "/api/agents/followup", example: { leadFirstName: "Laura", originalSubject: "Vuestro próximo congreso", followUpNumber: 1 } },
  "AG-08": { method: "GET", path: "/api/agents/inbox-health", example: { domain: "colmenalife.com" } },
  "AG-09": { method: "POST", path: "/api/agents/classify-reply", example: { replyText: "Hola, suena interesante. ¿Cuánto cuesta para un evento de 200 personas?" } },
  "AG-10": { method: "POST", path: "/api/agents/book-meeting", example: { leadFirstName: "Laura" } },
  "AG-11": { method: "POST", path: "/api/ads/meta", example: { ...company, icpSegment: "Responsables de RRHH que organizan eventos internos", monthlyBudgetEUR: 600 } },
  "AG-12": { method: "POST", path: "/api/ads/linkedin", example: { ...company, icpSegment: "Directores de Marketing en farmacéuticas", monthlyBudgetEUR: 900 } },
  "AG-13": { method: "POST", path: "/api/agents/generate-ad-creative", example: { ...company, icpSegment: "Directores de Marketing en farmacéuticas", platform: "linkedin", variantCount: 3 } },
  "AG-14": { method: "POST", path: "/api/agents/bid-adjustment", example: { campaignName: "Farma LinkedIn", last72hSpendEUR: 120, last72hLeadsGenerated: 4, targetCostPerLeadEUR: 40 } },
  "AG-15": { method: "POST", path: "/api/agents/pixel-setup", example: { platform: "meta", domain: "acme.com" } },
  "AG-16": { method: "POST", path: "/api/agents/roi-report", example: { campaignName: "Farma LinkedIn", leadsGenerated: 22, meetingsBooked: 6, totalSpendEUR: 900, avgDealValueEUR: 4000 } },
  "AG-17": { method: "POST", path: "/api/agents/campaign-status", example: { campaignName: "Farma LinkedIn", leadsGenerated: 22, costPerLeadEUR: 41, targetCostPerLeadEUR: 40, meetingsBooked: 6 } },
  "AG-18": { method: "POST", path: "/api/agents/crm-sync", example: { leadId: "id-de-un-lead", crm: "hubspot" } },
  "AG-19": { method: "POST", path: "/api/agents/compliance-check", example: { emailBody: "Hola Laura, ...", hasUnsubscribeLink: true, sentToCountLast30Days: 1 } },
  "AG-20": { method: "POST", path: "/api/agents/weekly-report", example: { clientName: "Acme Eventos", weekRange: "15 - 21 sep", leadsGenerated: 38, emailsSent: 120, meetingsBooked: 5, totalSpendEUR: 450 } },
  "AG-21": { method: "POST", path: "/api/agents/seo-audit", example: { domain: "acme.com", description: company.description } },
  "AG-22": { method: "POST", path: "/api/agents/sem-campaign", example: { ...company, icpSegment: "Empresas que buscan organizar un congreso", monthlyBudgetEUR: 800 } },
  "AG-23": { method: "POST", path: "/api/agents/newsletter", example: { companyName: "Acme Eventos", audience: "clientes actuales", updates: ["Nuevo espacio en el Port Olímpic", "Paquete de eventos híbridos"] } },
  "AG-24": { method: "POST", path: "/api/agents/social-post", example: { companyName: "Acme Eventos", topic: "Cómo reducir un 30% el coste de un congreso", platforms: ["linkedin", "instagram"] } },
  "AG-25": { method: "POST", path: "/api/agents/generate-landing", example: { ...company, icpSegment: "Directores de Marketing en farmacéuticas", ctaText: "Reservar una llamada" } },
};
