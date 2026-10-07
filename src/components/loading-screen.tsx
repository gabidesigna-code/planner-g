import { Monogram } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Carregando a agenda: a marca, discreta, no centro. */
export function LoadingScreen() {
  return (
    <div className="grid min-h-[100dvh] place-items-center" role="status" aria-label="Carregando">
      <Monogram tile className="h-12 w-12 animate-pulse opacity-70" />
    </div>
  );
}

/** Falha ao carregar: mensagem curta e uma ação. */
export function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center px-5">
      <div className="max-w-[22.5rem] text-center">
        <Monogram tile className="mx-auto h-12 w-12 opacity-80" />
        <h1 className="mt-6 text-[1.375rem] font-semibold tracking-[-0.03em]">Não consegui abrir a sua agenda.</h1>
        <p className="mt-2 text-[0.8438rem] leading-relaxed text-muted-foreground">
          Verifique a conexão e tente de novo. Seus dados continuam guardados.
        </p>
        <p className="mt-2 break-words font-mono text-[0.6875rem] text-muted-foreground/70">{message}</p>
        <Button onClick={onRetry} className="mt-6">Tentar de novo</Button>
      </div>
    </div>
  );
}
