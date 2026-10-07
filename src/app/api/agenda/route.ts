import { route } from "@/lib/server/api";
import { loadAgenda } from "@/lib/server/agenda-db";

export const dynamic = "force-dynamic";

/** Tudo o que a tela precisa: itens, categorias, nota rápida e preferências. */
export const GET = route(async () => loadAgenda());
