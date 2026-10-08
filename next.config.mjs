// A URL e a chave PÚBLICA (anon) do Supabase precisam chegar ao navegador (login e Realtime). A anon key é pública
// por desenho: sozinha não acessa nada, porque o RLS limita cada pessoa aos próprios dados.
// Aceita a URL como colada do painel (tira barras finais e "/rest/v1") e reaproveita a SUPABASE_URL antiga.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon },
};
export default nextConfig;
