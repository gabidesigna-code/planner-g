import { Wordmark } from "@/components/brand/logo";

/** Mostrada quando as variáveis do Supabase (URL e chave pública anon) ainda não foram preenchidas. */
export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[28.75rem] flex-col justify-center px-5 py-10">
      <div className="mb-10 text-foreground"><Wordmark className="h-[1.625rem] w-auto" /></div>
      <p className="label-mono">Configuração</p>
      <h1 className="mt-2 text-[1.875rem] font-semibold leading-tight tracking-[-0.04em]">Falta conectar o Supabase.</h1>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-muted-foreground">
        Crie o arquivo <span className="font-mono text-foreground">.env.local</span> na raiz do projeto, copiando o <span className="font-mono text-foreground">.env.example</span>, e preencha:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-hover px-4 py-3 font-mono text-[0.7813rem] leading-relaxed text-foreground">
{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=`}
      </pre>
      <p className="mt-4 text-[0.8438rem] leading-relaxed text-muted-foreground">
        Depois reinicie o <span className="font-mono text-foreground">npm run dev</span>. Os passos completos estão em <span className="font-mono text-foreground">supabase/README.md</span>.
      </p>
    </main>
  );
}
