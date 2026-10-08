"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export interface Watch {
  table: string;
  /** filtro do Postgres Changes, ex.: "user_id=eq.<id>" (o RLS já limita ao que é da conta; o filtro só poupa tráfego) */
  filter?: string;
}

/**
 * Avisa quando algo muda no banco (em outro aparelho, por exemplo) para a tela reconferir os dados.
 * O Supabase Realtime respeita o RLS: só chegam avisos de linhas da PRÓPRIA conta. O aviso não traz dados:
 * a tela refaz a leitura normal (pelas rotas /api), então a regra de mesclagem e o isolamento continuam os mesmos.
 *
 * Complemento, não substituto: se o Realtime falhar (rede, limite, tabela fora da publicação), a atualização
 * a cada 15 s e ao voltar para a aba continua funcionando.
 */
export function useRealtime(channelName: string | null, watches: Watch[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = watches.map((w) => `${w.table}|${w.filter ?? ""}`).join(",");

  useEffect(() => {
    if (!channelName || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = supabaseBrowser();
    let timer: number | undefined;
    // vários avisos seguidos (ex.: uma conversa e suas mensagens) viram uma só leitura
    const fire = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), 400);
    };
    let channel = supabase.channel(channelName);
    for (const w of watches) channel = channel.on("postgres_changes", { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, fire);
    channel.subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
    // `key` resume as tabelas/filtros observados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, key]);
}
