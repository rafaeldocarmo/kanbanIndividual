"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ActivityCard } from "@/components/activity/activity-card";
import { Dot } from "@/components/ui/badge";
import type { ActivityView } from "@/lib/types";
import type { Stage } from "@/db/schema";
import { moveActivity } from "@/app/actions/activities";
import { useDroppable } from "@dnd-kit/core";
import { useActivitiesContext } from "@/components/app-shell";

type Props = {
  activities: ActivityView[];
  stages: Stage[];
  onEdit: (a: ActivityView) => void;
};

function Column({
  stage,
  items,
  onEdit,
}: {
  stage: Stage;
  items: ActivityView[];
  onEdit: (a: ActivityView) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.id}`,
    data: { type: "stage", stageId: stage.id },
  });
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-[var(--color-muted)] p-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Dot color={stage.color} />
        <span className="text-sm font-semibold">{stage.name}</span>
        <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
          {items.length}
        </span>
      </div>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={
            "flex min-h-[100px] flex-col gap-2 rounded-md p-1 transition " +
            (isOver ? "bg-[var(--color-accent)]" : "")
          }
        >
          {items.map((a) => (
            <ActivityCard key={a.id} activity={a} onClick={onEdit} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function BoardView({ activities, stages, onEdit }: Props) {
  const { mutate } = useActivitiesContext();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Ephemeral cross-column preview while dragging.
  const [previewStage, setPreviewStage] = React.useState<{
    id: string;
    stageId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const effective = React.useMemo(() => {
    if (!previewStage) return activities;
    return activities.map((a) =>
      a.id === previewStage.id ? { ...a, stageId: previewStage.stageId } : a,
    );
  }, [activities, previewStage]);

  const byStage = React.useMemo(() => {
    const map = new Map<string, ActivityView[]>();
    for (const s of stages) map.set(s.id, []);
    for (const a of effective) {
      const arr = map.get(a.stageId);
      if (arr) arr.push(a);
    }
    return map;
  }, [effective, stages]);

  const findStageOf = (id: string): string | undefined =>
    effective.find((a) => a.id === id)?.stageId;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeStage = findStageOf(active.id as string);
    const overData = over.data.current as
      | { type?: string; stageId?: string }
      | undefined;
    let overStage: string | undefined;
    if (overData?.type === "stage") overStage = overData.stageId;
    else overStage = findStageOf(over.id as string);
    if (!activeStage || !overStage || activeStage === overStage) return;
    setPreviewStage({ id: active.id as string, stageId: overStage });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    const preview = previewStage;
    setPreviewStage(null);
    if (!over) return;

    const overData = over.data.current as
      | { type?: string; stageId?: string }
      | undefined;
    const targetStageId =
      overData?.type === "stage"
        ? overData.stageId!
        : findStageOf(over.id as string);
    if (!targetStageId) return;

    const original = activities.find((a) => a.id === active.id);
    if (!original) return;

    const sourceStage = preview?.stageId === targetStageId
      ? targetStageId
      : original.stageId;

    const siblings = activities
      .filter((a) => a.stageId === targetStageId)
      .filter((a) => a.id !== active.id);

    let beforeId: string | null = null;
    let afterId: string | null = null;

    if (overData?.type !== "stage") {
      const overIdx = siblings.findIndex((a) => a.id === over.id);
      if (overIdx >= 0) {
        beforeId = siblings[overIdx - 1]?.id ?? null;
        afterId = siblings[overIdx]?.id ?? null;
      }
    } else {
      beforeId = siblings[siblings.length - 1]?.id ?? null;
    }

    if (sourceStage === targetStageId && beforeId === null && afterId === null) {
      return;
    }

    mutate(
      { type: "move", id: active.id as string, stageId: targetStageId },
      () =>
        moveActivity({
          id: active.id as string,
          toStageId: targetStageId,
          beforeId,
          afterId,
        }),
    );
  };

  const activeActivity = activeId
    ? effective.find((a) => a.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-thin flex h-full gap-3 overflow-x-auto p-4">
        {stages.map((s) => (
          <Column
            key={s.id}
            stage={s}
            items={byStage.get(s.id) ?? []}
            onEdit={onEdit}
          />
        ))}
      </div>
      <DragOverlay>
        {activeActivity ? (
          <div className="w-72">
            <ActivityCard activity={activeActivity} onClick={() => {}} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
