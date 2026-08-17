"use client";

import * as React from "react";
import { toast } from "sonner";
import { Target, Plus } from "lucide-react";
import type { BoardItemView } from "@/db/queries";
import type { BoardStatus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { BoardCard } from "@/components/board/board-card";
import { BoardDialog } from "@/components/board/board-dialog";

export type BoardItemData = BoardItemView;

export type Mutation =
  | { op: "upsert"; item: BoardItemData }
  | { op: "delete"; id: string }
  | { op: "checkin"; itemId: string; day: string; checked: boolean };

const time = (d: Date) => new Date(d).getTime();

function sortItems(rows: BoardItemData[]) {
  return [...rows].sort((a, b) => time(a.createdAt) - time(b.createdAt));
}

function reducer(state: BoardItemData[], action: Mutation): BoardItemData[] {
  switch (action.op) {
    case "delete":
      return state.filter((i) => i.id !== action.id);
    case "upsert": {
      const idx = state.findIndex((i) => i.id === action.item.id);
      const next =
        idx === -1
          ? [...state, action.item]
          : state.map((i) => (i.id === action.item.id ? action.item : i));
      return sortItems(next);
    }
    case "checkin":
      return state.map((i) => {
        if (i.id !== action.itemId) return i;
        const set = new Set(i.checkins);
        if (action.checked) set.add(action.day);
        else set.delete(action.day);
        return { ...i, checkins: [...set] };
      });
  }
}

type BoardCtx = {
  today: string;
  mutate: (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => void;
};

const BoardContext = React.createContext<BoardCtx | null>(null);

export function useBoardContext() {
  const ctx = React.useContext(BoardContext);
  if (!ctx) throw new Error("BoardContext required");
  return ctx;
}

type Props = { data: BoardItemData[]; today: string };

export function BoardShell({ data, today }: Props) {
  const [optimistic, applyOptimistic] = React.useOptimistic(data, reducer);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const everOpenedRef = React.useRef(false);
  if (dialogOpen) everOpenedRef.current = true;

  const mutate = React.useCallback<BoardCtx["mutate"]>(
    (action, server) => {
      React.startTransition(async () => {
        applyOptimistic(action);
        try {
          const r = await server();
          if (!r.ok) toast.error(r.error ?? "Falha ao salvar");
        } catch {
          toast.error("Falha de sincronização");
        }
      });
    },
    [applyOptimistic],
  );

  const ctxValue = React.useMemo<BoardCtx>(
    () => ({ today, mutate }),
    [today, mutate],
  );

  const openCreate = () => {
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = React.useCallback((item: BoardItemData) => {
    setEditingId(item.id);
    setDialogOpen(true);
  }, []);

  const editing = editingId
    ? optimistic.find((i) => i.id === editingId) ?? null
    : null;

  return (
    <BoardContext.Provider value={ctxValue}>
      <div className="min-h-full px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-[1100px]">
          <header className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--color-primary)] px-1.5 text-xs font-semibold text-[var(--color-primary-foreground)]">
                  {optimistic.length}
                </span>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <Target className="h-6 w-6 text-[var(--color-muted-foreground)]" />
                  Foco do dia
                </h1>
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Atividades para conferir todo dia — últimos 7 dias e sequência
                em destaque.
              </p>
            </div>
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </header>

          {optimistic.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
              Nenhuma atividade no mural. Clique em “Nova” para começar.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {optimistic.map((item) => (
                <BoardCard key={item.id} item={item} onEdit={openEdit} />
              ))}
            </div>
          )}
        </div>
      </div>

      {everOpenedRef.current && (
        <BoardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editing}
        />
      )}
    </BoardContext.Provider>
  );
}

export type { BoardStatus };
