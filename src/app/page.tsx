import { AppShell } from "@/components/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { isDbConfigured } from "@/lib/server/supabase-admin";

// Lê as variáveis de ambiente a cada acesso (não congela o aviso de configuração no build)
export const dynamic = "force-dynamic";

/** A agenda abre direto: sem login. */
export default function Page() {
  if (!isDbConfigured()) return <SetupNotice />;
  return <AppShell />;
}
