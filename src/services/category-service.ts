import { NO_CATEGORY, type Category, type Context } from "@/types";

/**
 * Nomes de categoria para as listas da interface: as do usuário (vindas do banco)
 * e, por último, "Outros" (item sem categoria). Criar/editar categorias entra depois,
 * sem mexer nos componentes: eles só consomem estas funções.
 */
export function categoryNames(categories: Category[], context: Context): string[] {
  return [...categories.filter((c) => c.context === context).map((c) => c.name), NO_CATEGORY];
}

export function allCategoryNames(categories: Category[]): string[] {
  return [...new Set([...categories.map((c) => c.name), NO_CATEGORY])];
}
