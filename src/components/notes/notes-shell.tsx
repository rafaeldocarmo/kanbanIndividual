"use client";

import * as React from "react";
import { toast } from "sonner";
import { StickyNote, Bell, Link2 } from "lucide-react";
import type { LinkItem, Note, Reminder } from "@/db/schema";
import { NoteComposer } from "@/components/notes/note-composer";
import { NoteCard } from "@/components/notes/note-card";
import { ReminderRow } from "@/components/notes/reminder-row";
import { LinkRow } from "@/components/notes/link-row";

export type NotesBootstrap = {
  notes: Note[];
  reminders: Reminder[];
  links: LinkItem[];
};

export type Mutation =
  | { kind: "note"; op: "upsert"; note: Note }
  | { kind: "note"; op: "delete"; id: string }
  | { kind: "reminder"; op: "upsert"; reminder: Reminder }
  | { kind: "reminder"; op: "delete"; id: string }
  | { kind: "link"; op: "upsert"; link: LinkItem }
  | { kind: "link"; op: "delete"; id: string };

const time = (d: Date) => new Date(d).getTime();

function sortNotes(rows: Note[]) {
  return [...rows].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

function sortReminders(rows: Reminder[]) {
  return [...rows].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return time(a.createdAt) - time(b.createdAt);
  });
}

function sortLinks(rows: LinkItem[]) {
  return [...rows].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

function upsert<T extends { id: string }>(rows: T[], row: T): T[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  const next = rows.slice();
  next[idx] = row;
  return next;
}

function reducer(state: NotesBootstrap, action: Mutation): NotesBootstrap {
  switch (action.kind) {
    case "note":
      return {
        ...state,
        notes: sortNotes(
          action.op === "delete"
            ? state.notes.filter((n) => n.id !== action.id)
            : upsert(state.notes, action.note),
        ),
      };
    case "reminder":
      return {
        ...state,
        reminders: sortReminders(
          action.op === "delete"
            ? state.reminders.filter((r) => r.id !== action.id)
            : upsert(state.reminders, action.reminder),
        ),
      };
    case "link":
      return {
        ...state,
        links: sortLinks(
          action.op === "delete"
            ? state.links.filter((l) => l.id !== action.id)
            : upsert(state.links, action.link),
        ),
      };
  }
}

type NotesCtx = {
  mutate: (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => void;
};

const NotesContext = React.createContext<NotesCtx | null>(null);

export function useNotesContext() {
  const ctx = React.useContext(NotesContext);
  if (!ctx) throw new Error("NotesContext required");
  return ctx;
}

function SectionLabel({
  icon,
  children,
  count,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
      {icon}
      <span>{children}</span>
      <span className="font-normal opacity-70">{count}</span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
      {children}
    </p>
  );
}

export function NotesShell({ data }: { data: NotesBootstrap }) {
  const [optimistic, applyOptimistic] = React.useOptimistic(data, reducer);

  const mutate = React.useCallback<NotesCtx["mutate"]>(
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

  const ctxValue = React.useMemo<NotesCtx>(() => ({ mutate }), [mutate]);

  return (
    <NotesContext.Provider value={ctxValue}>
      <div className="min-h-full bg-[var(--color-canvas)] px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-[1200px]">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Notas &amp; Lembretes
            </h1>
          </header>

          <NoteComposer />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
            {/* Notas */}
            <section>
              <SectionLabel
                icon={<StickyNote className="h-3.5 w-3.5" />}
                count={optimistic.notes.length}
              >
                Anotações
              </SectionLabel>
              {optimistic.notes.length === 0 ? (
                <EmptyHint>Nenhuma anotação ainda.</EmptyHint>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {optimistic.notes.map((n) => (
                    <NoteCard key={n.id} note={n} />
                  ))}
                </div>
              )}
            </section>

            {/* Lembretes + Links */}
            <div className="flex flex-col gap-6">
              <section>
                <SectionLabel
                  icon={<Bell className="h-3.5 w-3.5" />}
                  count={optimistic.reminders.length}
                >
                  Lembretes
                </SectionLabel>
                {optimistic.reminders.length === 0 ? (
                  <EmptyHint>Nenhum lembrete.</EmptyHint>
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                    {optimistic.reminders.map((r) => (
                      <ReminderRow key={r.id} reminder={r} />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionLabel
                  icon={<Link2 className="h-3.5 w-3.5" />}
                  count={optimistic.links.length}
                >
                  Links
                </SectionLabel>
                {optimistic.links.length === 0 ? (
                  <EmptyHint>Nenhum link salvo.</EmptyHint>
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
                    {optimistic.links.map((l) => (
                      <LinkRow key={l.id} link={l} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </NotesContext.Provider>
  );
}
