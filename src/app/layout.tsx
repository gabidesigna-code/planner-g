import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { buildPaletteCss, themeInitScript } from "@/theme/css";
import { ThemeProvider } from "@/theme/theme-provider";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F6F5F0" }, { media: "(prefers-color-scheme: dark)", color: "#0F1311" }] };

export const metadata: Metadata = {
  title: "ora",
  description: "Agenda pessoal.",
  // iPhone: abrir pela Tela de Início como app (necessário para receber notificações)
  appleWebApp: { capable: true, title: "ora", statusBarStyle: "default" },
};

const paletteCss = buildPaletteCss();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: paletteCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
