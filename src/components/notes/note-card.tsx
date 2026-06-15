"use client";

import * as React from "react";
import { Pencil, X, Check } from "lucide-react";
import type { Note } from "@/db/schema";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/utils";
import { deleteNote, updateNote } from "@/app/actions/notes";
import { useNotesContext } from "@/components/notes/notes-shell";

export function NoteCard({ note }: { note: Note }) {
  const { mutate } = useNotesContext();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(note.title ?? "");
  const [content, setContent] = React.useState(note.content);

  const startEdit = () => {
    setTitle(note.title ?? "");
    setContent(note.content);
    setEditing(true);
  };

  const save = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const t = title.trim() || null;
    setEditing(false);
    mutate(
      {
        kind: "note",
        op: "upsert",
        note: { ...note, title: t, content: trimmed, updatedAt: new Date() },
      },
      () => updateNote({ id: note.id, title: t, content: trimmed }),
    );
  };

  const remove = () => {
    mutate({ kind: "note", op: "delete", id: note.id }, () =>
      deleteNote(note.id),
    );
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-ring)] bg-[var(--color-card)] p-3 shadow-sm">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="h-8 text-sm font-medium"
        />
        <Textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="min-h-[72px] text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={!content.trim()}>
            <Check className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm transition hover:shadow-md">
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={startEdit}
          aria-label="Editar nota"
          className="rounded p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label="Excluir nota"
          className="rounded p-1 text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-danger)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {note.title && (
        <h3 className="mb-1 pr-12 text-sm font-semibold leading-snug">
          {note.title}
        </h3>
      )}
      <p className="whitespace-pre-wrap break-words pr-6 text-sm leading-relaxed text-[var(--color-foreground)]/90">
        {note.content}
      </p>
      <time className="mt-3 text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {formatShortDate(note.createdAt)}
      </time>
    </div>
  );
}
