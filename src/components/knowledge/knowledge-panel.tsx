"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/components/team/team-provider";
import { Markdown } from "@/lib/markdown";
import { kindLabel } from "@/lib/types";
import type { Journey, Knowledge } from "@/db/schema";

export function KnowledgePanel({
  item,
  journeys,
  onEdit,
  onDelete,
  onBack,
}: {
  item: Knowledge;
  journeys: Journey[];
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const { member } = useTeam();
  const journey = journeys.find((j) => j.id === item.journeyId);
  const createdBy = member(item.createdById)?.name;
  const updatedBy = member(item.updatedById)?.name;

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)] lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
        <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
          {kindLabel(item.kind)}
        </span>
        <span>{journey?.name ?? "Geral"}</span>
      </div>

      <h2 className="mt-1.5 text-lg font-semibold leading-tight">{item.title}</h2>

      <div className="mt-3">
        <Markdown text={item.content} />
      </div>

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-muted-foreground)]">
        <span>
          {createdBy ?? "Alguém"} criou{" "}
          {format(new Date(item.createdAt), "dd MMM", { locale: ptBR })}
          {" · "}
          {updatedBy ? `${updatedBy} atualizou ` : "atualizado "}
          {formatDistanceToNow(new Date(item.updatedAt), {
            locale: ptBR,
            addSuffix: true,
          })}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Excluir conhecimento"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
          </Button>
        </span>
      </footer>
    </article>
  );
}
