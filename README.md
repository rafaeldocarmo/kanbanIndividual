# Kanban Individual

Aplicação web simples e rápida para gerenciamento de atividades operacionais individuais.

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

- Criar, editar, duplicar, excluir e visualizar atividades
- Campos: nome, descrição, data, jornada, responsável, status, prioridade
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
- **Queries** (`/queries`): salvar queries de banco com título e copiar com um clique — CRUD com optimistic UI

## Arquitetura

### Modelagem

```
stages     (id, name, color, position)          ← etapas configuráveis
journeys   (id, name, color)
assignees  (id, name, initials, color)
activities (id, name, description, due_date,
            stage_id, journey_id, assignee_id,
            priority, position numeric,
            created_at, updated_at)

notes        (id, title?, content, created_at, updated_at)
reminders    (id, content, due_date?, done, created_at, updated_at)
links        (id, title, url, category?, created_at, updated_at)
saved_queries(id, title, query, created_at, updated_at)
```

- `stages` em tabela própria → novas etapas sem migration
- `activities.position` usa **fractional indexing** (numeric) — reordenar sem reescrever vizinhos. Inserções entre A e B usam `(posA + posB) / 2`.
- `journey` e `assignee` em tabelas (não enum) → editáveis pelo usuário no futuro

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
6. **Sem auth** nesta versão (escopo individual); schema preparado para receber `user_id` futuramente.

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
