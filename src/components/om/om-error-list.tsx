"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OM_ERROR_STATUSES } from "@/lib/types";
import { stalenessFrom } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { Journey, OmError } from "@/db/schema";

export type OmErrorGroup = {
  id: string;
  label: string;
  items: OmError[];
};

/** Um grupo por status, na ordem do fluxo. */
export function groupByStatus(items: OmError[]): OmErrorGroup[] {
  return OM_ERROR_STATUSES.map((s) => ({
    id: s.id,
    label: s.label,
    items: items.filter((e) => e.status === s.id),
  }));
}

function Meta({ error, journeys }: { error: OmError; journeys: Journey[] }) {
  const journey = journeys.find((j) => j.id === error.journeyId);
  const stale =
    error.status === "corrigido" ? null : stalenessFrom(error.updatedAt, Date.now());
  return (
    <span className="flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
      {journey && (
        <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
          {journey.name}
        </span>
      )}
      {error.handledBy && <span className="truncate">{error.handledBy}</span>}
      {error.status === "corrigido" && error.fixedAt && (
        <span className="ml-auto whitespace-nowrap">
          corrigido {format(parseISO(error.fixedAt), "dd MMM", { locale: ptBR })}
        </span>
      )}
      {stale && (
        <span
          className={cn(
            "ml-auto whitespace-nowrap font-medium",
            stale.level === "alert"
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-warning)]",
          )}
        >
          parado há {stale.days} d
        </span>
      )}
    </span>
  );
}

export function OmErrorList({
  groups,
  journeys,
  selectedId,
  collapsed,
  onToggleGroup,
  onSelect,
}: {
  groups: OmErrorGroup[];
  journeys: Journey[];
  selectedId: string | null;
  collapsed: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
      {groups.map((g) => (
        <section key={g.id}>
          <button
            onClick={() => onToggleGroup(g.id)}
            className="flex w-full items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-1.5 text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <span>{g.label}</span>
            <span className="tabular-nums opacity-70">{g.items.length}</span>
            {collapsed[g.id] && g.items.length > 0 && (
              <span className="ml-auto normal-case">mostrar</span>
            )}
          </button>
          {!collapsed[g.id] &&
            g.items.map((error) => (
              <button
                key={error.id}
                onClick={() => onSelect(error.id)}
                aria-current={error.id === selectedId}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-[var(--color-border)] px-3 py-2.5 text-left last:border-b-0 transition hover:bg-[var(--color-muted)]",
                  error.id === selectedId && "bg-[var(--color-muted)]",
                )}
              >
                <span className="text-sm font-medium leading-snug">
                  {error.symptom}
                </span>
                <Meta error={error} journeys={journeys} />
              </button>
            ))}
        </section>
      ))}
    </div>
  );
}
