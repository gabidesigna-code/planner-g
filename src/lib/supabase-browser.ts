"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase no NAVEGADOR: serve só para entrar/sair/recuperar senha e para o Realtime. Usa a chave pública (anon),
 * que sozinha não acessa nada (o RLS limita cada conta aos próprios dados). Os dados da agenda continuam
 * passando pelas rotas /api. A sessão fica em cookie, compartilhada com o servidor.
 */
let client: SupabaseClient | null = null;

export const isAuthConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function supabaseBrowser(): SupabaseClient {
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
  return client;
}
