import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente do Supabase POR PESSOA, no servidor. Usa a chave pública (anon) + a sessão da própria pessoa (cookie):
 * as consultas rodam como o papel `authenticated` com o JWT dela, então o RLS do banco vale de verdade e uma
 * rota com bug não consegue ler nem gravar dados de outra conta.
 *
 * O app NÃO usa a chave service_role (que ignora o RLS). Ela não existe mais no código nem nas variáveis do app.
 */

export class ConfigError extends Error {
  constructor() {
    super("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_ANON_KEY (e a URL do projeto).");
  }
}

const env = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
});

export const isSupabaseConfigured = () => Boolean(env().url && env().anon);

export interface Auth {
  /** cliente com a sessão da pessoa: tudo que passa por ele é filtrado pelo RLS */
  db: SupabaseClient;
  /** vem do token verificado pelo Supabase Auth, nunca do corpo da requisição */
  userId: string;
  email: string | null;
}

/** Cliente ligado aos cookies da requisição (renova o token quando preciso). */
export async function createDb(): Promise<SupabaseClient> {
  const { url, anon } = env();
  if (!url || !anon) throw new ConfigError();
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // chamado de um Server Component (não pode gravar cookie): o middleware já renova a sessão
        }
      },
    },
  });
}

/** Quem está logado (verificado no Supabase Auth a cada chamada) ou null. */
export async function getAuth(): Promise<Auth | null> {
  const db = await createDb();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;
  return { db, userId: data.user.id, email: data.user.email ?? null };
}
