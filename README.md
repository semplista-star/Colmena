# Colmena — Plataforma de 25 agentes de IA para captación de clientes

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
        market-signals/          -> AG-03: señales de compra (simulado)
        enrich-lead/             -> AG-04: enriquecimiento de contacto (simulado)
        watch-prospect/          -> AG-05: monitorización de prospectos (simulado)
        inbox-health/            -> AG-08: SPF/DMARC reales vía DNS (DKIM pendiente de RESEND_API_KEY)
        book-meeting/            -> AG-10: agenda una reunión (simulado)
        bid-adjustment/          -> AG-14: sube/baja presupuesto (regla real, dato de entrada manual)
        pixel-setup/             -> AG-15: configura el píxel de tracking (simulado)
        roi-report/              -> AG-16: coste por lead / ROI (cálculo real, dato de entrada manual)
        crm-sync/                -> AG-18: sincroniza un lead con el CRM (simulado)
        seo-audit/               -> AG-21: plan de keywords + mejoras on-page (estimado por IA)
        sem-campaign/            -> AG-22: plan de campaña Google Ads (IA) + publicación real (pendiente de token)
        newsletter/              -> AG-23: redacta la newsletter (envío real pendiente de proveedor)
        social-post/             -> AG-24: genera posts por red social (publicación real pendiente de token)
        generate-landing/        -> AG-25: genera el HTML de una landing por segmento (100% real)
      ads/
        meta/                     -> AG-11: plan de campana Meta Ads (IA) + publicacion real (pendiente de token)
        linkedin/                 -> AG-12: plan de campana LinkedIn Ads (IA) + publicacion real (pendiente de token)
      billing/checkout/          -> cobro de la licencia (Stripe: 3000E/ano o 1500E/6 meses)
      billing/webhook/           -> checkout.session.completed -> activa la licencia del Client
      clients/, campaigns/, leads/  -> CRUD sobre la base de datos
      orchestrator/run/           -> recorre los leads activos, decide que agente debe actuar y LO EJECUTA
  lib/
    agents.ts       -> registro central de los 25 agentes (nombre, prompt, estado real)
    agentActions.ts -> lógica reutilizable de los agentes que ya actúan de verdad (usada por las rutas y por el orquestador)
    orchestrator.ts -> maquina de estados que decide Y ejecuta la siguiente accion por lead
    simulate.ts     -> generadores de datos deterministas para los agentes aún sin API real
    anthropic.ts, db.ts -> clientes reutilizables (Claude / Prisma)
prisma/schema.prisma -> Client -> Campaign -> Lead -> EmailLog (Supabase: DATABASE_URL pooled + DIRECT_URL para migrar)
```

## Estado real de cada agente (no todo es humo)

- **Implementados de verdad** (IA real + persistencia en BD): AG-01, AG-02, AG-06, AG-25 (Landing Builder, no depende de ninguna API externa)
- **Contenido/plan real vía IA — la ACCIÓN externa (publicar/enviar) pendiente de tu API key**: AG-11 Meta, AG-12 LinkedIn, AG-13 Creativo, AG-21 SEO, AG-22 SEM, AG-23 Newsletter, AG-24 Redes sociales
- **Lógica determinista real, solo falta automatizar el dato de entrada**: AG-08 Buzón (SPF/DMARC ya reales por DNS), AG-14 Puja, AG-16 Contable, AG-17 Semáforo, AG-19 Cumplimiento
- **Simulados/mock para poder probar el flujo end-to-end sin la API todavía**: AG-03 Radar, AG-04 Enriquecedor, AG-05 Vigía, AG-10 Agenda, AG-18 CRM
- **Orquestados automáticamente vía IA, sin acción externa que dependa de terceros**: AG-07 Rotafolios, AG-09 Conserje, AG-20 Informe

El **orquestador** (`/api/orchestrator/run`) es el que en produccion ata todo: se ejecuta con un cron cada 15 min, decide lead a lead a que agente llamar, y **ejecuta esa acción de verdad** (genera y envía el email, comprueba cumplimiento, clasifica respuestas, agenda la reunión), dejando rastro en `EmailLog` y actualizando el `status` del lead. Usa `?dryRun=1` para solo ver las decisiones sin ejecutarlas.

### El equipo de Marketing de contenido (AG-21 a AG-25)

| Agente | Endpoint | Qué hace hoy | Qué le falta para ser 100% real |
|---|---|---|---|
| AG-21 SEO | `/api/agents/seo-audit` | Plan de keywords + mejoras on-page (estimado por IA) | `GOOGLE_SEARCH_CONSOLE_*` (gratis) o Ahrefs/Semrush para cifras reales |
| AG-22 SEM | `/api/agents/sem-campaign` | Estructura completa de campaña Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN` + `GOOGLE_ADS_CUSTOMER_ID` para publicarla |
| AG-23 Newsletter | `/api/agents/newsletter` | Redacta asunto + cuerpo completo | `RESEND_API_KEY` (o Mailchimp) para el envío real a la lista |
| AG-24 Redes sociales | `/api/agents/social-post` | Genera el texto adaptado a cada red | Token de cada red (Meta Graph, LinkedIn, X) para publicar/programar |
| AG-25 Landing Builder | `/api/agents/generate-landing` | Genera el HTML completo de una landing por segmento | Nada — funciona ya solo con `ANTHROPIC_API_KEY` |

