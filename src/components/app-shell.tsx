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
import { AiPanel } from "@/features/ai/ai-panel";
import { HomeView } from "@/features/home/home-view";
import { WeekView } from "@/features/week/week-view";
import { CalendarView } from "@/features/calendar/calendar-view";
import { TasksView } from "@/features/tasks/tasks-view";
import { OriView } from "@/features/ori/ori-view";
import { AppearanceSheet } from "@/features/appearance/appearance-sheet";
import { Onboarding } from "@/features/profile/onboarding";
import { ProfileView } from "@/features/profile/profile-view";
import { useRealtime } from "@/hooks/use-realtime";
import { usePush } from "@/hooks/use-push";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { api as apiClient } from "@/services/api-client";
import { MODE_KEY, PALETTE_KEY } from "@/theme/css";
import { ConfirmDialog } from "./confirm-dialog";
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

const GO: Record<string, ViewId> = { h: "hoje", s: "semana", c: "calendario", t: "tarefas", o: "ori", w: "trabalho", p: "pessoal", d: "concluidos", v: "voce" };

export function AppShell() {
  const { toast, notify, notifyError, dismiss } = useToast();
  const { tasks, categories, note: serverNote, ownerName, setOwnerName, account, ready, loadError, reload, refresh, saving, recent, toggle, toggleSub, update, remove, create, reorder } =
    useTasks({ repo: httpAgendaRepository, notify, notifyError });
  const note = useQuickNote({ serverNote, ready, notifyError });
  const push = usePush({ notify, enabled: ready && !!account, hasReminders: tasks.some((t) => t.reminderMinutes !== undefined && t.status !== "concluido") });
  const [view, setView] = useState<ViewId>("hoje");
  const [filter, setFilter] = useState<ContextFilter>("tudo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState<{ open: boolean; preset: AddPreset }>({ open: false, preset: {} });
  const [form, setForm] = useState<{ open: boolean; kind: Kind; preset: AddPreset }>({ open: false, kind: "tarefa", preset: {} });
  const [appearance, setAppearance] = useState(false);
  const [ai, setAi] = useState({ open: false, text: "" });
  const [deleting, setDeleting] = useState<string | null>(null);
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
  const openAi = useCallback((text = "") => setAi({ open: true, text }), []);
  const closeAi = useCallback(() => setAi((a) => ({ ...a, open: false })), []);
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
        if (deleting) return; // o diálogo fecha o próprio Esc
        if (ai.open) closeAi();
        else if (appearance) setAppearance(false);
        else if (form.open) closeForm();
        else if (menu.open) closeMenu();
        else if (mobileNav) setMobileNav(false);
        else setSelectedId(null);
        return;
      }
      if (typing || menu.open || form.open || appearance || ai.open || deleting) return;
      const k = e.key.toLowerCase();
      if (gPending.current) {
        gPending.current = false;
        if (GO[k]) { e.preventDefault(); navigate(GO[k]); }
        return;
      }
      if (k === "g") { gPending.current = true; window.setTimeout(() => (gPending.current = false), 900); }
      else if (k === "n" || k === "c" || k === "/") { e.preventDefault(); openAdd(); }
      else if (k === "i") { e.preventDefault(); openAi(); }
      else if (k === "[") toggleCollapsed();
      else if (k === "1") setFilter("tudo");
      else if (k === "2") setFilter("trabalho");
      else if (k === "3") setFilter("pessoal");
      else if (k === "d" && e.shiftKey) toggleMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.open, form.open, appearance, ai.open, deleting, mobileNav, openAi, closeAi, openAdd, closeMenu, closeForm, navigate, toggleCollapsed, toggleMode]);

  // Realtime: outro aparelho mexeu na agenda desta conta -> relê (a releitura a cada 15 s continua como reforço)
  useRealtime(account ? `agenda:${account.userId}` : null, account ? [
    { table: "tasks", filter: `user_id=eq.${account.userId}` },
    { table: "events", filter: `user_id=eq.${account.userId}` },
    { table: "subtasks", filter: `user_id=eq.${account.userId}` },
    { table: "categories", filter: `user_id=eq.${account.userId}` },
    { table: "profiles", filter: `id=eq.${account.userId}` },
  ] : [], () => void refresh());

  if (loadError && !ready) return <LoadErrorScreen message={loadError} onRetry={reload} />;
  if (!ready || !account) return <LoadingScreen />;

  const toggleImportant = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (t) update(id, { important: !t.important });
  };
  const deletingTask = deleting ? tasks.find((t) => t.id === deleting) : undefined;

  const saveDisplayName = async (name: string) => {
    const before = ownerName;
    setOwnerName(name); // aparece na hora
    try {
      await apiClient.savePreferences({ displayName: name });
    } catch (e) {
      setOwnerName(before);
      throw e;
    }
  };
  const signOut = async () => {
    try {
      await push.releaseDevice(); // este aparelho para de receber os avisos desta conta
      await supabaseBrowser().auth.signOut();
    } finally {
      // nada da conta fica para a próxima pessoa que usar este aparelho
      for (const k of [PALETTE_KEY, MODE_KEY, "ora-greeting-v1", "ori-conversa-atual"]) storage.remove(k);
      window.location.assign("/login");
    }
  };

  // primeiro acesso desta conta: a ori pergunta como chamar a pessoa (o nome vai para o perfil, no banco)
  if (!ownerName.trim()) return <Onboarding email={account.email} onSave={saveDisplayName} onSignOut={() => void signOut()} />;

  const api: AppApi = {
    ownerName, account, saveDisplayName, signOut, push, tasks, today, now, filter, setFilter, selectedId, recent, toggle, toggleSub, update, remove, reorder,
    toggleImportant, confirmRemove: setDeleting,
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
    case "ori": content = <OriView onCreate={create} />; break;
    case "voce": content = <ProfileView />; break;
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

        {/* Botão flutuante: adicionar ao alcance do polegar (só no celular; na tela da ori o campo de mensagem ocupa esse lugar) */}
        {view !== "ori" && <button
          onClick={() => openAdd()}
          aria-label="Adicionar"
          className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-btn transition-transform active:scale-95 lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <Plus className="h-6 w-6" strokeWidth={1.8} />
        </button>}

        <SidePanel />
        <CommandMenu
          open={menu.open}
          preset={menu.preset}
          defaultContext={menu.preset.context ?? (filter === "pessoal" || view === "pessoal" ? "pessoal" : "trabalho")}
          onClose={closeMenu}
          onCreate={create}
          onToggleSidebar={toggleCollapsed}
          onOpenAi={openAi}
        />
        <AiPanel open={ai.open} initialText={ai.text} onClose={closeAi} onCreate={create} />
        <TaskForm open={form.open} kind={form.kind} preset={form.preset} today={today} now={now} onClose={closeForm} onSubmit={create} />
        <AppearanceSheet open={appearance} onClose={() => setAppearance(false)} />
        <ConfirmDialog
          open={!!deletingTask}
          title={deletingTask ? `Excluir “${deletingTask.title}”?` : ""}
          body="Você pode desfazer por alguns segundos."
          confirmLabel="Excluir"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            if (deletingTask) {
              if (selectedId === deletingTask.id) setSelectedId(null);
              remove(deletingTask.id);
            }
            setDeleting(null);
          }}
        />
        {push.dialogs}
        <SyncBar saving={saving} />
        <Toast toast={toast} onDismiss={dismiss} />
      </div>
    </AppCtx.Provider>
  );
}
