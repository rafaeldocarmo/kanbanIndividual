# Kanban Individual

Aplicação web simples e rápida para gerenciamento de atividades operacionais de uma equipe pequena (Rafael, Ricardo, Sergio, Vinicius e "Outros"). Minimalista de propósito: sem sprints, pontos, horas, aprovações, papéis ou relatórios.

## Stack

- **Next.js 15** (App Router, Server Actions, React 19)
- **TypeScript** estrito
- **Neon PostgreSQL** + **Drizzle ORM** (driver HTTP serverless)
- **Tailwind CSS v4** + **Radix UI** (Dialog, Dropdown, Select)
- **@dnd-kit** para drag & drop acessível
- **react-hook-form + zod** para validação compartilhada client/server
- **nuqs** para estado de filtros/visão na URL
- **next-themes** (light/dark)
- **sonner** para notificações

## Como rodar

```bash
pnpm install
pnpm db:push      # cria tabelas no Neon a partir do schema
pnpm dev          # http://localhost:3000
```

> A `DATABASE_URL` já está em `.env.local`. Caso clone este repo, copie `.env.example` para `.env.local` e cole sua string do Neon.

## Funcionalidades

### Modo equipe

O responsável é o eixo da interface: as duas perguntas são "o que é meu?" e "onde travou?".

- **Você é** (topo): quem está usando o app. Sem login — é um cookie (`kb_me`) que define o filtro "Minhas" e assina as alterações
- **Um ou mais responsáveis** por atividade, todos com o mesmo peso: o item aparece no grupo/raia de cada um e conta na carga de cada um
- **Minhas / Da equipe** (barra de ferramentas): "Minhas" = você é um dos responsáveis **ou** o item está bloqueado esperando por você
- **Filtro de status** (barra de ferramentas): esconde as etapas que você não quer ver — some com os itens delas e com a coluna no Quadro. Útil ao agrupar por Jornada ou Responsável, onde os concluídos lotariam cada grupo. Fica na URL (`?hide=`)
- **Atribuir em 1 clique**: os avatares na linha/cartão abrem o menu da equipe — clicar no nome troca (handoff: fica só essa pessoa); **+** soma alguém, **✓** remove
- **Bloqueado por**: alguém da equipe ou um externo em texto livre (ex.: "Fornecedor (externo)"). Selo "bloq. <nome>" na linha e borda vermelha no cartão; pelo menu "…" da linha, pelo selo ou pelo detalhe do item
- **Faixa de carga**: itens em "Em Andamento" por pessoa, com mini-barra; âmbar acima de 3
- **Sem atualização há X dias**: "há Xd" em âmbar a partir de 5 dias e vermelho a partir de 10 (fora de Backlog e Concluído). Reordenar na mesma coluna não conta como atualização
- **Concluído nas últimas 24h**: grupo aberto na Lista (por status) com o que acabou de ser concluído ("concluído há 3 h"); o resto de "Concluído" segue recolhido. Nas raias, a coluna recolhida mostra só esses. Usa `completed_at`, carimbado ao entrar em "Concluído" e limpo ao sair
- **Raias por pessoa** no Quadro: arrastar na horizontal muda a etapa; na vertical, a pessoa da raia de origem sai e a de destino entra (vale também para a Lista agrupada por Responsável)
- **Comentários** no detalhe do item (autor, texto, data), assinados por quem está no "Você é"; cada um apaga só os próprios
- **Disciplina visual**: cor só por exceção — âmbar para itens parados e carga acima do limite, vermelho para bloqueio e parados há 10+ dias. Cada pessoa tem um matiz fixo em `assignees.hue` (mesma luminosidade/croma, OKLCH) usado **só** no avatar — entrar ou sair alguém da equipe não muda a cor de quem já estava. A prioridade é a exceção assumida: alta vermelha, média amarela, baixa azul

### Geral

- Criar, editar, duplicar, excluir e visualizar atividades
- Campos: nome, descrição, data, jornada, responsáveis, status, prioridade
- Etapas configuráveis em tabela (padrão: Backlog / Em Análise / Concluído)
- Visualizações **Lista** (agrupada) e **Quadro** (Kanban) — alternância sem recarregar
- Agrupar por **Status**, **Jornada** ou **Responsável**
- **Drag-and-drop** entre colunas no Quadro
- **Mover para…** rápido no menu de cada linha da Lista (também acessível por teclado)
- Busca instantânea (debounced, client-side)
- Filtros e visão persistem na URL (shareable)
- **Atalhos**: `N` nova atividade, `/` focar busca, `Esc` fechar modal
- Optimistic UI no DnD com rollback em falha
- **Notas & Lembretes** (`/notas`): espaço pessoal com notas, lembretes (data + concluído) e links — CRUD com optimistic UI, sem toasts de sucesso
- **Queries** (`/queries`): salvar queries de banco com título, copiar com um clique, buscar e **reordenar por drag-and-drop** (fractional indexing) — CRUD com optimistic UI

