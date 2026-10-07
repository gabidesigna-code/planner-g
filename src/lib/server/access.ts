import "server-only";

/**
 * PONTO ÚNICO DE PROTEÇÃO DA API.
 *
 * Toda rota /api passa por aqui antes de tocar no banco. Hoje não há PIN nem senha (uso individual,
 * sem login), então só aplicamos uma defesa barata: um pedido de ESCRITA vindo de outro site, dentro
 * do navegador, é recusado (isso não impede chamadas diretas por curl).
 *
 * Para proteger a agenda com um PIN/senha única no futuro, basta validar um cookie ou cabeçalho
 * aqui e devolver 401. Nenhuma outra parte do app precisa mudar.
 */
export function requireAccess(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return deny(403, "Origem não permitida.");

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return deny(403, "Origem não permitida.");
    } catch {
      return deny(403, "Origem inválida.");
    }
  }

  // FUTURO (PIN): if (!pinOk(request)) return deny(401, "PIN necessário.");
  return null;
}

function deny(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}
