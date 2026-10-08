import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Porteiro das PÁGINAS: renova a sessão (cookie) a cada visita e manda quem não está logado para /login
 * (e quem já está logado, de /login para o app). As rotas /api não passam por aqui: cada uma confere a
 * sessão sozinha (authed) e responde 401.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request }); // sem configuração: a página mostra o aviso de setup

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser confirma o token no Supabase Auth (não confia só no cookie)
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const open = path === "/login" || path.startsWith("/auth/");

  if (!data.user && !open) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return withCookies(NextResponse.redirect(to), response);
  }
  if (data.user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return withCookies(NextResponse.redirect(to), response);
  }
  return response;
}

/** Mantém os cookies renovados também nos redirecionamentos. */
function withCookies(target: NextResponse, from: NextResponse) {
  for (const c of from.cookies.getAll()) target.cookies.set(c);
  return target;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|brand/|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
