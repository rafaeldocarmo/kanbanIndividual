"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { ActivityRow } from "@/components/activity/activity-row";
import type { ActivityView, GroupBy } from "@/lib/types";
import type { Assignee, Journey, Stage } from "@/db/schema";
import { cn } from "@/lib/utils";
import { moveActivity } from "@/app/actions/activities";
import { useActivitiesContext, type Mutation } from "@/components/app-shell";

type Props = {
  activities: ActivityView[];
  stages: Stage[];
  journeys: Journey[];
  assignees: Assignee[];
  group: GroupBy;
  onEdit: (a: ActivityView) => void;
  onView: (a: ActivityView) => void;
};

type Group = {
  key: string;
  name: string;
  items: ActivityView[];
};

function groupActivities(
  activities: ActivityView[],
  group: GroupBy,
  stages: Stage[],
  journeys: Journey[],
  assignees: Assignee[],
): Group[] {
  if (group === "status") {
    return stages.map((s) => ({
      key: s.id,
      name: s.name,
      items: activities.filter((a) => a.stageId === s.id),
    }));
  }
  if (group === "journey") {
    const groups: Group[] = journeys.map((j) => ({
      key: j.id,
      name: j.name,
      items: activities.filter((a) => a.journeyId === j.id),
    }));
    const orphans = activities.filter((a) => !a.journeyId);
    if (orphans.length)
      groups.push({ key: "_none", name: "Sem jornada", items: orphans });
    return groups;
  }
  const groups: Group[] = assignees.map((a) => ({
    key: a.id,
    name: a.name,
    items: activities.filter((act) => act.assigneeId === a.id),
  }));
  const orphans = activities.filter((a) => !a.assigneeId);
  if (orphans.length)
    groups.push({ key: "_none", name: "Sem responsável", items: orphans });
  return groups;
}

function GroupSection({
  group,
  isCollapsed,
  onToggle,
  children,
}: {
  group: Group;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-muted)]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        )}
        <span className="text-sm font-semibold">{group.name}</span>
        <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
          {group.items.length}
        </span>
      </button>
      {children}
    </section>
  );
}

