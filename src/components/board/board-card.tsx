"use client";

import * as React from "react";
import { Check, Flame, Pencil, Trash2 } from "lucide-react";
import type { BoardItemData } from "@/components/board/board-shell";
import { useBoardContext } from "@/components/board/board-shell";
import { BOARD_STATUS } from "@/components/board/status";
import { Button } from "@/components/ui/button";
import { buildDayStrip, cn, computeStreak, formatShortDate } from "@/lib/utils";
import { deleteBoardItem, toggleCheckin } from "@/app/actions/board";

const TODAY_RING = "#2563eb";

export function BoardCard({
  item,
  onEdit,
}: {
  item: BoardItemData;
  onEdit: (item: BoardItemData) => void;
}) {
  const { today, mutate } = useBoardContext();
  const meta = BOARD_STATUS[item.status];

  const days = React.useMemo(() => new Set(item.checkins), [item.checkins]);
  const strip = React.useMemo(() => buildDayStrip(today, 7), [today]);
  const streak = React.useMemo(
    () => computeStreak(days, today),
    [days, today],
  );
  const todayChecked = days.has(today);

  const toggle = (day: string, checked: boolean) => {
    mutate({ op: "checkin", itemId: item.id, day, checked }, () =>
      toggleCheckin({ itemId: item.id, day, checked }),
    );
  };

  const remove = () => {
    if (!confirm(`Remover "${item.title}" do mural?`)) return;
    mutate({ op: "delete", id: item.id }, () => deleteBoardItem(item.id));
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-4 pl-5 pr-4 shadow-sm transition hover:shadow-md">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: meta.color }}
      />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-snug">
            {item.title}
          </h3>
          {item.detail && (
            <p
              className="mt-0.5 truncate text-xs font-medium"
              style={{ color: meta.color }}
            >
              {item.detail}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label="Editar"
            className="rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label="Remover"
            className="rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition hover:bg-[var(--color-muted)] hover:text-[var(--color-danger)] group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <span
            className="ml-1 text-xs font-semibold"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* Faixa de 7 dias */}
      <div className="mt-4 flex gap-1.5">
        {strip.map((cell) => {
          const checked = days.has(cell.iso);
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => toggle(cell.iso, !checked)}
              title={`${checked ? "Desmarcar" : "Conferir"} ${formatShortDate(cell.iso)}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "flex h-7 w-full items-center justify-center rounded-md border text-xs transition",
                  checked
                    ? "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "border-[var(--color-border)] bg-[var(--color-muted)] text-transparent hover:border-[var(--color-ring)]",
                )}
                style={
                  cell.isToday && !checked
                    ? { borderColor: TODAY_RING, borderWidth: 2 }
                    : undefined
                }
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">
                {cell.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rodapé */}
      <div className="mt-3 flex items-center justify-between">
        <Button
          size="sm"
          variant={todayChecked ? "subtle" : "outline"}
          onClick={() => toggle(today, !todayChecked)}
        >
          {todayChecked ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Conferido
            </>
          ) : (
            "Conferir hoje"
          )}
        </Button>

        {streak > 0 ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-[#f97316]">
            <Flame className="h-3.5 w-3.5" />
            {streak}d
          </span>
        ) : (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            sem sequência
          </span>
        )}
      </div>
    </div>
  );
}
