# ora · banco de dados (Supabase) e contas

O app é **multiusuário**: várias pessoas usam o mesmo link, cada uma com a própria conta, agenda, categorias,
preferências, nome na saudação e conversas com a ori. O Supabase guarda tudo e o **RLS** (segurança por linha)
impede, no próprio banco, que uma conta leia ou mexa nos dados de outra.

```
navegador ──(login, Realtime: só chave pública)──────────────► Supabase Auth / Realtime
navegador ──► rotas /api do Next.js ──(chave pública + sessão da pessoa)──► Supabase (RLS: user_id = auth.uid())
```

- O navegador usa o Supabase só para **entrar, sair, recuperar senha** e para o **Realtime**. Os dados passam pelas rotas `/api`.
- As rotas `/api` falam com o banco **como a pessoa logada** (chave pública `anon` + a sessão dela, em cookie). Por isso o RLS vale de verdade.
- **A chave `service_role` não é mais usada pelo app.** Pode (e deve) sair das variáveis da Vercel depois da migração.
- Nenhuma rota aceita `user_id` vindo do navegador: o dono de cada registro é sempre a conta da sessão.

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | URL do projeto (a mesma da antiga `SUPABASE_URL`, que também é aceita) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | chave **pública** (`anon` / *publishable*), em *Project Settings → API*. É pública por desenho: sozinha não acessa nada |
| `GEMINI_API_KEY` | Vercel + `.env.local` | a ori (continua só no servidor) |

Não existe mais `SUPABASE_SERVICE_ROLE_KEY` no app. (Só o `npm run test:live` a usa, localmente, para criar e apagar contas de teste.)

## Passo a passo: projeto NOVO
1. Crie o projeto no Supabase. No **SQL Editor**, rode, em ordem, todos os arquivos de `supabase/migrations/`.
2. **Authentication → URL Configuration**: *Site URL* = a URL do app (ex.: `https://useora.vercel.app`) e, em *Redirect URLs*, adicione
   `https://useora.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`.
3. Preencha as variáveis acima, rode `npm run dev` (ou publique na Vercel) e crie a sua conta na tela inicial.

## Passo a passo: você JÁ usa o app (dados existentes)  ⚠️ leia tudo antes
Nada é apagado em nenhuma fase. As fases são separadas de propósito.

**Fase 1 · estrutura** (pode rodar com o app antigo ainda no ar)
1. No **SQL Editor**, rode `migrations/20261008000000_important_and_display_name.sql` (se ainda não rodou) e depois `migrations/20261009000000_multiuser_schema.sql`.
   Seus dados continuam intactos, mas ficam **invisíveis para qualquer conta** (ainda não têm dono).

**Configuração (painel do Supabase e Vercel)**
2. **Project Settings → API**: copie a chave **anon / publishable**.
3. **Authentication → URL Configuration**: *Site URL* = `https://useora.vercel.app`; *Redirect URLs*: `https://useora.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`.
4. **Authentication → Sign In / Providers → Email**: a opção *Confirm email* pode ficar **ligada** (o app avisa "confirme o e-mail") ou **desligada** (a conta entra na hora). Em *Password* deixe o mínimo em 8.
5. **Vercel → Settings → Environment Variables**: crie `NEXT_PUBLIC_SUPABASE_URL` (mesmo valor da `SUPABASE_URL`) e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a chave do passo 2), em Production e Preview.
   **Não apague a `SUPABASE_SERVICE_ROLE_KEY` ainda** (ela é o seu caminho de volta, ver abaixo).
6. Publique o app novo (push/redeploy).

**Fase 2 · entregar seus dados à sua conta**
7. Abra o app, **Criar conta** com o seu e-mail (confirme o e-mail, se a opção estiver ligada) e responda à ori com o seu nome.
   ⚠️ **Não crie tarefas nesta conta antes do passo 8**: o script só entrega os dados antigos a uma conta vazia (é a trava contra misturar dados).
8. No **SQL Editor**, abra `supabase/manual/claim_legacy_data.sql` e rode em 3 execuções separadas:
   - **PASSO 1** (só consulta): mostra quantas linhas antigas existem e as contas;
   - **PASSO 2**: troque `COLOQUE-AQUI-O-E-MAIL-DA-SUA-CONTA` pelo seu e-mail e rode. É uma transação: entrega tudo ou nada;
   - **PASSO 3**: conferência. Tudo `0` em "sem dono" e os totais na sua conta.
