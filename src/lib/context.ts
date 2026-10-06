import type { Context, Task } from "@/types";

/** Classes literais (para o JIT do Tailwind enxergar). */
export const CTX: Record<Context, { label: string; dot: string; text: string; tint: string; bar: string; edge: string; check: string }> = {
  trabalho: {
    label: "Trabalho",
    dot: "bg-work",
    text: "text-work",
    tint: "bg-work-soft hover:bg-[color-mix(in_srgb,hsl(var(--work))_9%,hsl(var(--work-soft)))]",
    bar: "bg-work",
    edge: "",
    check: "data-[state=checked]:border-work data-[state=checked]:bg-work",
  },
  pessoal: {
    label: "Pessoal",
    dot: "bg-personal",
    text: "text-personal",
    tint: "bg-personal-soft hover:bg-[color-mix(in_srgb,hsl(var(--personal))_9%,hsl(var(--personal-soft)))]",
    bar: "bg-personal",
    edge: "",
    check: "data-[state=checked]:border-personal data-[state=checked]:bg-personal",
  },
};

/** Linha secundária simples: "FCA · Financeiro", "Casa" */
export function detail(t: Task) {
  return t.context === "trabalho"
    ? [t.client, t.topic ?? t.category].filter(Boolean).join(" · ")
    : t.category;
}