function GroupDrop({
  groupKey,
  items,
  stages,
  onEdit,
  onView,
  showStage,
}: {
  groupKey: string;
  items: ActivityView[];
  stages: Stage[];
  onEdit: (a: ActivityView) => void;
  onView: (a: ActivityView) => void;
  showStage: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${groupKey}`,
    data: { type: "group", groupKey },
  });
  return (
    <SortableContext
      items={items.map((a) => a.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[8px]",
          isOver && items.length === 0 && "bg-[var(--color-accent)]",
        )}
      >
        {items.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            stages={stages}
            onEdit={onEdit}
            onView={onView}
            showStage={showStage}
          />
        ))}
      </div>
    </SortableContext>
  );
}

function computePositionBetween(
  before: ActivityView | null,
  after: ActivityView | null,
): number {
  const beforePos = before ? Number(before.position) : null;
  const afterPos = after ? Number(after.position) : null;
  if (beforePos !== null && afterPos !== null) return (beforePos + afterPos) / 2;
  if (beforePos !== null) return beforePos + 1000;
  if (afterPos !== null) return afterPos - 1000;
  return 1000;
}

export function ListView({
  activities,
  stages,
  journeys,
  assignees,
  group,
  onEdit,
  onView,
}: Props) {
  const { mutate } = useActivitiesContext();

  // Live preview of cross-group drag while dragging
  const [previewGroupKey, setPreviewGroupKey] = React.useState<{
    id: string;
    key: string;
  } | null>(null);

  // Apply preview to derive the activity set used for rendering during drag.
  const effective = React.useMemo(() => {
    if (!previewGroupKey) return activities;
    return activities.map((a) => {
      if (a.id !== previewGroupKey.id) return a;
      if (group === "status") return { ...a, stageId: previewGroupKey.key };
      if (group === "journey")
        return {
          ...a,
          journeyId: previewGroupKey.key === "_none" ? null : previewGroupKey.key,
        };
      return {
        ...a,
        assigneeId: previewGroupKey.key === "_none" ? null : previewGroupKey.key,
      };
    });
  }, [activities, previewGroupKey, group]);

  const groups = React.useMemo(
    () => groupActivities(effective, group, stages, journeys, assignees),
    [effective, group, stages, journeys, assignees],
  );

  // Fast id → groupKey lookup
  const groupIndex = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const a of g.items) map.set(a.id, g.key);
    return map;
  }, [groups]);

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      const done = stages.find((s) => s.name === "Concluído");
      if (done) initial[done.id] = true;
      return initial;
    },
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const resolveTargetGroupKey = React.useCallback(
    (overId: string, overData: { type?: string; groupKey?: string } | undefined) => {
      if (overData?.type === "group") return overData.groupKey ?? null;
      return groupIndex.get(overId) ?? null;
    },
    [groupIndex],
  );

  // Original group of an activity (from props, *not* the preview-applied state).
  // Used to detect "back to origin" without bouncing on the preview itself.
  const originalGroupOf = React.useCallback(
    (id: string): string | null => {
      const a = activities.find((x) => x.id === id);
      if (!a) return null;
      if (group === "status") return a.stageId;
      if (group === "journey") return a.journeyId ?? "_none";
      return a.assigneeId ?? "_none";
    },
    [activities, group],
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overData = over.data.current as
      | { type?: string; groupKey?: string }
      | undefined;
    const targetKey = resolveTargetGroupKey(over.id as string, overData);
    if (!targetKey) return;
    const originalKey = originalGroupOf(active.id as string);
    if (!originalKey) return;
    if (originalKey === targetKey) {
      // back to origin — drop the preview if any
      setPreviewGroupKey((prev) => (prev ? null : prev));
      return;
    }
    setPreviewGroupKey((prev) =>
      prev?.id === active.id && prev.key === targetKey
        ? prev
        : { id: active.id as string, key: targetKey },
    );
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setPreviewGroupKey(null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const activeIdStr = active.id as string;
    setActiveId(null);
    setPreviewGroupKey(null);
    if (!over) return;

    const overData = over.data.current as
      | { type?: string; groupKey?: string }
      | undefined;
    const targetKey = resolveTargetGroupKey(over.id as string, overData);
    if (!targetKey) return;

    const targetGroup = groups.find((g) => g.key === targetKey);
    if (!targetGroup) return;

    // Use the items in target group (which already include the active item if
    // preview placed it there). Compute newIndex relative to this list.
    const targetItems = targetGroup.items;
    const oldIndex = targetItems.findIndex((a) => a.id === activeIdStr);

    let newIndex: number;
    if (overData?.type === "group") {
      // Dropped on droppable region (empty space / below last item)
      newIndex = oldIndex >= 0 ? targetItems.length - 1 : targetItems.length;
    } else {
      newIndex = targetItems.findIndex((a) => a.id === over.id);
      if (newIndex < 0) {
        newIndex = oldIndex >= 0 ? targetItems.length - 1 : targetItems.length;
      }
    }

    // Build the final ordering (same logic as @dnd-kit's arrayMove)
    let finalItems: ActivityView[];
    if (oldIndex >= 0) {
      finalItems = arrayMove(targetItems, oldIndex, newIndex);
    } else {
      const moving = activities.find((a) => a.id === activeIdStr);
      if (!moving) return;
      finalItems = [
        ...targetItems.slice(0, newIndex),
        moving,
        ...targetItems.slice(newIndex),
      ];
    }

    const finalIdx = finalItems.findIndex((a) => a.id === activeIdStr);
    const beforeNeighbor = finalItems[finalIdx - 1] ?? null;
    const afterNeighbor = finalItems[finalIdx + 1] ?? null;
    const beforeId = beforeNeighbor?.id ?? null;
    const afterId = afterNeighbor?.id ?? null;

    // No-op: same group + same position
    const originalGroupKey =
      group === "status"
        ? activities.find((a) => a.id === activeIdStr)?.stageId
        : group === "journey"
          ? activities.find((a) => a.id === activeIdStr)?.journeyId ?? "_none"
          : activities.find((a) => a.id === activeIdStr)?.assigneeId ?? "_none";

    if (
      originalGroupKey === targetKey &&
      oldIndex >= 0 &&
      oldIndex === newIndex
    ) {
      return;
    }

    const newPos = computePositionBetween(beforeNeighbor, afterNeighbor);

    const action: Mutation = {
      type: "move",
      id: activeIdStr,
      position: newPos.toString(),
    };
    const payload: {
      id: string;
      toStageId?: string;
      toJourneyId?: string | null;
      toAssigneeId?: string | null;
      beforeId?: string | null;
      afterId?: string | null;
    } = { id: activeIdStr, beforeId, afterId };

    if (group === "status") {
      const stage = stages.find((s) => s.id === targetKey);
      payload.toStageId = targetKey;
      action.stageId = targetKey;
      action.stageName = stage?.name ?? null;
      action.stageColor = stage?.color ?? null;
    } else if (group === "journey") {
      const v = targetKey === "_none" ? null : targetKey;
      const j = v ? journeys.find((x) => x.id === v) : null;
      payload.toJourneyId = v;
      action.journeyId = v;
      action.journeyName = j?.name ?? null;
      action.journeyColor = j?.color ?? null;
    } else {
      const v = targetKey === "_none" ? null : targetKey;
      const u = v ? assignees.find((x) => x.id === v) : null;
      payload.toAssigneeId = v;
      action.assigneeId = v;
      action.assigneeName = u?.name ?? null;
      action.assigneeInitials = u?.initials ?? null;
      action.assigneeColor = u?.color ?? null;
    }

    mutate(action, () => moveActivity(payload));
  };

  const activeActivity = activeId
    ? effective.find((a) => a.id === activeId)
    : null;
  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col">
        {nonEmpty.map((g) => {
          const isCollapsed = collapsed[g.key];
          return (
            <GroupSection
              key={g.key}
              group={g}
              isCollapsed={!!isCollapsed}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))
              }
            >
              {!isCollapsed && (
                <GroupDrop
                  groupKey={g.key}
                  items={g.items}
                  stages={stages}
                  onEdit={onEdit}
                  onView={onView}
                  showStage={group !== "status"}
                />
              )}
            </GroupSection>
          );
        })}
        {nonEmpty.length === 0 && (
          <div className="px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
            Nenhuma atividade encontrada.
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeActivity ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm shadow-lg">
            {activeActivity.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
