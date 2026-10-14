import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colmena Life — Agentes de IA para tu negocio",
  description:
    "25 agentes de IA que analizan tu empresa, identifican prospectos y gestionan emails y campañas en Meta y LinkedIn para agendar reuniones en tu calendario.",
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
