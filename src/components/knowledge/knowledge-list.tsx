"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PersonAvatar } from "@/components/team/assignee-picker";
import { kindLabel } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Journey, Knowledge } from "@/db/schema";

/** Primeira linha com texto, sem os sinais de markdown. */
function snippet(content: string) {
  const line = content.split("\n").find((l) => l.trim()) ?? "";
  return line.replace(/[#*`>]/g, "").replace(/^\s*[-\d.)]+\s*/, "").trim();
}

export type KnowledgeGroup = {
  key: string;
  name: string;
  items: Knowledge[];
};

/** Agrupa por jornada, na ordem das jornadas; "Geral" por último. */
export function groupByJourney(
  items: Knowledge[],
  journeys: Journey[],
): KnowledgeGroup[] {
  const groups = journeys.map((j) => ({
    key: j.id,
    name: j.name,
    items: items.filter((k) => k.journeyId === j.id),
  }));
  const geral = items.filter((k) => !k.journeyId);
  if (geral.length > 0) groups.push({ key: "geral", name: "Geral", items: geral });
  return groups.filter((g) => g.items.length > 0);
}

export function KnowledgeList({
  groups,
  selectedId,
  onSelect,
}: {
  groups: KnowledgeGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-1.5 text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
            <span>{g.name}</span>
            <span className="tabular-nums opacity-70">{g.items.length}</span>
          </div>
          {g.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={item.id === selectedId}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-[var(--color-border)] px-3 py-2.5 text-left last:border-b-0 transition hover:bg-[var(--color-muted)]",
                item.id === selectedId && "bg-[var(--color-muted)]",
              )}
            >
              <span className="text-sm font-medium leading-snug">
                {item.title}
              </span>
              <span className="truncate text-xs text-[var(--color-muted-foreground)]">
                {snippet(item.content)}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
                  {kindLabel(item.kind)}
                </span>
                <PersonAvatar id={item.updatedById} size={16} />
                <span>
                  {formatDistanceToNow(new Date(item.updatedAt), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </span>
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
