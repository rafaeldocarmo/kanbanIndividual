"use client";

import * as React from "react";
import { Pencil, Trash2, ArrowUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
  addComment,
  addStatusUpdate,
  deleteComment,
  deleteStatusUpdate,
} from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";
import {
  AssigneePicker,
  PersonAvatar,
} from "@/components/team/assignee-picker";
import { BlockedByControl } from "@/components/team/blocked-by";
import { useTeam } from "@/components/team/team-provider";
import { staleness } from "@/lib/team";
import { cn } from "@/lib/utils";

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
  const { me, member } = useTeam();
  const [pending, setPending] = React.useState("");
  const [comment, setComment] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const commentsRef = React.useRef<HTMLOListElement>(null);

  React.useEffect(() => {
    if (open) {
      setPending("");
      setComment("");
    }
  }, [open, activity?.id]);

  // Conversa rolada até o fim: ao abrir e a cada comentário novo.
  const commentCount = activity?.comments.length ?? 0;
  React.useEffect(() => {
    const el = commentsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, commentCount]);

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

  const handleComment = () => {
    const content = comment.trim();
    if (!content || !me) return;
    mutate(
      {
        type: "addComment",
        activityId: activity.id,
        comment: {
          id: `temp-${crypto.randomUUID()}`,
          authorId: me.id,
          content,
          createdAt: new Date(),
        },
      },
      () => addComment({ activityId: activity.id, content }),
    );
    setComment("");
  };

  const handleDeleteComment = (commentId: string) => {
    mutate(
      { type: "removeComment", activityId: activity.id, commentId },
      () => deleteComment(commentId),
    );
  };

  const stale = staleness(activity, Date.now());
  const updatedBy = member(activity.updatedById)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg gap-3 overflow-y-auto">
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

        {/* Quem, onde, o que trava e quando mexeram por último. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <AssigneePicker activity={activity} size={22} />
            <span className="text-sm text-[var(--color-foreground)]">
              {activity.assigneeIds
                .map((id) => member(id)?.name)
                .filter(Boolean)
                .join(", ") || "Sem responsável"}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>{activity.stageName}</span>
          <span aria-hidden>·</span>
          <BlockedByControl activity={activity} placeholder />
          <span
            className={cn(
              "ml-auto",
              stale?.level === "warn" && "text-[var(--color-warning)]",
              stale?.level === "alert" && "text-[var(--color-danger)]",
            )}
            title={format(new Date(activity.updatedAt), "dd MMM yyyy HH:mm", {
              locale: ptBR,
            })}
          >
            atualizado{" "}
            {formatDistanceToNow(new Date(activity.updatedAt), {
              locale: ptBR,
              addSuffix: true,
            })}
            {updatedBy && ` por ${updatedBy}`}
          </span>
        </div>

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

        <div className="max-h-[30vh] overflow-y-auto">
          {activity.statusUpdates.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-[var(--color-muted-foreground)]">
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

        <section className="grid gap-2.5 border-t border-[var(--color-border)] pt-3">
          <h3 className="text-xs font-medium text-[var(--color-muted-foreground)]">
            Comentários
            {activity.comments.length > 0 && ` (${activity.comments.length})`}
          </h3>
          {activity.comments.length > 0 && (
            <ol
              ref={commentsRef}
              className="grid max-h-[30vh] gap-3 overflow-y-auto"
            >
              {activity.comments.map((c) => (
                <li key={c.id} className="group flex gap-2.5">
                  <PersonAvatar id={c.authorId} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 text-xs">
                      <span className="font-medium">
                        {member(c.authorId)?.name ?? "—"}
                      </span>
                      <time className="tabular-nums text-[var(--color-muted-foreground)]">
                        {format(new Date(c.createdAt), "dd MMM HH:mm", {
                          locale: ptBR,
                        })}
                      </time>
                      {c.authorId === me?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="ml-auto rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-accent)]"
                          aria-label="Apagar comentário"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-snug">
                      {c.content}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleComment();
                }
              }}
              disabled={!me}
              maxLength={2000}
              placeholder={
                me
                  ? `Comentar como ${me.name}…`
                  : "Escolha quem você é no topo para comentar"
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleComment}
              disabled={!me || !comment.trim()}
              size="icon"
              aria-label="Enviar comentário"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
