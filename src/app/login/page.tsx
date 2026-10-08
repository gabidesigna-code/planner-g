import { AuthScreen } from "@/components/auth/auth-screen";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "ora · entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { erro } = await searchParams;
  return <AuthScreen linkError={erro === "link"} />;
}
