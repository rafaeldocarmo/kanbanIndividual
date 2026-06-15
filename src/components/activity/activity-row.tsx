"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  ArrowRight,
  GripVertical,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Avatar, PriorityBubble } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown";
import { cn, priorityColor } from "@/lib/utils";
import type { ActivityView } from "@/lib/types";
import type { Stage } from "@/db/schema";
import {
  deleteActivity,
  duplicateActivity,
  moveActivity,
} from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";

type Props = {
  activity: ActivityView;
  stages: Stage[];
  onEdit: (a: ActivityView) => void;
  onView: (a: ActivityView) => void;
  showStage?: boolean;
};

function ActivityRowImpl({
  activity,
  stages,
  onEdit,
  onView,
  showStage = true,
}: Props) {
  const { mutate } = useActivitiesContext();
  const due = activity.dueDate ? parseISO(activity.dueDate) : null;
  const isDone = activity.stageName === "Concluído";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: activity.id,
      data: { type: "activity", activityId: activity.id },
    });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const handleDelete = () => {
    if (!confirm(`Excluir "${activity.name}"?`)) return;
    mutate({ type: "delete", id: activity.id }, () =>
      deleteActivity(activity.id),
    );
  };

  const handleDuplicate = () => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: ActivityView = {
      ...activity,
      id: tempId,
      name: `${activity.name} (cópia)`,
      statusUpdates: [],
      lastStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mutate({ type: "create", activity: optimistic }, () =>
      duplicateActivity(activity.id),
    );
  };

  const handleMove = (toStageId: string) => {
    if (toStageId === activity.stageId) return;
    mutate(
      { type: "move", id: activity.id, stageId: toStageId },
      () => moveActivity({ id: activity.id, toStageId }),
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5 hover:bg-[var(--color-muted)]"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
        className="cursor-grab touch-none rounded p-1 opacity-0 transition group-hover:opacity-60 hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      </button>
      <PriorityBubble
        color={priorityColor(activity.priority)}
        title={`Prioridade ${activity.priority}`}
      />
      <button
        onClick={() => onView(activity)}
        className={cn(
          "flex-1 min-w-0 text-left text-sm",
          isDone && "line-through text-[var(--color-muted-foreground)]",
        )}
      >
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
      </button>
      <div className="ml-auto flex items-center gap-3">
        {activity.assigneeInitials && (
          <Avatar
            initials={activity.assigneeInitials}
            color={activity.assigneeColor ?? undefined}
            title={activity.assigneeName ?? undefined}
          />
        )}
        {due && (
          <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
            {format(due, "dd MMM", { locale: ptBR })}
          </span>
        )}
        {showStage && activity.stageName && (
          <Badge>{activity.stageName}</Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Ações"
              className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-accent)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(activity)}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDuplicate}>
              <Copy className="h-3.5 w-3.5" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                Mover para
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {stages.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => handleMove(s.id)}
                    disabled={s.id === activity.stageId}
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export const ActivityRow = React.memo(ActivityRowImpl);
