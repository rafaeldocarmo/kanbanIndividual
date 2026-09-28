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
import { cn, positionBetween } from "@/lib/utils";
import { moveActivity } from "@/app/actions/activities";
import { useActivitiesContext, type Mutation } from "@/components/app-shell";
import { PersonAvatar } from "@/components/team/assignee-picker";
import { DONE_STAGE, isRecentlyDone, reassignedIds } from "@/lib/team";

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
  /** Agrupado por responsável: mostra o avatar no cabeçalho. */
  personId?: string | null;
};

/** Grupo virtual (só no agrupamento por status): é a etapa "Concluído". */
const RECENT_DONE = "_done24h";

/**
 * Agrupado por responsável, um item com várias pessoas aparece no grupo de
 * cada uma, e o dnd-kit exige ids únicos: cada cópia arrasta como
 * `grupo::atividade`. Nos outros agrupamentos o id é o da atividade.
 */
const SEP = "::";
const activityIdOf = (dragId: string) =>
  dragId.includes(SEP) ? dragId.split(SEP)[1] : dragId;
const groupOfDragId = (dragId: string) =>
  dragId.includes(SEP) ? dragId.split(SEP)[0] : null;
const personOfKey = (key: string | null) =>
  key === null || key === "_none" ? null : key;

/** Etapa real de um grupo do agrupamento por status. */
function stageOfKey(key: string, stages: Stage[]) {
  if (key !== RECENT_DONE) return key;
  return stages.find((s) => s.name === DONE_STAGE)?.id ?? key;
}

/** Grupo de um item no agrupamento por status. */
function statusKeyOf(a: ActivityView, now: number) {
  return isRecentlyDone(a, now) ? RECENT_DONE : a.stageId;
}

