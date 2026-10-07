import { Wordmark } from "@/components/brand/logo";

/** Mostrada quando as variáveis do servidor (Supabase) ainda não foram preenchidas. */
export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center px-5 py-10">
      <div className="mb-10 text-foreground"><Wordmark className="h-[26px] w-auto" /></div>
      <p className="label-mono">Configuração</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em]">Falta conectar o banco.</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        Crie o arquivo <span className="font-mono text-foreground">.env.local</span> na raiz do projeto, copiando o <span className="font-mono text-foreground">.env.example</span>, e preencha:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-hover px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground">
{`SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=`}
      </pre>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
        Depois reinicie o <span className="font-mono text-foreground">npm run dev</span>. Os passos completos estão em <span className="font-mono text-foreground">supabase/README.md</span>.
      </p>
    </main>
  );
}
