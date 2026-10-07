import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente do Supabase com a chave PRIVADA (service_role). Só existe no servidor do Next.js:
 * o `import "server-only"` faz o build falhar se algum componente do navegador importar este arquivo,
 * e as variáveis NÃO têm o prefixo NEXT_PUBLIC_, então nunca vão para o navegador.
 */

export class ConfigError extends Error {
  constructor() {
    super("Banco não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
}

export const isDbConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Aceita a URL como colada do painel: tira espaços, barras finais e um "/rest/v1" que sobrou. */
const normalizeUrl = (raw: string) => raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ConfigError();
  admin ??= createClient(normalizeUrl(url), key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