function groupActivities(
  activities: ActivityView[],
  group: GroupBy,
  stages: Stage[],
  journeys: Journey[],
  assignees: Assignee[],
): Group[] {
  if (group === "status") {
    const now = Date.now();
    return stages.flatMap((s) => {
      const items = activities.filter((a) => a.stageId === s.id);
      if (s.name !== DONE_STAGE) return [{ key: s.id, name: s.name, items }];
      // "Concluído" se divide: o que acabou de ser concluído fica à vista.
      return [
        {
          key: RECENT_DONE,
          name: "Concluído nas últimas 24h",
          items: items.filter((a) => isRecentlyDone(a, now)),
        },
        {
          key: s.id,
          name: s.name,
          items: items.filter((a) => !isRecentlyDone(a, now)),
        },
      ];
    });
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
    items: activities.filter((act) => act.assigneeIds.includes(a.id)),
    personId: a.id,
  }));
  const orphans = activities.filter((a) => a.assigneeIds.length === 0);
  if (orphans.length)
    groups.push({
      key: "_none",
      name: "Sem responsável",
      items: orphans,
      personId: null,
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
        {group.personId !== undefined && (
          <PersonAvatar id={group.personId} size={20} />
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
  dragIdOf,
  stages,
  onEdit,
  onView,
  showStage,
}: {
  groupKey: string;
  items: ActivityView[];
  dragIdOf: (a: ActivityView) => string;
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
      items={items.map(dragIdOf)}
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
            dragId={dragIdOf(a)}
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
    const previewActivityId = activityIdOf(previewGroupKey.id);
    return activities.map((a) => {
      if (a.id !== previewActivityId) return a;
      if (group === "status") {
        const stage = stages.find(
          (s) => s.id === stageOfKey(previewGroupKey.key, stages),
        );
        return {
          ...a,
          stageId: stage?.id ?? a.stageId,
          stageName: stage?.name ?? a.stageName,
          // Sobre "últimas 24h" o item aparece lá (conclusão = agora).
          completedAt:
            previewGroupKey.key === RECENT_DONE ? new Date() : a.completedAt,
        };
      }
      if (group === "journey")
        return {
          ...a,
          journeyId: previewGroupKey.key === "_none" ? null : previewGroupKey.key,
        };
      return {
        ...a,
        assigneeIds: reassignedIds(
          a.assigneeIds,
          personOfKey(groupOfDragId(previewGroupKey.id)),
          personOfKey(previewGroupKey.key),
        ),
      };
    });
  }, [activities, previewGroupKey, group, stages]);

  const groups = React.useMemo(
    () => groupActivities(effective, group, stages, journeys, assignees),
    [effective, group, stages, journeys, assignees],
  );

  const [activeId, setActiveId] = React.useState<string | null>(null);

  /** Id de arraste da cópia do item neste grupo. A cópia arrastada mantém o
   *  id de origem ao mudar de grupo (senão o dnd-kit a perde). */
  const dragIdFor = React.useCallback(
    (groupKey: string, a: ActivityView) => {
      if (group !== "assignee") return a.id;
      if (activeId && a.id === activityIdOf(activeId)) {
        const current = previewGroupKey?.key ?? groupOfDragId(activeId);
        if (groupKey === current) return activeId;
      }
      return `${groupKey}${SEP}${a.id}`;
    },
    [group, activeId, previewGroupKey],
  );

  // Fast dragId → groupKey lookup
  const groupIndex = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups)
      for (const a of g.items) map.set(dragIdFor(g.key, a), g.key);
    return map;
  }, [groups, dragIdFor]);

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      const done = stages.find((s) => s.name === DONE_STAGE);
      if (done) initial[done.id] = true;
      return initial;
    },
  );

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
    (dragId: string): string | null => {
      const a = activities.find((x) => x.id === activityIdOf(dragId));
      if (!a) return null;
      if (group === "status") return statusKeyOf(a, Date.now());
      if (group === "journey") return a.journeyId ?? "_none";
      // A cópia sabe de que grupo de pessoa saiu.
      return groupOfDragId(dragId) ?? "_none";
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
    const activityId = activityIdOf(activeIdStr);
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
    const oldIndex = targetItems.findIndex((a) => a.id === activityId);

    let newIndex: number;
    if (overData?.type === "group") {
      // Dropped on droppable region (empty space / below last item)
      newIndex = oldIndex >= 0 ? targetItems.length - 1 : targetItems.length;
    } else {
      newIndex = targetItems.findIndex(
        (a) => a.id === activityIdOf(String(over.id)),
      );
      if (newIndex < 0) {
        newIndex = oldIndex >= 0 ? targetItems.length - 1 : targetItems.length;
      }
    }

    // Build the final ordering (same logic as @dnd-kit's arrayMove)
    let finalItems: ActivityView[];
    if (oldIndex >= 0) {
      finalItems = arrayMove(targetItems, oldIndex, newIndex);
    } else {
      const moving = activities.find((a) => a.id === activityId);
      if (!moving) return;
      finalItems = [
        ...targetItems.slice(0, newIndex),
        moving,
        ...targetItems.slice(newIndex),
      ];
    }

    const finalIdx = finalItems.findIndex((a) => a.id === activityId);
    const beforeNeighbor = finalItems[finalIdx - 1] ?? null;
    const afterNeighbor = finalItems[finalIdx + 1] ?? null;
    const beforeId = beforeNeighbor?.id ?? null;
    const afterId = afterNeighbor?.id ?? null;

    // No-op: same group + same position
    const originalGroupKey = originalGroupOf(activeIdStr);

    if (
      originalGroupKey === targetKey &&
      oldIndex >= 0 &&
      oldIndex === newIndex
    ) {
      return;
    }

    const newPos = positionBetween(beforeNeighbor, afterNeighbor);

    const action: Mutation = {
      type: "move",
      id: activityId,
      position: newPos.toString(),
    };
    const payload: {
      id: string;
      toStageId?: string;
      toJourneyId?: string | null;
      toAssigneeIds?: string[];
      beforeId?: string | null;
      afterId?: string | null;
    } = { id: activityId, beforeId, afterId };

    if (group === "status") {
      const stageId = stageOfKey(targetKey, stages);
      const stage = stages.find((s) => s.id === stageId);
      payload.toStageId = stageId;
      action.stageId = stageId;
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
      // Handoff: sai quem era o grupo de origem, entra o de destino.
      const current = activities.find((a) => a.id === activityId);
      const ids = reassignedIds(
        current?.assigneeIds ?? [],
        personOfKey(groupOfDragId(activeIdStr)),
        personOfKey(targetKey),
      );
      payload.toAssigneeIds = ids;
      action.assigneeIds = ids;
    }

    mutate(action, () => moveActivity(payload));
  };

  const activeActivity = activeId
    ? effective.find((a) => a.id === activityIdOf(activeId))
    : null;
  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <DndContext
      id="list-dnd"
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
                  dragIdOf={(a) => dragIdFor(g.key, a)}
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
