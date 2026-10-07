import { Monogram } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Carregando a agenda: a marca, discreta, no centro. */
export function LoadingScreen() {
  return (
    <div className="grid min-h-[100dvh] place-items-center" role="status" aria-label="Carregando">
      <Monogram className="h-9 w-[30px] animate-pulse text-foreground/60" />
    </div>
  );
}

/** Falha ao carregar: mensagem curta e uma ação. */
export function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center px-5">
      <div className="max-w-[360px] text-center">
        <Monogram className="mx-auto h-9 w-[30px] text-foreground/70" />
        <h1 className="mt-6 text-[22px] font-semibold tracking-[-0.03em]">Não consegui abrir a sua agenda.</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          Verifique a conexão e tente de novo. Seus dados continuam guardados.
        </p>
        <p className="mt-2 break-words font-mono text-[11px] text-muted-foreground/70">{message}</p>
        <Button onClick={onRetry} className="mt-6">Tentar de novo</Button>
      </div>
    </div>
  );
}
