import { authed } from "@/lib/server/api";
import { loadAgenda } from "@/lib/server/agenda-db";

export const dynamic = "force-dynamic";

/** Tudo o que a tela precisa, SÓ da conta logada: itens, categorias, nota rápida e preferências. */
export const GET = authed(async (_request, { db, userId, email }) => loadAgenda(db, userId, email));
