import type { Context } from "@/types";

/**
 * Categorias padrão. Ficam atrás desta função para que a edição futura
 * (criar/renomear categorias, persistir no Supabase) não mexa nos componentes.
 */
const DEFAULT_CATEGORIES: Record<Context, string[]> = {
  trabalho: ["Fiscal", "Financeiro", "Clientes", "Reuniões", "Administrativo", "Outros"],
  pessoal: ["Casa", "Compras", "Saúde", "Família", "Financeiro pessoal", "Lazer", "Outros"],
};

export function listCategories(context: Context): string[] {
  return DEFAULT_CATEGORIES[context];
}

export function allCategories(): string[] {
  return [...new Set([...DEFAULT_CATEGORIES.trabalho, ...DEFAULT_CATEGORIES.pessoal])];
}
