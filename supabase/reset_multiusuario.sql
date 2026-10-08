-- ============================================================================
-- ⛔ NÃO RODE ESTE ARQUIVO NO SEU PROJETO ATUAL.
-- Ele é da época do esquema antigo e APAGA tabelas (inclusive `profiles`, que agora guarda o nome de cada conta)
-- e todos os dados delas. Está aqui só como histórico. O esquema multiusuário atual está em supabase/migrations.
-- ============================================================================

-- ============================================================================
-- gabi · LIMPEZA do esquema antigo (versão com login e vários usuários)
--
-- Só rode este arquivo se você JÁ executou as migrations antigas
-- (20260106000000_init_schema.sql e 20260106000100_rls_policies.sql) no seu projeto.
-- Ele APAGA as tabelas antigas e todos os dados delas. Se o projeto é novo, ignore.
--
-- Depois rode supabase/migrations/20260107000000_single_user.sql.
-- ============================================================================

drop trigger if exists on_auth_user_created       on auth.users;
drop trigger if exists on_auth_user_email_changed on auth.users;

drop table if exists
  public.activity_log, public.recurrences, public.subtasks, public.notes,
  public.events, public.tasks, public.categories, public.user_preferences, public.profiles
  cascade;

drop function if exists public.handle_new_user();
drop function if exists public.handle_user_email_change();
drop function if exists public.seed_default_categories(uuid);
drop function if exists public.ensure_default_categories();
drop function if exists public.cleanup_recurrence();
drop function if exists public.log_activity();
drop function if exists public.set_updated_at();
