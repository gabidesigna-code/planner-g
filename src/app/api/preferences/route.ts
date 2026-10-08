import { authed, json, readJson } from "@/lib/server/api";
import { getPreferences, savePreferences, type ThemeMode } from "@/lib/server/agenda-db";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

const MODES = ["light", "dark", "system"];

/** Paleta, modo (claro/escuro/sistema) e o nome que a ori usa: da conta logada, iguais em todos os aparelhos dela. */
export const GET = authed(async (_request, { db, userId }) => getPreferences(db, userId));

export const PUT = authed(async (request, { db, userId }) => {
  const body = (await readJson(request)) as { themeMode?: unknown; palette?: unknown; displayName?: unknown };
  const patch: { themeMode?: ThemeMode; palette?: string; displayName?: string } = {};
  if (body.themeMode !== undefined) {
    if (typeof body.themeMode !== "string" || !MODES.includes(body.themeMode)) throw new ValidationError("modo inválido");
    patch.themeMode = body.themeMode as ThemeMode;
  }
  if (body.palette !== undefined) {
    if (typeof body.palette !== "string" || !/^[a-z0-9-]{1,64}$/.test(body.palette)) throw new ValidationError("paleta inválida");
    patch.palette = body.palette;
  }
  if (body.displayName !== undefined) {
    // como a ori chama a pessoa (aparece nas saudações); vem do onboarding e da tela Você
    if (typeof body.displayName !== "string") throw new ValidationError("nome inválido");
    const name = body.displayName.replace(/\s+/g, " ").trim();
    if (name.length > 40) throw new ValidationError("O nome pode ter no máximo 40 letras.");
    patch.displayName = name;
  }
  if (!patch.themeMode && !patch.palette && patch.displayName === undefined) throw new ValidationError("nada para salvar");
  await savePreferences(db, userId, patch);
  return json({ ok: true });
});
