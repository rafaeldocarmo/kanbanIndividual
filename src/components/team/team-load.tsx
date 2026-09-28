"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/badge";
import { useTeam } from "@/components/team/team-provider";
import { IN_PROGRESS_STAGE, WIP_LIMIT } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { ActivityView } from "@/lib/types";
import type { Stage } from "@/db/schema";

/**
 * Faixa de carga: por pessoa, quantos itens em andamento, com mini-barra.
 * Âmbar para quem passa do limite. Ignora busca e filtros — é o time todo.
 */
export function TeamLoad({
  activities,
  stages,
}: {
  activities: ActivityView[];
  stages: Stage[];
}) {
  const { team, me } = useTeam();
  const stageId = stages.find((s) => s.name === IN_PROGRESS_STAGE)?.id;

  const { counts, unassigned } = React.useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const a of activities) {
      if (a.stageId !== stageId) continue;
      // Item compartilhado conta para cada responsável: está no prato de todos.
      for (const id of a.assigneeIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      if (a.assigneeIds.length === 0) unassigned++;
    }
    return { counts, unassigned };
  }, [activities, stageId]);

  if (!stageId || team.length === 0) return null;
  const scale = Math.max(WIP_LIMIT + 2, ...counts.values());

  return (
    <div
      aria-label="Itens em andamento por pessoa"
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 pt-3 text-xs"
    >
      <span className="text-[var(--color-muted-foreground)]">Em andamento</span>
      {team.map((m) => {
        const n = counts.get(m.id) ?? 0;
        const over = n > WIP_LIMIT;
        return (
          <div
            key={m.id}
            className="flex items-center gap-1.5"
            title={`${m.name}: ${n} em andamento${over ? ` (acima de ${WIP_LIMIT})` : ""}`}
          >
            <Avatar initials={m.initials} hue={m.hue} size={18} />
            <span
              className={cn(
                m.id === me?.id
                  ? "font-medium text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              {m.name}
            </span>
            <span
              className={cn(
                "w-3 font-semibold tabular-nums",
                over
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-foreground)]",
              )}
            >
              {n}
            </span>
            <span className="h-1 w-10 overflow-hidden rounded-full bg-[var(--color-border)]">
              <span
                className="block h-full rounded-full transition-[width]"
                style={{
                  width: `${(n / scale) * 100}%`,
                  backgroundColor: over
                    ? "var(--color-warning)"
                    : "color-mix(in srgb, var(--color-muted-foreground) 55%, transparent)",
                }}
              />
            </span>
          </div>
        );
      })}
      {unassigned > 0 && (
        <span className="text-[var(--color-muted-foreground)]">
          Sem responsável{" "}
          <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
            {unassigned}
          </span>
        </span>
      )}
    </div>
  );
}
