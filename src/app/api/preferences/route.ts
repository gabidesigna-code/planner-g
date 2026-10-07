import { json, readJson, route } from "@/lib/server/api";
import { getPreferences, savePreferences, type ThemeMode } from "@/lib/server/agenda-db";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

const MODES = ["light", "dark", "system"];

/** Paleta e modo (claro/escuro/sistema), compartilhados entre PC e celular. */
export const GET = route(async () => getPreferences());

export const PUT = route(async (request) => {
  const body = (await readJson(request)) as { themeMode?: unknown; palette?: unknown };
  const patch: { themeMode?: ThemeMode; palette?: string } = {};
  if (body.themeMode !== undefined) {
    if (typeof body.themeMode !== "string" || !MODES.includes(body.themeMode)) throw new ValidationError("modo inválido");
    patch.themeMode = body.themeMode as ThemeMode;
  }
  if (body.palette !== undefined) {
    if (typeof body.palette !== "string" || !/^[a-z0-9-]{1,64}$/.test(body.palette)) throw new ValidationError("paleta inválida");
    patch.palette = body.palette;
  }
  if (!patch.themeMode && !patch.palette) throw new ValidationError("nada para salvar");
  await savePreferences(patch);
  return json({ ok: true });
});
