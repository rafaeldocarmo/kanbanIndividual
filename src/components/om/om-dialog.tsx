"use client";

import * as React from "react";
import { Bug, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  OmErrorEditor,
  type OmErrorValues,
} from "@/components/om/om-error-editor";
import { OmAssigneePicker } from "@/components/om/om-assignee";
import { useTeam } from "@/components/team/team-provider";
import { Markdown } from "@/lib/markdown";
import { omStatusLabel } from "@/lib/types";
import { stalenessFrom } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { Journey, OmError } from "@/db/schema";

export function OmDialog({
  open,
  onOpenChange,
  error,
  journeys,
  handlers,
  onSave,
  onAssign,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: OmError | null;
  journeys: Journey[];
  handlers: string[];
  onSave: (values: OmErrorValues) => void;
  onAssign: (assigneeId: string | null) => void;
  onDelete: () => void;
}) {
  const { member } = useTeam();
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (open) setEditing(false);
  }, [open, error?.id]);

  if (!error) return null;

  const journey = journeys.find((j) => j.id === error.journeyId);
  const createdBy = member(error.createdById)?.name;
  const stale =
    error.status === "defeito"
      ? null
      : stalenessFrom(error.updatedAt, Date.now());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl gap-3 overflow-y-auto">
        {editing ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Editar erro</DialogTitle>
            </DialogHeader>
            <OmErrorEditor
              error={error}
              journeys={journeys}
              handlers={handlers}
              onCancel={() => setEditing(false)}
              onSave={(values) => {
                onSave(values);
                setEditing(false);
              }}
            />
          </>
        ) : (
          <>
            <DialogHeader className="pr-10">
              <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5">
                  {omStatusLabel(error.status)}
                </span>
                <span>{journey?.name ?? "Sem jornada"}</span>
                {error.defectId && (
                  <span className="flex items-center gap-1 text-[var(--color-foreground)]">
                    <Bug className="h-3 w-3" />
                    {error.defectId}
                  </span>
                )}
              </div>
              <DialogTitle className="break-words text-base leading-snug">
                {error.symptom}
              </DialogTitle>
            </DialogHeader>

            {error.detail ? (
              <Markdown text={error.detail} />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Sem causa ou contexto registrado ainda.
              </p>
            )}

            <footer className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-muted-foreground)]">
              <OmAssigneePicker
                assigneeId={error.assigneeId}
                onChange={onAssign}
                size={22}
              />
              <span>
                {member(error.assigneeId)?.name ?? "Sem responsável"}
              </span>
              <span aria-hidden>·</span>
              <span>
                {error.handledBy ? `com ${error.handledBy}` : "sem terceiro"}
              </span>
              {error.fixedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    corrigido em{" "}
                    {format(parseISO(error.fixedAt), "dd MMM yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </>
              )}
              <span
                className={cn(
                  "ml-auto",
                  stale?.level === "warn" && "text-[var(--color-warning)]",
                  stale?.level === "alert" && "text-[var(--color-danger)]",
                )}
              >
                {createdBy ? `${createdBy} registrou · ` : ""}
                {stale
                  ? `parado há ${stale.days} d`
                  : `mexido ${formatDistanceToNow(new Date(error.updatedAt), {
                      locale: ptBR,
                      addSuffix: true,
                    })}`}
              </span>
              <span className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  aria-label="Excluir erro"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                </Button>
              </span>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