## Todas las APIs que necesita el sistema completo

| Variable | Para que agente/funcion | Como conseguirla |
|---|---|---|
| `ANTHROPIC_API_KEY` | Todos los agentes de IA | console.anthropic.com -> API Keys |
| `DATABASE_URL` + `DIRECT_URL` | Toda la persistencia (Supabase) | supabase.com -> Settings -> Database -> Connection string (pooled y direct) |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ANNUAL` + `STRIPE_PRICE_SEMIANNUAL` | Cobro de la licencia | stripe.com -> Developers -> API Keys, y Product catalog para los precios |
| `STRIPE_WEBHOOK_SECRET` | Activar la licencia tras el pago | ver sección "Cobro con Stripe" más abajo |
| `RESEND_API_KEY` | AG-08 Buzon (DKIM + envio real) y AG-23 Newsletter | resend.com -> verificar dominio -> API Keys |
| `APOLLO_API_KEY` | AG-04 Enriquecedor | apollo.io -> plan gratuito limitado, de pago para volumen |
| `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` | AG-11 Meta (publicacion real) | business.facebook.com + developers.facebook.com -> Marketing API |
| `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AD_ACCOUNT_ID` | AG-12 LinkedIn (publicacion real) | developer.linkedin.com -> Marketing Developer Platform (aprobacion manual, pidela pronto) |
| `CALCOM_API_KEY` | AG-10 Agenda | cal.com -> Settings -> Developer -> API Keys |
| `GOOGLE_ADS_DEVELOPER_TOKEN` + `GOOGLE_ADS_CUSTOMER_ID` | AG-22 SEM (publicacion real) | ads.google.com/aw/apicenter + Google Ads API Center |

## Cobro con Stripe: pasos que tienes que hacer tú

El código ya está listo (checkout + webhook + IVA automático), pero hay 3 cosas
que solo se pueden hacer desde el dashboard de Stripe, con tu cuenta:

### 1. Crear el webhook
1. Stripe Dashboard -> **Developers -> Webhooks -> Add endpoint**.
2. URL: `https://colmenalife.com/api/billing/webhook` (o tu dominio de Vercel si `colmenalife.com` aún no apunta ahí).
3. Evento a escuchar: **`checkout.session.completed`**.
4. Copia el **"Signing secret"** (empieza por `whsec_...`) y guárdalo como `STRIPE_WEBHOOK_SECRET` en Vercel (Settings -> Environment Variables).

### 2. Activar Stripe Tax (IVA automático)
El checkout ya pide `automatic_tax: { enabled: true }` y `tax_id_collection: { enabled: true }`
(recoge el NIF/VAT del comprador). **Si no activas Stripe Tax, el checkout dará error.**
1. Stripe Dashboard -> **Settings -> Tax** (o busca "Stripe Tax").
2. Activa el registro fiscal para tu país (H&M Atlas LLC, EE.UU.) y añade los países/regiones donde tengas obligación de cobrar impuesto.
3. En **Settings -> Business settings -> Public business information**, confirma que el nombre legal que aparecerá en las facturas es **H&M Atlas LLC**.

### 3. Confirmar facturación automática
1. Stripe Dashboard -> **Settings -> Invoicing** -> activa el envío automático de factura tras cada pago.
2. Con "Stripe Tax" activo, la factura ya incluye el desglose de impuesto correctamente.

Una vez hecho esto, prueba el flujo completo en modo test con la tarjeta `4242 4242 4242 4242`
(cualquier fecha futura y CVC) desde la landing -> "Contratar". El webhook debe marcar
al `Client` correspondiente (buscado por email) con `licenseActive: true`,
`licensePlan` y `licenseExpiresAt` (+1 año o +6 meses según el plan).

## Proximos pasos tecnicos

1. Cron real: Vercel Cron o Inngest llamando a `/api/orchestrator/run` cada 15 min.
2. Autenticacion del dashboard (hoy es publico si se despliega tal cual).
3. Conectar las integraciones reales (Apollo, Resend, Meta/LinkedIn/Google Ads, Cal.com, CRM) a medida que consigas cada API key.
4. Página /onboarding: hoy el checkout activa la licencia por email, pero vincular
   esa licencia con el `domain` del cliente (vía `/api/analyze-website`) es un paso
   manual/futuro — todavía no hay una pantalla que una ambas cosas automáticamente.

## Legal, no lo olvides

Revisa RGPD/LSSI-CE (UE) o CAN-SPAM (EE.UU.) para el envio de emails en frio, y las politicas de Meta/LinkedIn Ads para segmentacion B2B, antes de operar con clientes reales.
