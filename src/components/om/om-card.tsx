"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bug } from "lucide-react";
import { stalenessFrom } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { Journey, OmError } from "@/db/schema";

type Props = {
  error: OmError;
  journeys: Journey[];
  onClick: (error: OmError) => void;
  dragging?: boolean;
};

function OmCardImpl({ error, journeys, onClick, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: error.id, data: { type: "card", status: error.status } });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
  };

  const journey = journeys.find((j) => j.id === error.journeyId);
  // Em "Defeito criado" o cartão já cumpriu seu papel: não cobra movimento.
  const stale =
    error.status === "defeito"
      ? null
      : stalenessFrom(error.updatedAt, Date.now());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        onClick(error);
      }}
      className={cn(
        "group cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm shadow-sm transition hover:shadow-md active:cursor-grabbing",
        dragging && "dragging-overlay",
      )}
    >
      <p className="line-clamp-3 leading-snug">{error.symptom}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
        {journey && (
          <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
            {journey.name}
          </span>
        )}
        {error.handledBy && <span className="truncate">{error.handledBy}</span>}
        {error.defectId && (
          <span className="flex items-center gap-1 text-[var(--color-foreground)]">
            <Bug className="h-3 w-3" />
            {error.defectId}
          </span>
        )}
        {stale && (
          <span
            className={cn(
              "ml-auto font-medium",
              stale.level === "alert"
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-warning)]",
            )}
          >
            há {stale.days} d
          </span>
        )}
      </div>
    </div>
  );
}

export const OmCard = React.memo(OmCardImpl);
