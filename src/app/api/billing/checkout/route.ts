import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

const bodySchema = z.object({
  plan: z.enum(["annual", "semiannual"]), // 3000€/año o 1500€/6 meses
  customerEmail: z.string().email(),
});

// POST /api/billing/checkout  { "plan": "annual", "customerEmail": "cliente@empresa.com" }
// Crea una sesión de pago de Stripe y devuelve la URL de checkout.
// Requiere STRIPE_SECRET_KEY y los IDs de precio creados en el dashboard de Stripe
// (ver README -> "APIs necesarias" -> Stripe).
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Falta STRIPE_SECRET_KEY en el servidor." },
      { status: 500 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  const { plan, customerEmail } = parsed.data;

  const priceId =
    plan === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL   // 3000€ / 1 año
      : process.env.STRIPE_PRICE_SEMIANNUAL; // 1500€ / 6 meses

  if (!priceId) {
    return NextResponse.json(
      { error: `Falta el price ID de Stripe para el plan "${plan}" (ver .env.example).` },
      { status: 500 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/bienvenido?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/precios`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
