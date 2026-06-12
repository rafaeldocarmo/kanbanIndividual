"use client";

import * as React from "react";
import { Pencil, Trash2, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActivityView } from "@/lib/types";
import {
  addStatusUpdate,
  deleteStatusUpdate,
} from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityView | null;
  onEdit?: (a: ActivityView) => void;
};

export function ActivityStatusDialog({
  open,
  onOpenChange,
  activity,
  onEdit,
}: Props) {
  const { mutate } = useActivitiesContext();
  const [pending, setPending] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setPending("");
  }, [open, activity?.id]);

  if (!activity) return null;

  const handleAdd = () => {
    const content = pending.trim();
    if (!content) return;
    const tempId = `temp-${crypto.randomUUID()}`;
    const status = { id: tempId, content, createdAt: new Date() };
    mutate(
      { type: "addStatus", activityId: activity.id, status },
      () => addStatusUpdate({ activityId: activity.id, content }),
    );
    setPending("");
    inputRef.current?.focus();
  };

  const handleDelete = (statusId: string) => {
    mutate(
      { type: "removeStatus", activityId: activity.id, statusId },
      () => deleteStatusUpdate(statusId),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3">
        <DialogHeader className="pr-20">
          {activity.journeyName && (
            <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {activity.journeyName}
            </div>
          )}
          <DialogTitle className="break-words leading-tight">
            {activity.name}
          </DialogTitle>
        </DialogHeader>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(activity)}
            aria-label="Editar atividade"
            title="Editar"
            className="absolute right-12 top-4 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Novo status…"
            autoFocus
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!pending.trim()}
            size="icon"
            aria-label="Adicionar status"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {activity.statusUpdates.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              Sem status registrados ainda.
            </p>
          ) : (
            <ol className="grid gap-1">
              {activity.statusUpdates.map((s, idx) => (
                <li
                  key={s.id}
                  className="group flex items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                >
                  <time className="mt-0.5 w-20 shrink-0 text-[10px] uppercase tabular-nums leading-tight text-[var(--color-muted-foreground)]">
                    {format(new Date(s.createdAt), "dd MMM HH:mm", {
                      locale: ptBR,
                    })}
                  </time>
                  <div className="flex-1 text-sm leading-snug">
                    {s.content}
                    {idx === 0 && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                        atual
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="shrink-0 rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-accent)]"
                    aria-label="Remover status"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
