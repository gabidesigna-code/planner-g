"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { Toast } from "./toast";
import { SyncBar } from "./sync-bar";
import { LoadErrorScreen, LoadingScreen } from "./loading-screen";
import { Wordmark } from "./brand/logo";
import { SidePanel } from "@/features/task-details/side-panel";
import { CommandMenu } from "@/features/add/command-menu";
import { TaskForm } from "@/features/task-form/task-form";
import { HomeView } from "@/features/home/home-view";
import { WeekView } from "@/features/week/week-view";
import { CalendarView } from "@/features/calendar/calendar-view";
import { TasksView } from "@/features/tasks/tasks-view";
import { AppearanceSheet } from "@/features/appearance/appearance-sheet";
import { useTheme } from "@/theme/theme-provider";
import { AppCtx, type AddPreset, type AppApi, type ViewId } from "@/lib/app-context";
import { startOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { useQuickNote } from "@/hooks/use-quick-note";
import { httpAgendaRepository } from "@/services/agenda-repository";
import { allCategoryNames, categoryNames } from "@/services/category-service";
import { storage } from "@/services/storage";
import type { ContextFilter, Kind } from "@/types";

const GO: Record<string, ViewId> = { h: "hoje", s: "semana", c: "calendario", t: "tarefas", w: "trabalho", p: "pessoal", d: "concluidos" };

export function AppShell() {
  const { toast, notify, notifyError, dismiss } = useToast();
  const { tasks, categories, note: serverNote, ownerName, ready, loadError, reload, saving, recent, toggle, toggleSub, update, remove, create, reorder } =
    useTasks({ repo: httpAgendaRepository, notify, notifyError });
  const note = useQuickNote({ serverNote, ready, notifyError });
  const [view, setView] = useState<ViewId>("hoje");
  const [filter, setFilter] = useState<ContextFilter>("tudo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState<{ open: boolean; preset: AddPreset }>({ open: false, preset: {} });
  const [form, setForm] = useState<{ open: boolean; kind: Kind; preset: AddPreset }>({ open: false, kind: "tarefa", preset: {} });
  const [appearance, setAppearance] = useState(false);
  const { toggleMode } = useTheme();
  const [now, setNow] = useState<Date | null>(null);
  const today = useMemo(() => startOfDay(), []);
  const gPending = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setCollapsed(storage.get("sidebar") === "collapsed");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      storage.set("sidebar", c ? "open" : "collapsed");
      return !c;
    });
  }, []);

  const navigate = useCallback((v: ViewId) => {
    setView(v);
    setMobileNav(false);
    setSelectedId(null);
  }, []);

  const openAdd = useCallback((preset: AddPreset = {}) => setMenu({ open: true, preset }), []);
  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);
  const openForm = useCallback((kind: Kind, preset: AddPreset = {}) => setForm({ open: true, kind, preset }), []);
  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), []);
  const openAppearance = useCallback(() => { setMobileNav(false); setAppearance(true); }, []);

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
        if (appearance) setAppearance(false);
        else if (form.open) closeForm();
        else if (menu.open) closeMenu();
        else if (mobileNav) setMobileNav(false);
        else setSelectedId(null);
        return;
      }
      if (typing || menu.open || form.open || appearance) return;
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
      else if (k === "d" && e.shiftKey) toggleMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.open, form.open, appearance, mobileNav, openAdd, closeMenu, closeForm, navigate, toggleCollapsed, toggleMode]);

  if (loadError && !ready) return <LoadErrorScreen message={loadError} onRetry={reload} />;
  if (!ready) return <LoadingScreen />;

  const api: AppApi = {
    ownerName, tasks, today, now, filter, setFilter, selectedId, recent, toggle, toggleSub, update, remove, reorder,
    openTask: setSelectedId, openAdd, openForm, navigate, openAppearance,
    categoryNames: (ctx) => categoryNames(categories, ctx),
    allCategoryNames: () => allCategoryNames(categories),
    note: { text: note.text, set: note.setText, ready: note.ready },
  };

  let content: React.ReactNode;
  switch (view) {
    case "hoje": content = <HomeView />; break;
    case "semana": content = <WeekView />; break;
    case "calendario": content = <CalendarView />; break;
    default: content = <TasksView key={view} mode={view} />;
  }

  return (
    <AppCtx.Provider value={api}>
      <div className="min-h-screen">
        <aside className={cn("fixed inset-y-0 left-0 z-20 hidden bg-sidebar transition-[width] duration-200 ease-out lg:block", collapsed ? "w-14" : "w-52 lg:w-[15.5rem] xl:w-[16rem] 2xl:w-[14.75rem]")}>
          <Sidebar view={view} collapsed={collapsed} onNavigate={navigate} onToggleCollapsed={toggleCollapsed} onOpenAppearance={openAppearance} />
        </aside>

        <div className="sticky top-0 z-20 flex items-center justify-between bg-background/85 px-3 py-2 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNav(true)} aria-label="Abrir menu" aria-expanded={mobileNav}><Menu className="h-[1.125rem] w-[1.125rem]" /></Button>
          <Wordmark className="h-[1.375rem] w-auto text-foreground" />
          <span className="w-10" />
        </div>

        {/* Drawer do celular: sempre montado, para animar a entrada e a saída */}
        <div className={cn("fixed inset-0 z-40 lg:hidden", !mobileNav && "pointer-events-none")} inert={!mobileNav}>
          <div className={cn("absolute inset-0 bg-foreground/25 transition-opacity duration-200", mobileNav ? "opacity-100" : "opacity-0")} onClick={() => setMobileNav(false)} />
          <aside
            aria-label="Menu"
            className={cn(
              "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)]",
              mobileNav ? "translate-x-0 shadow-pop" : "-translate-x-full",
            )}
          >
            <Sidebar view={view} collapsed={false} touch onNavigate={navigate} onToggleCollapsed={toggleCollapsed} onOpenAppearance={openAppearance} />
          </aside>
        </div>

        <main className={cn("transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-14" : "lg:pl-[15.5rem] xl:pl-[16rem] 2xl:pl-[14.75rem]")}>{content}</main>

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
          defaultContext={menu.preset.context ?? (filter === "pessoal" || view === "pessoal" ? "pessoal" : "trabalho")}
          onClose={closeMenu}
          onCreate={create}
          onToggleSidebar={toggleCollapsed}
        />
        <TaskForm open={form.open} kind={form.kind} preset={form.preset} today={today} now={now} onClose={closeForm} onSubmit={create} />
        <AppearanceSheet open={appearance} onClose={() => setAppearance(false)} />
        <SyncBar saving={saving} />
        <Toast toast={toast} onDismiss={dismiss} />
      </div>
    </AppCtx.Provider>
  );
}
