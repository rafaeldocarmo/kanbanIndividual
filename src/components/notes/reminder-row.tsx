"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import type { Reminder } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { cn, formatShortDate } from "@/lib/utils";
import {
  deleteReminder,
  toggleReminder,
  updateReminder,
} from "@/app/actions/notes";
import { useNotesContext } from "@/components/notes/notes-shell";

export function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { mutate } = useNotesContext();
  const [editing, setEditing] = React.useState(false);
  const [content, setContent] = React.useState(reminder.content);
  const [dueDate, setDueDate] = React.useState(reminder.dueDate ?? "");

  const toggle = () => {
    const done = !reminder.done;
    mutate(
      {
        kind: "reminder",
        op: "upsert",
        reminder: { ...reminder, done, updatedAt: new Date() },
      },
      () => toggleReminder(reminder.id, done),
    );
  };

  const remove = () => {
    mutate({ kind: "reminder", op: "delete", id: reminder.id }, () =>
      deleteReminder(reminder.id),
    );
  };

  const startEdit = () => {
    setContent(reminder.content);
    setDueDate(reminder.dueDate ?? "");
    setEditing(true);
  };

  const save = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    const due = dueDate || null;
    setEditing(false);
    mutate(
      {
        kind: "reminder",
        op: "upsert",
        reminder: {
          ...reminder,
          content: trimmed,
          dueDate: due,
          updatedAt: new Date(),
        },
      },
      () =>
        updateReminder({
          id: reminder.id,
          content: trimmed,
          dueDate: due,
          done: reminder.done,
        }),
    );
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <Input
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 flex-1 text-sm"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-8 w-[130px] text-xs"
          aria-label="Data"
        />
        <button
          type="button"
          onClick={save}
          aria-label="Salvar lembrete"
          className="rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--color-muted)]">
      <button
        type="button"
        onClick={toggle}
        role="checkbox"
        aria-checked={reminder.done}
        aria-label={reminder.done ? "Marcar como pendente" : "Concluir"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
          reminder.done
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            : "border-[var(--color-ring)] hover:border-[var(--color-primary)]",
        )}
      >
        {reminder.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={startEdit}
        className={cn(
          "flex-1 truncate text-left text-sm transition",
          reminder.done
            ? "text-[var(--color-muted-foreground)] line-through"
            : "text-[var(--color-foreground)]",
        )}
        title={reminder.content}
      >
        {reminder.content}
      </button>

      {reminder.dueDate && (
        <span className="shrink-0 text-[11px] uppercase tabular-nums text-[var(--color-muted-foreground)]">
          {formatShortDate(reminder.dueDate)}
        </span>
      )}

      <button
        type="button"
        onClick={remove}
        aria-label="Excluir lembrete"
        className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition hover:text-[var(--color-danger)] group-hover:opacity-100 focus:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
