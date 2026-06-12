"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, PriorityBubble } from "@/components/ui/badge";
import { priorityColor, cn } from "@/lib/utils";
import type { ActivityView } from "@/lib/types";

type Props = {
  activity: ActivityView;
  onClick: (a: ActivityView) => void;
  dragging?: boolean;
};

function ActivityCardImpl({ activity, onClick, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: activity.id,
      data: { type: "activity", stageId: activity.stageId },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
  };

  const due = activity.dueDate ? parseISO(activity.dueDate) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        onClick(activity);
      }}
      className={cn(
        "group cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm shadow-sm transition hover:shadow-md active:cursor-grabbing",
        dragging && "dragging-overlay",
      )}
    >
      <div className="flex items-start gap-2">
        <PriorityBubble
          color={priorityColor(activity.priority)}
          title={`Prioridade ${activity.priority}`}
        />
        <div className="flex-1 leading-snug">
          {activity.journeyName && (
            <>
              <span className="font-semibold">{activity.journeyName}</span>
              <span className="text-[var(--color-muted-foreground)]"> — </span>
            </>
          )}
          <span className="font-medium">{activity.name}</span>
          {activity.lastStatus && (
            <>
              <span className="text-[var(--color-muted-foreground)]"> — </span>
              <span className="text-[var(--color-muted-foreground)]">
                {activity.lastStatus}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
        <div>
          {due && (
            <span className="tabular-nums">
              {format(due, "dd MMM", { locale: ptBR })}
            </span>
          )}
        </div>
        {activity.assigneeInitials && (
          <Avatar
            initials={activity.assigneeInitials}
            color={activity.assigneeColor ?? undefined}
            title={activity.assigneeName ?? undefined}
          />
        )}
      </div>
    </div>
  );
}

export const ActivityCard = React.memo(ActivityCardImpl);