## Arquitetura

### Modelagem

```
stages     (id, name, color, position)          ← etapas configuráveis
journeys   (id, name, color)
assignees  (id, name, initials, color, hue?)   ← hue: matiz do avatar
activities (id, name, description, due_date,
            stage_id, journey_id,
            priority, position numeric,
            blocked_by?, completed_at?,
            created_at, updated_at, updated_by?)
activity_assignees (activity_id, assignee_id)   ← um ou mais responsáveis
activity_comments  (id, activity_id, author_id?, content, created_at)

notes        (id, title?, content, created_at, updated_at)
reminders    (id, content, due_date?, done, created_at, updated_at)
links        (id, title, url, category?, created_at, updated_at)
saved_queries(id, title, query, position, created_at, updated_at)
```

- `stages` em tabela própria → novas etapas sem migration
- `activities.position` usa **fractional indexing** (numeric) — reordenar sem reescrever vizinhos. Inserções entre A e B usam `(posA + posB) / 2`.
- `journey` e `assignee` em tabelas (não enum) → editáveis pelo usuário no futuro
- `activities.assignee_id` é legado (congelado desde a migração para `activity_assignees`); segue no schema como `@deprecated` só para poder desfazer

### Camadas

```
src/
  app/
    page.tsx               -- server: carrega tudo via Promise.all e passa para o shell
    notas/page.tsx         -- server: carrega notas/lembretes/links e passa para o NotesShell
    actions/
      activities.ts        -- create/update/delete/duplicate/move (com zod + revalidate)
      meta.ts              -- create stage/journey/assignee
      notes.ts             -- CRUD de notas, lembretes e links (zod + revalidate)
    layout.tsx, globals.css
  components/
    app-shell.tsx          -- estado client (busca/view/group/dialog)
    notes/                 -- NotesShell (useOptimistic), composer, cards e linhas
    toolbar.tsx            -- busca, agrupar, alternar visão, novo
    list-view.tsx          -- agrupamento dinâmico
    board-view.tsx         -- DnD com @dnd-kit
    activity/
      activity-dialog.tsx  -- form (react-hook-form + zod)
      activity-card.tsx    -- card sortable
      activity-row.tsx     -- linha com menu de ações
    ui/                    -- primitives (Button, Dialog, Select, Dropdown, Input, Badge)
  db/
    schema.ts              -- drizzle schema
    client.ts              -- neon-http drizzle client
    queries.ts             -- leituras tipadas
  lib/
    validators.ts          -- schemas zod compartilhados
    types.ts, utils.ts
```

### Decisões-chave

1. **Server Actions** em vez de API routes → menos código, type-safe, `revalidatePath` automático.
2. **Página única** com modal para criar/editar → "maior parte das ações sem troca de página".
3. **Busca client-side** com filtro instantâneo (sem hit no banco a cada tecla). Para escalas >1k itens, basta promover para uma query com índice GIN trigram em `activities.name` — schema já preparado.
4. **Fractional indexing** evita rewrites em massa ao reordenar — fundamental para DnD performante.
5. **Filtros/view na URL** via `nuqs` → estado compartilhável e persistente em refresh.
6. **Sem auth**: a identidade é um cookie escolhido em "Você é" (`src/lib/current-user.ts` valida contra a equipe). Serve para assinar, não para proteger.
7. **Migrações no banco atual**: não use `drizzle-kit push` — ele tem a coluna legada `activities.description`, fora do schema, que o push apagaria. Aplique SQL aditivo e idempotente (`add column if not exists`…) por script avulso em `scripts/`. Num banco novo, `pnpm db:push` funciona normalmente.

## Acessibilidade

- Primitives Radix (foco gerenciado, ARIA, navegação por teclado nativa)
- `KeyboardSensor` do dnd-kit para mover por teclado
- Botões com `aria-label`, foco visível, `focus-visible` global
- Contraste adequado em ambos os temas

## Próximos passos sugeridos

- CRUD de Stages/Journeys/Assignees na UI (server actions já existem em `meta.ts`)
- Visão "Jornada" (timeline) — extensão natural do `ListView` agrupado por jornada
- Filtros adicionais (responsável, jornada) na URL via `nuqs`
- Auth + multi-tenant (`user_id` em todas as tabelas)
- Histórico/auditoria via `activity_log` table
