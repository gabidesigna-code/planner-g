import type { ReactNode } from "react";

export function ViewHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="animate-rise mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-4 sm:mb-10">
      <div>
        <p className="label-mono">{eyebrow}</p>
        <h1 className="mt-2 text-[2.125rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3rem]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
