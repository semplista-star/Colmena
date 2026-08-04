import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

const PLAN_DURATION_MS: Record<string, number> = {
  annual: 365 * 24 * 60 * 60 * 1000,
  semiannual: 182 * 24 * 60 * 60 * 1000, // ~6 meses
};

// POST /api/billing/webhook
// Configúralo en Stripe Dashboard -> Developers -> Webhooks -> Add endpoint:
//   URL: https://colmenalife.com/api/billing/webhook
//   Evento a escuchar: checkout.session.completed
// Copia el "Signing secret" (whsec_...) como STRIPE_WEBHOOK_SECRET en Vercel.
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Falta STRIPE_WEBHOOK_SECRET en el servidor." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta la cabecera stripe-signature." }, { status: 400 });
  }

  // Stripe firma el body TAL CUAL se recibió: hay que leerlo como texto crudo,
  // nunca como JSON parseado, o la verificación de firma falla.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Firma inválida: ${String(err)}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? session.customer_email;
    const plan = session.metadata?.plan;

    if (!email || !plan || !(plan in PLAN_DURATION_MS)) {
      // No deberia pasar (lo fijamos nosotros en /api/billing/checkout), pero
      // si pasa, confirmamos recepción a Stripe igualmente para que no reintente
      // sin fin, y dejamos constancia del problema.
      console.error("checkout.session.completed sin email o plan válido", { email, plan, sessionId: session.id });
      return NextResponse.json({ received: true, warning: "email o plan ausente" });
    }

    const licenseExpiresAt = new Date(Date.now() + PLAN_DURATION_MS[plan]);

    await db.client.upsert({
      where: { email },
      update: {
        licenseActive: true,
        licensePlan: plan,
        licenseExpiresAt,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        stripeSessionId: session.id,
      },
      create: {
        email,
        licenseActive: true,
        licensePlan: plan,
        licenseExpiresAt,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
        stripeSessionId: session.id,
      },
    });
  }

  return NextResponse.json({ received: true });
}
