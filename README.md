# Colmena — Plataforma de 20 agentes de IA para captación de clientes

Web (landing + dashboard) + backend de agentes, todo en un único proyecto Next.js.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena tus claves (ver lista abajo)
npx prisma migrate dev --name init
npm run dev
```

Abre `http://localhost:3000` (landing pública) y `http://localhost:3000/dashboard` (panel interno).

## Arquitectura

```
src/
  app/
    page.tsx                 -> landing publica (usa src/lib/agents.ts para pintar la colmena)
    dashboard/page.tsx        -> panel interno: clientes -> campanas -> leads (datos reales de Postgres)
    bienvenido/, precios/     -> paginas de apoyo al checkout de Stripe
    api/
      analyze-website/        -> AG-01 + AG-02: analiza una web y genera el ICP (guarda en BD)
      generate-email/          -> AG-06: redacta un email personalizado
      score-lead/               -> AG-02 aplicado a un lead concreto
      agents/
        followup/                -> AG-07: redacta el seguimiento N
        classify-reply/          -> AG-09: clasifica una respuesta entrante
        campaign-status/         -> AG-17: decide escalar/mantener/pausar (regla determinista)
        compliance-check/        -> AG-19: valida RGPD/CAN-SPAM antes de enviar
        weekly-report/           -> AG-20: genera el resumen semanal
        generate-ad-creative/    -> AG-13: copies de anuncio para Meta o LinkedIn
      ads/
        meta/                     -> AG-11: plan de campana Meta Ads (IA) + publicacion real (pendiente de token)
        linkedin/                 -> AG-12: plan de campana LinkedIn Ads (IA) + publicacion real (pendiente de token)
      billing/checkout/          -> cobro de la licencia (Stripe: 3000E/ano o 1500E/6 meses)
      clients/, campaigns/, leads/  -> CRUD sobre la base de datos
      orchestrator/run/           -> recorre los leads activos y decide que agente debe actuar en cada uno
  lib/
    agents.ts     -> registro central de los 20 agentes (nombre, prompt, estado real)
    orchestrator.ts -> maquina de estados que decide la siguiente accion por lead
    anthropic.ts, db.ts -> clientes reutilizables (Claude / Prisma)
prisma/schema.prisma -> Client -> Campaign -> Lead -> EmailLog
```

## Estado real de cada agente (no todo es humo)

- **Implementados de verdad** (llaman a Claude y guardan en BD): AG-01, AG-02, AG-06
- **Logica IA lista, publicacion externa pendiente de tu API key**: AG-11, AG-12, AG-13
- **Logica lista (IA o reglas), sin disparo automatico aun**: AG-07, AG-09, AG-17, AG-19, AG-20
- **Requieren una integracion externa que aun no tienes** (AG-03 Radar, AG-04 Enriquecedor, AG-05 Vigia, AG-08 Buzon, AG-10 Agenda, AG-14 Puja, AG-15 Pixel, AG-16 Contable, AG-18 CRM): la logica se anade en cuanto tengamos esa API, estan descritos en `agents.ts` para que quede claro que falta.

El **orquestador** (`/api/orchestrator/run`) es el que en produccion ata todo: se ejecuta con un cron cada 15 min y decide, lead a lead, a que agente llamar. Ahora mismo devuelve las decisiones sin ejecutarlas todavia (para no enviar nada real sin que tu lo veas primero), el siguiente paso es conectar cada decision con su endpoint.

## Todas las APIs que necesita el sistema completo

| Variable | Para que agente/funcion | Como conseguirla |
|---|---|---|
| `ANTHROPIC_API_KEY` | Todos los agentes de IA | console.anthropic.com -> API Keys |
| `DATABASE_URL` | Toda la persistencia | supabase.com (Postgres gratis) |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ANNUAL` + `STRIPE_PRICE_SEMIANNUAL` | Cobro de la licencia | stripe.com -> Developers -> API Keys, y Product catalog para los precios |
| `RESEND_API_KEY` | AG-08 Buzon (envio real) | resend.com -> verificar dominio -> API Keys |
| `APOLLO_API_KEY` | AG-04 Enriquecedor | apollo.io -> plan gratuito limitado, de pago para volumen |
| `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` | AG-11 Meta (publicacion real) | business.facebook.com + developers.facebook.com -> Marketing API |
| `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AD_ACCOUNT_ID` | AG-12 LinkedIn (publicacion real) | developer.linkedin.com -> Marketing Developer Platform (aprobacion manual, pidela pronto) |
| `CALCOM_API_KEY` | AG-10 Agenda | cal.com -> Settings -> Developer -> API Keys |

## Proximos pasos tecnicos

1. Conectar el orquestador para que ejecute de verdad cada decision (hoy solo las calcula).
2. Cron real: Vercel Cron o Inngest llamando a `/api/orchestrator/run` cada 15 min.
3. Checkout de Stripe: falta el client component que llama a `/api/billing/checkout` desde el boton "Contratar" y redirige a `checkoutUrl`.
4. Autenticacion del dashboard (hoy es publico si se despliega tal cual).

## Legal, no lo olvides

Revisa RGPD/LSSI-CE (UE) o CAN-SPAM (EE.UU.) para el envio de emails en frio, y las politicas de Meta/LinkedIn Ads para segmentacion B2B, antes de operar con clientes reales.
