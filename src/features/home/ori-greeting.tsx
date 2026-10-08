"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OriMonogram } from "@/components/brand/logo";
import { useApp } from "@/lib/app-context";
import { choose, pickKey, periodOf, readSituation, render, stillValid, type Pick } from "@/lib/ori-greeting";

const STORE = "ora-greeting-v1";
/** Enquanto a situação não muda, a mesma frase é reaproveitada por este tempo (voltar para o Hoje não troca a frase). */
const REUSE_MS = 20 * 60_000;

interface Stored {
  pick: Pick;
  at: number;
}

function readStored(): Stored | null {
  try {
    const d = JSON.parse(window.localStorage.getItem(STORE) ?? "null") as Stored | null;
    return d && typeof d.at === "number" && typeof d.pick?.a === "string" && typeof d.pick?.b === "string" ? d : null;
  } catch {
    return null;
  }
}

function writeStored(s: Stored) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    // sem armazenamento: a frase só não é lembrada entre acessos
  }
}

/**
 * Saudação da ori, no topo do Hoje. A frase é sorteada UMA vez quando a tela abre (ou quando muda o período
 * do dia ou o tipo de comentário); depois só os números/horário acompanham a agenda, sem trocar o texto à toa.
 * Para não repetir, o sorteio foge da última frase usada (guardada no aparelho).
 */
function useOriGreeting() {
  const { tasks, today, now, ownerName } = useApp();
  const name = ownerName.trim().split(/\s+/)[0] ?? "";
  const situation = useMemo(() => (now ? readSituation(tasks, today, now) : null), [tasks, today, now]);
  const period = now ? periodOf(now.getHours()) : null;
  const [pick, setPick] = useState<Pick | null>(null);
  const current = useRef<Pick | null>(null);
  const key = period && situation ? pickKey(period, situation, name) : null;

  useEffect(() => {
    if (!period || !situation) return;
    if (current.current && stillValid(current.current, period, situation, name)) return; // mesma situação: mantém a frase
    const stored = readStored();
    let next: Pick;
    if (stored && Date.now() - stored.at < REUSE_MS && stillValid(stored.pick, period, situation, name)) {
      next = stored.pick; // voltou ao Hoje há pouco: mesma frase
    } else {
      next = choose(period, situation, name, { a: stored?.pick.a, b: stored?.pick.b });
      writeStored({ pick: next, at: Date.now() });
    }
    current.current = next;
    setPick(next);
    // `key` já resume período + tipo de comentário + nome
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return pick && situation ? { pick, ...render(pick, situation, name) } : null;
}

export function OriGreeting() {
  const g = useOriGreeting();
  return (
    <div className="flex min-h-[2.5rem] items-center gap-2.5 lg:min-h-[2.75rem] lg:gap-3">
      <OriMonogram crop className="h-6 w-auto shrink-0 text-foreground lg:h-7" />
      {g && (
        <p key={g.pick.a + g.pick.b} className="animate-rise min-w-0 leading-snug">
          <span className="block text-[0.9375rem] font-medium lg:text-[1.0625rem]">{g.line1}</span>
          <span className="block text-[0.8438rem] text-muted-foreground lg:text-[0.9375rem]">{g.line2}</span>
        </p>
      )}
    </div>
  );
}
