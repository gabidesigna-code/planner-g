import { ResetPassword } from "@/components/auth/reset-password";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "ora · senha nova" };

export default function Page() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return <ResetPassword />;
}
