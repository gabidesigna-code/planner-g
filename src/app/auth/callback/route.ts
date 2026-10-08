import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createDb } from "@/lib/server/supabase";

/**
 * Volta dos links enviados por e-mail (confirmar cadastro, recuperar senha) e do login com Google (futuro):
 * troca o código por uma sessão (cookie) e segue para `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // só caminhos internos (evita redirecionar para outro site)
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  try {
    const db = await createDb();
    const { error } = code
      ? await db.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await db.auth.verifyOtp({ type, token_hash: tokenHash })
        : { error: new Error("sem código") };
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } catch {
    // cai no redirecionamento de erro abaixo
  }
  return NextResponse.redirect(`${origin}/login?erro=link`);
}
