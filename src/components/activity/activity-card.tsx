"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { PriorityBubble } from "@/components/ui/badge";
import { AssigneePicker } from "@/components/team/assignee-picker";
import { BlockedByControl } from "@/components/team/blocked-by";
import { StaleBadge } from "@/components/team/stale-badge";
import { priorityColor, cn } from "@/lib/utils";
import type { ActivityView } from "@/lib/types";

type Props = {
  activity: ActivityView;
  /** Id no dnd-kit; nas raias difere por faixa (o item aparece em várias). */
  dragId?: string;
  onClick: (a: ActivityView) => void;
  dragging?: boolean;
};

function ActivityCardImpl({ activity, dragId, onClick, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: dragId ?? activity.id,
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
        activity.blockedBy && "border-l-[3px] border-l-[var(--color-danger)]",
        dragging && "dragging-overlay",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-[5px] flex">
          <PriorityBubble
            color={priorityColor(activity.priority)}
            title={`Prioridade ${activity.priority}`}
          />
        </span>
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
      <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <AssigneePicker activity={activity} size={22} />
        <BlockedByControl activity={activity} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <StaleBadge activity={activity} />
          {activity.comments.length > 0 && (
            <span
              title={`${activity.comments.length} comentário(s)`}
              className="flex items-center gap-0.5 tabular-nums"
            >
              <MessageSquare className="h-3 w-3" />
              {activity.comments.length}
            </span>
          )}
          {due && (
            <span className="tabular-nums">
              {format(due, "dd MMM", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const ActivityCard = React.memo(ActivityCardImpl);
