"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Dot } from "@/components/ui/badge";
import { ActivityRow } from "@/components/activity/activity-row";
import type { ActivityView, GroupBy } from "@/lib/types";
import type { Assignee, Journey, Stage } from "@/db/schema";
import { cn } from "@/lib/utils";
import { moveActivity } from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";

type Props = {
  activities: ActivityView[];
  stages: Stage[];
  journeys: Journey[];
  assignees: Assignee[];
  group: GroupBy;
  onEdit: (a: ActivityView) => void;
};

type Group = {
  key: string;
  name: string;
  color: string;
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
      color: s.color,
      items: activities.filter((a) => a.stageId === s.id),
    }));
  }
  if (group === "journey") {
    const groups: Group[] = journeys.map((j) => ({
      key: j.id,
      name: j.name,
      color: j.color,
      items: activities.filter((a) => a.journeyId === j.id),
    }));
    const orphans = activities.filter((a) => !a.journeyId);
    if (orphans.length)
      groups.push({
        key: "_none",
        name: "Sem jornada",
        color: "#94a3b8",
        items: orphans,
      });
    return groups;
  }
  const groups: Group[] = assignees.map((a) => ({
    key: a.id,
    name: a.name,
    color: a.color,
    items: activities.filter((act) => act.assigneeId === a.id),
  }));
  const orphans = activities.filter((a) => !a.assigneeId);
  if (orphans.length)
    groups.push({
      key: "_none",
      name: "Sem responsável",
      color: "#94a3b8",
      items: orphans,
    });
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
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${group.key}`,
    data: { type: "group", groupKey: group.key },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "border-b border-[var(--color-border)] last:border-b-0 transition-colors",
        isOver && "bg-[var(--color-accent)]",
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-[var(--color-muted)]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        )}
        <Dot color={group.color} />
        <span className="text-sm font-semibold">{group.name}</span>
        <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
          {group.items.length}
        </span>
      </button>
      {children}
    </section>
  );
}

export function ListView({
  activities,
  stages,
  journeys,
  assignees,
  group,
  onEdit,
}: Props) {
  const { mutate } = useActivitiesContext();

  const groups = React.useMemo(
    () => groupActivities(activities, group, stages, journeys, assignees),
    [activities, group, stages, journeys, assignees],
  );

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findGroupKey = (activityId: string): string | undefined => {
    for (const g of groups) {
      if (g.items.some((a) => a.id === activityId)) return g.key;
    }
    return undefined;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const overData = over.data.current as
      | { type?: string; groupKey?: string }
      | undefined;
    const targetGroupKey =
      overData?.type === "group" ? overData.groupKey! : findGroupKey(over.id as string);
    if (!targetGroupKey) return;

    const targetGroup = groups.find((g) => g.key === targetGroupKey);
    if (!targetGroup) return;

    const siblings = targetGroup.items.filter((a) => a.id !== active.id);
    let beforeId: string | null = null;
    let afterId: string | null = null;

    if (overData?.type !== "group") {
      const overIdx = siblings.findIndex((a) => a.id === over.id);
      if (overIdx >= 0) {
        beforeId = siblings[overIdx - 1]?.id ?? null;
        afterId = siblings[overIdx]?.id ?? null;
      } else {
        beforeId = siblings[siblings.length - 1]?.id ?? null;
      }
    } else {
      beforeId = siblings[siblings.length - 1]?.id ?? null;
    }

    const payload: {
      id: string;
      toStageId?: string;
      toJourneyId?: string | null;
      toAssigneeId?: string | null;
      beforeId?: string | null;
      afterId?: string | null;
    } = { id: active.id as string, beforeId, afterId };

    const moveAction: {
      type: "move";
      id: string;
      stageId?: string;
      journeyId?: string | null;
      assigneeId?: string | null;
    } = { type: "move", id: active.id as string };

    if (group === "status") {
      payload.toStageId = targetGroupKey;
      moveAction.stageId = targetGroupKey;
    } else if (group === "journey") {
      const v = targetGroupKey === "_none" ? null : targetGroupKey;
      payload.toJourneyId = v;
      moveAction.journeyId = v;
    } else if (group === "assignee") {
      const v = targetGroupKey === "_none" ? null : targetGroupKey;
      payload.toAssigneeId = v;
      moveAction.assigneeId = v;
    }

    mutate(moveAction, () => moveActivity(payload));
  };

  const activeActivity = activeId
    ? activities.find((a) => a.id === activeId)
    : null;
  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
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
                <SortableContext
                  items={g.items.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {g.items.map((a) => (
                      <ActivityRow
                        key={a.id}
                        activity={a}
                        stages={stages}
                        onEdit={onEdit}
                        showStage={group !== "status"}
                      />
                    ))}
                  </div>
                </SortableContext>
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
      <DragOverlay>
        {activeActivity ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm shadow-lg">
            {activeActivity.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
