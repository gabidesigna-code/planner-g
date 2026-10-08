import type { MetadataRoute } from "next";

/** PWA: permite instalar o ora na Tela de Início (no iPhone, é o que habilita as notificações). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ora",
    short_name: "ora",
    description: "Sua agenda, com a ori.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F5F0",
    theme_color: "#F6F5F0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
