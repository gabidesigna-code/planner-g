"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/theme-provider";

/** Atalho claro/escuro. O modo "Sistema" e a paleta ficam em Aparência. */
export function ThemeToggle() {
  const { dark, toggleMode } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleMode} aria-label="Alternar claro e escuro" title="Alternar claro e escuro">
      {dark ? <Sun className="h-[0.9375rem] w-[0.9375rem]" strokeWidth={1.7} /> : <Moon className="h-[0.9375rem] w-[0.9375rem]" strokeWidth={1.7} />}
    </Button>
  );
}
