"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage } from "@/services/storage";

export function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  storage.set("theme", next ? "dark" : "light");
  return next;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  return (
    <Button variant="ghost" size="icon" onClick={() => setDark(toggleTheme())} aria-label="Alternar tema" title="Alternar tema">
      {dark ? <Sun className="h-[15px] w-[15px]" strokeWidth={1.7} /> : <Moon className="h-[15px] w-[15px]" strokeWidth={1.7} />}
    </Button>
  );
}
