"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Database, ArrowLeft, Search } from "lucide-react";
import type { SavedQuery } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { QueryComposer } from "@/components/queries/query-composer";
import { QueryRow } from "@/components/queries/query-row";
import { QueryDialog } from "@/components/queries/query-dialog";

export type Mutation =
  | { op: "upsert"; query: SavedQuery }
  | { op: "delete"; id: string };

const time = (d: Date) => new Date(d).getTime();

function sortQueries(rows: SavedQuery[]) {
  return [...rows].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

function reducer(state: SavedQuery[], action: Mutation): SavedQuery[] {
  if (action.op === "delete") {
    return state.filter((q) => q.id !== action.id);
  }
  const idx = state.findIndex((q) => q.id === action.query.id);
  const next =
    idx === -1
      ? [action.query, ...state]
      : state.map((q) => (q.id === action.query.id ? action.query : q));
  return sortQueries(next);
}

type QueriesCtx = {
  mutate: (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => void;
};

const QueriesContext = React.createContext<QueriesCtx | null>(null);

export function useQueriesContext() {
  const ctx = React.useContext(QueriesContext);
  if (!ctx) throw new Error("QueriesContext required");
  return ctx;
}

export function QueriesShell({ data }: { data: SavedQuery[] }) {
  const [optimistic, applyOptimistic] = React.useOptimistic(data, reducer);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const everOpenedRef = React.useRef(false);
  if (dialogOpen) everOpenedRef.current = true;

  const mutate = React.useCallback<QueriesCtx["mutate"]>(
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

  const ctxValue = React.useMemo<QueriesCtx>(() => ({ mutate }), [mutate]);

  const openEdit = React.useCallback((item: SavedQuery) => {
    setEditingId(item.id);
    setDialogOpen(true);
  }, []);

  const editing = editingId
    ? optimistic.find((q) => q.id === editingId) ?? null
    : null;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optimistic;
    return optimistic.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.query.toLowerCase().includes(q),
    );
  }, [optimistic, search]);

  return (
    <QueriesContext.Provider value={ctxValue}>
      <div className="min-h-svh bg-[var(--color-canvas)] px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <header className="mb-6">
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kanban
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Database className="h-6 w-6 text-[var(--color-muted-foreground)]" />
              Queries
            </h1>
          </header>

          <QueryComposer />

          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <span>Salvas</span>
                <span className="font-normal opacity-70">{filtered.length}</span>
              </div>
              {optimistic.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por título ou conteúdo…"
                    className="h-9 pl-9"
                  />
                </div>
              )}
            </div>
            {optimistic.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                Nenhuma query salva ainda.
              </p>
            ) : filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                Nenhuma query encontrada para “{search.trim()}”.
              </p>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                {filtered.map((q) => (
                  <QueryRow key={q.id} item={q} onOpen={openEdit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {everOpenedRef.current && (
        <QueryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editing}
        />
      )}
    </QueriesContext.Provider>
  );
}