9. Recarregue o app: suas tarefas, categorias, preferências (paleta e modo) e nota rápida estão lá.
   As **conversas antigas com a ori** ficavam só no navegador: a aba Ori oferece **Importar** em cada aparelho que as tiver.

**Fase 3 · restrições finais**
10. Quando tudo estiver conferido, rode `migrations/20261009000100_multiuser_constraints.sql`. Ela **se recusa a rodar** se sobrar qualquer linha sem dono.
    Depois dela, o app antigo não funciona mais (a tabela `preferences` mudou), então só rode quando não precisar mais voltar.
11. Agora pode apagar `SUPABASE_SERVICE_ROLE_KEY` da Vercel.

**Voltar atrás (antes da fase 3):** a fase 1 é aditiva. Para voltar ao app antigo basta publicar a versão anterior (ela usa a `SUPABASE_SERVICE_ROLE_KEY`, por isso a mantenha até a fase 3).

## O que acontece quando uma conta é apagada
As chaves estrangeiras usam `on delete cascade`: se você apagar um usuário em *Authentication → Users*, **todos os dados dele são apagados junto**
(perfil, preferências, categorias, tarefas, eventos, subtarefas, notas, recorrências, conversas e mensagens da ori) e **só os dele**.
O app não tem botão de excluir conta: isso só acontece por ação sua no painel. Faça backup antes de apagar qualquer usuário.

## Tabelas
| Tabela | Conteúdo | Dono |
|---|---|---|
| `profiles` | `display_name`: como a ori chama a pessoa | `id` = conta |
| `preferences` | modo claro/escuro, paleta, fuso, início da semana | `user_id` |
| `categories` | categorias (as 11 padrão são criadas **para cada conta nova**, por trigger) | `user_id` |
| `tasks` / `events` | tarefas e lembretes / compromissos e eventos (`important`) | `user_id` |
| `subtasks` / `recurrences` | subtarefas e regras de repetição (só ligadas a itens da mesma conta) | `user_id` |
| `notes` | nota rápida da Home | `user_id` |
| `ori_conversations` / `ori_messages` | conversas da ori e suas mensagens (com as propostas e o que foi decidido) | `user_id` |

## Segurança (RLS)
- RLS **ligado em todas as tabelas**; policies só para `authenticated`, com `user_id = auth.uid()` em SELECT, INSERT, UPDATE e DELETE
  (`with check` impede gravar com `user_id` alheio ou "doar" um registro). Subtarefas, recorrências e mensagens ainda exigem que o item pai seja da mesma conta.
- `anon` (a chave pública sem login) não lê nem grava nada.
- A `service_role` ignora o RLS por definição; por isso o app não a usa.
- O cadastro cria perfil, preferências e categorias por trigger (`handle_new_user`, `security definer`).

## Sincronização entre aparelhos
- Cada alteração vai para o banco na hora (a tela atualiza primeiro).
- **Realtime** (Supabase) avisa quando algo muda em outro aparelho da mesma conta (tarefas, eventos, subtarefas, categorias, perfil, conversas e mensagens da ori) e a tela relê.
- Como reforço, cada aparelho também relê ao voltar para a aba, ao reconectar e a cada 15 segundos. Se o Realtime falhar, a sincronia continua assim.

## Testes
| Comando | O que verifica |
|---|---|
| `npm run test:db` | Postgres local (PGlite): migrations, RLS, isolamento entre contas (ler/criar/editar/apagar), cascatas, trigger de cadastro e **toda a migração dos dados antigos** (fases 1→3) |
| `npm run test:live` | **No seu projeto** (ou no de teste): cria 2 contas descartáveis, tenta o acesso cruzado direto pela API do banco e as apaga no fim |
| `npm run fake:supabase` | Supabase de teste local (auth + REST sobre o mesmo RLS) para rodar o app sem projeto: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon npm run dev` |

## Futuro
- Login com Google: o `/auth/callback` já troca o código OAuth por sessão; falta ativar o provedor no painel e adicionar o botão.
- Novas migrations entram como novos arquivos em `supabase/migrations`, com nome em ordem crescente.
