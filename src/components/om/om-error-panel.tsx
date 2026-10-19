"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/components/team/team-provider";
import { Markdown } from "@/lib/markdown";
import { OM_ERROR_STATUSES } from "@/lib/types";
import { stalenessFrom } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { Journey, OmError, OmErrorStatus } from "@/db/schema";

export function OmErrorPanel({
  error,
  journeys,
  onStatus,
  onEdit,
  onDelete,
  onBack,
}: {
  error: OmError;
  journeys: Journey[];
  onStatus: (status: OmErrorStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const { member } = useTeam();
  const journey = journeys.find((j) => j.id === error.journeyId);
  const createdBy = member(error.createdById)?.name;
  const stale =
    error.status === "corrigido"
      ? null
      : stalenessFrom(error.updatedAt, Date.now());

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)] lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      <h2 className="text-base font-semibold leading-snug">{error.symptom}</h2>

      {/* Trilha: um clique move o erro de status. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {OM_ERROR_STATUSES.map((s) => {
          const current = s.id === error.status;
          return (
            <button
              key={s.id}
              onClick={() => onStatus(s.id)}
              aria-pressed={current}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition",
                current
                  ? "bg-[var(--color-muted)] font-medium text-[var(--color-foreground)]"
                  : "border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-ring)] hover:text-[var(--color-foreground)]",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error.workaround && (
        <div className="mt-4 rounded-md bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] p-3">
          <div className="mb-1 text-[11px] font-medium text-[var(--color-warning)]">
            Contorno enquanto não corrige
          </div>
          <Markdown text={error.workaround} />
        </div>
      )}

      {error.detail && (
        <div className="mt-4">
          <Markdown text={error.detail} />
        </div>
      )}

      <footer className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-muted-foreground)]">
        <span>{journey?.name ?? "Sem jornada"}</span>
        <span aria-hidden>·</span>
        <span>{error.handledBy ? `Com ${error.handledBy}` : "Sem dono"}</span>
        {error.status === "corrigido" && error.fixedAt && (
          <>
            <span aria-hidden>·</span>
            <span>
              corrigido em{" "}
              {format(parseISO(error.fixedAt), "dd MMM yyyy", { locale: ptBR })}
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
          <Button variant="outline" size="sm" onClick={onEdit}>
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
    </article>
  );
}
