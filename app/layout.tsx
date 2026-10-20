import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { BASE_PATH } from "@/lib/public-config";
import "./globals.css";

const sans = localFont({ src: "./fonts/manrope.woff2", variable: "--font-sans", display: "swap", weight: "200 800" });
const serif = localFont({ src: "./fonts/cormorant.woff2", variable: "--font-serif", display: "swap", weight: "300 700" });

export const metadata: Metadata = {
  title: { default: "App Maratona 21", template: "%s · Maratona 21" },
  description: "Seu painel diário de progresso na Maratona de Emagrecimento de 21 Dias — Nutri Gisele Silveira.",
  applicationName: "Maratona 21",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Maratona 21", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE_PATH}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14100D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
