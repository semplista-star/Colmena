# Cómo conseguir las claves de Colmena

Cada clave se pone en **Vercel → tu proyecto → Settings → Environment Variables**. Después hay que hacer **Redeploy** para que la web la lea.
El panel (`/dashboard`) tiene una tabla "Integraciones" que te dice cuáles faltan.

Orden recomendado: 1 → 2 → 3 → 4 (el 4 lo hace cada cliente). Con esos cuatro pasos el email en frío ya funciona de principio a fin. Meta, LinkedIn y Google Ads van al final porque tardan días en aprobarse.

---

## 1. Seguridad del panel (5 min, gratis)

Genera dos cadenas aleatorias largas, por ejemplo en https://www.random.org/strings/ o con `openssl rand -hex 24`.

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | La contraseña que usarás para entrar al panel. El usuario puede ser cualquiera, por ejemplo `admin`. |
| `CRON_SECRET` | Una cadena aleatoria. Vercel la usa para lanzar el orquestador cada mañana laborable (9:00 UTC). |

Sin `ADMIN_PASSWORD`, **cualquiera** que conozca la URL puede entrar al panel y lanzar agentes. Es lo primero que hay que poner.

## 2. Envío de email — Resend (20 min + esperar al DNS, gratis hasta 3.000 emails/mes)

1. Crea una cuenta en https://resend.com.
2. **Domains → Add domain**. Usa un **subdominio**, no el dominio principal, por ejemplo `mail.colmenalife.com`. Así, si algo va mal con el email en frío, no se ve afectado el correo normal de la empresa.
3. Resend te da 3–4 registros DNS (SPF, DKIM, MX). Añádelos donde tengas el dominio (GoDaddy, Cloudflare, IONOS…) y pulsa **Verify**. Tarda entre unos minutos y unas horas.
4. **API Keys → Create API key** con permiso "Sending access".

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `Tu Nombre <tu.nombre@mail.colmenalife.com>`. Tiene que ser del dominio verificado. |
| `EMAIL_REPLY_TO` | Opcional: el buzón donde quieres recibir las respuestas. |

**Importante para no acabar en spam:** los primeros días envía pocos emails (10–20 al día) y ve subiendo. `MAX_ACTIONS_PER_RUN` limita cuántos se envían en cada pasada (20 por defecto).

## 3. Respuestas de los leads (10 min)

Para que AG-09 clasifique las respuestas, tienen que llegar a Colmena. Hay dos opciones:

- **Automática (Resend Inbound):** en Resend, activa la recepción de emails en tu dominio y crea un webhook del evento `email.received` hacia
  `https://www.colmenalife.com/api/webhooks/inbound?token=TU_INBOUND_SECRET`.
  Sirve igual cualquier otro servicio que reenvíe emails como JSON `{from, subject, text}`: Zapier, Make, Cloudmailin…
- **Manual (sin configurar nada):** en el panel, abre el lead con "Ver", pega su respuesta y pulsa "Registrar respuesta".

| Variable | Valor |
|---|---|
| `INBOUND_SECRET` | Una cadena aleatoria, la misma que pones en la URL del webhook. |

## 4. Agenda — Cal.com (lo conecta cada cliente)

Cada cliente usa **su propia** agenda. No hace falta ninguna clave de Cal.com.

1. El cliente crea una cuenta gratis en https://cal.com y conecta su Google Calendar u Outlook.
2. Crea un evento de 30 min y te pasa su enlace público, por ejemplo `https://cal.com/mimper/30min`.
3. En el panel, en la ficha del cliente, pegas ese enlace en **"Agenda del cliente (Cal.com)"**.
4. El cliente crea en Cal.com un webhook (**Settings → Developer → Webhooks → New**) con el evento **Booking Created**. La URL y el secret que tiene que poner aparecen en esa misma tarjeta del panel, en "Ver instrucciones para el cliente".

| Variable (ya configurada en Vercel) | Valor |
|---|---|
| `CALCOM_WEBHOOK_SECRET` | El secret común que cada cliente pone en su webhook. |

Cuando un lead reserva, pasa solo a "reunión" en el panel. Si un cliente no tiene enlace, AG-10 pregunta al lead por email qué día le va bien.

## 5. Datos de contacto — Apollo (10 min, hay plan gratuito)

1. Crea una cuenta en https://www.apollo.io.
2. **Settings → Integrations → API → Create new key**. Márcala como "master key" o dale acceso a "people/match".

| Variable | Valor |
|---|---|
| `APOLLO_API_KEY` | La clave. |

Con esta clave, el botón "Buscar email (AG-04)" del panel devuelve emails verificados en lugar de adivinarlos. Cada búsqueda gasta créditos de Apollo.

## 6. Anuncios (lo más lento: días o semanas de aprobación)

Hoy estos agentes ya **diseñan** la campaña con IA (público, presupuesto y textos). Publicarla de verdad requiere:

- **Meta Ads:** una cuenta de Business Manager con cuenta publicitaria, una app en https://developers.facebook.com con el producto "Marketing API" y un token de usuario del sistema con permiso `ads_management`.
  Variables: `META_ACCESS_TOKEN` y `META_AD_ACCOUNT_ID` (`act_...`).
- **LinkedIn Ads:** una app en https://developer.linkedin.com y solicitar el acceso a "Advertising API". LinkedIn lo revisa a mano.
  Variables: `LINKEDIN_ACCESS_TOKEN` y `LINKEDIN_AD_ACCOUNT_ID`.
- **Google Ads:** una cuenta de administrador (MCC) y solicitar el Developer Token en el Centro de API.
  Variables: `GOOGLE_ADS_DEVELOPER_TOKEN` y `GOOGLE_ADS_CUSTOMER_ID`.

Empieza a pedirlos ya para que estén aprobados cuando se implemente la publicación automática (siguiente fase).

---

## Después de actualizar el código: migrar la base de datos

Esta versión añade columnas nuevas (`EmailLog.messageId`, `EmailLog.simulated` y `Lead.lastClassifiedAt`). Antes de publicar la nueva versión:

**GitHub → Actions → DB Migrate → Run workflow.**

Son columnas nuevas y opcionales: no se borra ningún dato.
