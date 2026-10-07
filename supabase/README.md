# gabi · banco de dados (Supabase) para uso individual

O app é de uma pessoa só. Não há login, cadastro nem usuários. O Supabase serve de **banco na nuvem**
para o PC e o celular verem os mesmos dados.

```
navegador ──► rotas /api do Next.js ──(chave privada, só no servidor)──► Supabase
```

- O navegador **nunca** fala com o Supabase e não tem nenhuma chave dele.
- A chave privada (`service_role`) existe só no servidor do Next.js.
- No banco, o RLS está ligado **sem nenhuma policy**: a chave pública (anon) do projeto não lê nem grava nada.

## Passo a passo mínimo

### 1. Criar o projeto
Em <https://supabase.com/dashboard>, crie um projeto (região mais próxima, por exemplo **South America (São Paulo)**).

### 2. Criar as tabelas
**SQL Editor → New query**, cole **todo** o conteúdo de `supabase/migrations/20260107000000_single_user.sql` e clique em **Run**.

> Se você já tinha rodado as migrations antigas (a versão com login), rode antes `supabase/reset_multiusuario.sql`.
> Ele apaga as tabelas antigas e os dados delas. Em projeto novo, ignore.

Conferir (recomendado): cole `supabase/tests/access_control.sql` e execute. O último resultado deve ser
`OK: acesso restrito à service_role`. Ele desfaz tudo no final. No seu computador, sem Supabase, o mesmo
teste roda com `npm run test:db`.

### 3. Pegar as chaves
**Project Settings → API** (ou **API Keys**):

| Painel | Variável |
|---|---|
| Project URL | `SUPABASE_URL` |
| `service_role` key (ou **secret** key, nas chaves novas) | `SUPABASE_SERVICE_ROLE_KEY` |

### 4. Rodar no computador
Copie `.env.example` para `.env.local` (na raiz), preencha as duas variáveis e rode `npm run dev`.
O `.env.local` já é ignorado pelo Git.

### 5. Publicar na Vercel
**Project Settings → Environment Variables**: cadastre as **mesmas duas** variáveis (Production e Preview).
Não use o prefixo `NEXT_PUBLIC_` e não marque nada como "exposta ao navegador". Faça um novo deploy
sempre que mudar uma variável.

Pronto: abra a URL no PC e no celular. Os dois mostram os mesmos dados.

## Como a sincronização funciona
- Toda alteração vai para o banco na hora (a tela atualiza primeiro e grava em segundo plano).
- Cada aparelho reconfere o banco **ao voltar para a aba/app**, ao reconectar e **a cada 15 segundos**.
- Se você está editando algo, a atualização não pisa no que está na sua tela.
- Se o mesmo item for alterado nos dois aparelhos ao mesmo tempo, vale a última gravação.
- Sincronizam: tarefas, compromissos, lembretes, eventos, subtarefas, recorrências, categorias, nota rápida,
  paleta, modo claro/escuro e nome da saudação.

## O que cada tabela guarda
| Tabela | Conteúdo |
|---|---|
| `tasks` | tarefas e lembretes |
| `events` | compromissos e eventos |
| `subtasks` | subtarefas de uma tarefa ou de um evento |
| `recurrences` | regra de repetição de uma tarefa ou evento |
| `categories` | categorias (as 11 padrão já vêm criadas) |
| `notes` | nota rápida da Home |
| `preferences` | uma única linha: paleta, modo, nome da saudação, fuso, início da semana |

## Segurança: o que protege e o que NÃO protege (ainda)
Protege:
- A chave privada nunca vai para o navegador (nem a URL do Supabase).
- A chave pública do projeto não acessa nada (RLS sem policies).
- As rotas `/api` validam tudo que recebem e recusam escrita vinda de outros sites.

**Não protege:** como não há PIN nem senha, **qualquer pessoa que souber a URL do app consegue ler e alterar a
agenda**. Mantenha a URL privada e não a compartilhe. A proteção por PIN/senha única foi deixada pronta para
entrar depois, em **um único lugar**: `src/lib/server/access.ts` (todas as rotas passam por ele).

## Futuro
- Novas migrations entram como novos arquivos em `supabase/migrations`, com nome em ordem crescente.
- Criar/editar categorias já é possível no banco; só falta a tela.
