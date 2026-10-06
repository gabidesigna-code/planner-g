"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { SidePanel } from "./side-panel";
import { CommandMenu } from "./command-menu";
import { HomeView } from "./views/home";
import { WeekView } from "./views/week";
import { CalendarView } from "./views/calendar";
import { TasksView } from "./views/tasks";
import { toggleTheme } from "./theme-toggle";
import { AppCtx, type AddPreset, type AppApi, type ViewId } from "@/lib/app-context";
import { seedTasks } from "@/lib/data";
import { startOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ContextFilter, Task } from "@/lib/types";

const GO: Record<string, ViewId> = { h: "hoje", s: "semana", c: "calendario", t: "tarefas", w: "trabalho", p: "pessoal", d: "concluidos" };

export function AppShell() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [view, setView] = useState<ViewId>("hoje");
  const [filter, setFilter] = useState<ContextFilter>("tudo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState<{ open: boolean; preset: AddPreset }>({ open: false, preset: {} });
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const today = useMemo(() => startOfDay(), []);
  const gPending = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebar") === "collapsed"); } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem("sidebar", c ? "open" : "collapsed"); } catch {}
      return !c;
    });
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const navigate = useCallback((v: ViewId) => {
    setView(v);
    setMobileNav(false);
    setSelectedId(null);
  }, []);

  const toggle = useCallback((id: string) => {
    setTasks((ts) =>
      ts.map((t) =>
        t.id !== id ? t : t.status === "concluido"
          ? { ...t, status: "a-fazer", doneAt: undefined }
          : { ...t, status: "concluido", doneAt: new Date() },
      ),
    );
  }, []);

  const toggleSub = useCallback((id: string, subId: string) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id || !t.subtasks) return t;
        const subtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
        const all = subtasks.every((s) => s.done);
        const status = all && t.status !== "concluido" ? "pronto" : !all && t.status === "pronto" ? "em-andamento" : t.status;
        return { ...t, subtasks, status };
      }),
    );
  }, []);

  const update = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const remove = useCallback((id: string) => setTasks((ts) => ts.filter((t) => t.id !== id)), []);
  const openAdd = useCallback((preset: AddPreset = {}) => setMenu({ open: true, preset }), []);
  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);

  const onCreate = useCallback((t: Task) => {
    setTasks((ts) => [t, ...ts]);
    flash(`Adicionado: ${t.title}`);
  }, [flash]);

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        return openAdd();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      const typing = el.matches?.("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") {
        if (menu.open) closeMenu();
        else setSelectedId(null);
        return;
      }
      if (typing || menu.open) return;
      const k = e.key.toLowerCase();
      if (gPending.current) {
        gPending.current = false;
        if (GO[k]) { e.preventDefault(); navigate(GO[k]); }
        return;
      }
      if (k === "g") { gPending.current = true; window.setTimeout(() => (gPending.current = false), 900); }
      else if (k === "n" || k === "c" || k === "/") { e.preventDefault(); openAdd(); }
      else if (k === "[") toggleCollapsed();
      else if (k === "1") setFilter("tudo");
      else if (k === "2") setFilter("trabalho");
      else if (k === "3") setFilter("pessoal");
      else if (k === "d" && e.shiftKey) toggleTheme();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.open, openAdd, closeMenu, navigate, toggleCollapsed]);

  const api: AppApi = {
    tasks, today, now, filter, setFilter, selectedId, toggle, toggleSub, update, remove,
    openTask: setSelectedId, openAdd, navigate,
  };

  let content: React.ReactNode;
  switch (view) {
    case "hoje": content = <HomeView />; break;
    case "semana": content = <WeekView />; break;
    case "calendario": content = <CalendarView />; break;
    default: content = <TasksView mode={view} />;
  }

  const sidebar = (
    <Sidebar view={view} collapsed={collapsed} onNavigate={navigate} onToggleCollapsed={toggleCollapsed} />
  );

  return (
    <AppCtx.Provider value={api}>
      <div className="min-h-screen">
        <aside className={cn("fixed inset-y-0 left-0 z-20 hidden bg-sidebar transition-[width] duration-200 ease-out lg:block", collapsed ? "w-14" : "w-52")}>
          {sidebar}
        </aside>

        <div className="sticky top-0 z-20 flex items-center justify-between bg-background/85 px-3 py-2 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu className="h-[18px] w-[18px]" /></Button>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">g<span className="text-work">.</span></span>
          <span className="w-10" />
        </div>
        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="animate-fade absolute inset-0 bg-foreground/25" onClick={() => setMobileNav(false)} />
            <aside className="animate-slideIn absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-pop"><Sidebar view={view} collapsed={false} touch onNavigate={navigate} onToggleCollapsed={toggleCollapsed} /></aside>
          </div>
        )}

        <main className={cn("transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-14" : "lg:pl-52")}>{content}</main>

        {/* Botão flutuante: adicionar ao alcance do polegar (só no celular) */}
        <button
          onClick={() => openAdd()}
          aria-label="Adicionar"
          className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-btn transition-transform active:scale-95 lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <Plus className="h-6 w-6" strokeWidth={1.8} />
        </button>

        <SidePanel />
        <CommandMenu
          open={menu.open}
          preset={menu.preset}
          defaultContext={filter === "pessoal" || view === "pessoal" ? "pessoal" : "trabalho"}
          onClose={closeMenu}
          onCreate={onCreate}
          onToggleSidebar={toggleCollapsed}
        />

        {toast && (
          <div className="animate-menuIn fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background shadow-pop">
            {toast}
          </div>
        )}
      </div>
    </AppCtx.Provider>
  );
}
