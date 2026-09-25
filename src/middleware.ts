import { NextRequest, NextResponse } from "next/server";

// Protege el panel y las APIs de agentes con usuario/contraseña (HTTP Basic).
// - ADMIN_PASSWORD: contraseña del panel (usuario: cualquiera, ej. "admin").
//   Si no está definida, no se protege nada (útil en local; en producción ¡ponla!).
// - CRON_SECRET: Vercel Cron lo manda como "Authorization: Bearer <secret>".
// Quedan fuera las rutas que llaman terceros (Stripe, Resend, Cal.com), que se
// autentican con su propia firma o token, y el checkout público.

const PUBLIC_API = ["/api/billing/", "/api/webhooks/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();

  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
    } catch {
      // cabecera mal formada: cae al 401
    }
  }

  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Colmena", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
