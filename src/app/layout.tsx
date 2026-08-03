import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colmena — 20 agentes de IA para conseguirte clientes",
  description:
    "Colmena analiza tu negocio, encuentra a las personas que sí te van a comprar, les escribe, lanza anuncios en Meta y LinkedIn, y te trae la reunión agendada.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
