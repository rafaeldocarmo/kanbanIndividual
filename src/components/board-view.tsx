"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { ActivityCard } from "@/components/activity/activity-card";
import { Avatar } from "@/components/ui/badge";
import { useActivitiesContext, type Mutation } from "@/components/app-shell";
import { useTeam, type TeamMember } from "@/components/team/team-provider";
import { moveActivity } from "@/app/actions/activities";
import { DONE_STAGE } from "@/lib/team";
import { cn, positionBetween } from "@/lib/utils";
import type { ActivityView, Lanes } from "@/lib/types";
import type { Stage } from "@/db/schema";

type Props = {
  activities: ActivityView[];
  stages: Stage[];
  lanes: Lanes;
  onView: (a: ActivityView) => void;
};

/**
 * Destino de um drop. Sem raias, `assigneeId` fica undefined (não reatribui);
 * com raias, a linha define o responsável (null = sem responsável).
 */
type Place = { stageId: string; assigneeId?: string | null };
type CellData = { type: "cell" } & Place;

const NONE = "_none";

/** Nas raias, a coluna "Concluído" começa recolhida (como na Lista). */
function Cell({
  id,
  place,
  items,
  collapsed,
  activeId,
  onCardClick,
  className,
}: {
  id: string;
  place: Place;
  items: ActivityView[];
  collapsed?: boolean;
  activeId: string | null;
  onCardClick: (a: ActivityView) => void;
  className?: string;
}) {
  const data: CellData = { type: "cell", ...place };
  const { setNodeRef, isOver } = useDroppable({ id, data });
  // Recolhida, só mostra o cartão que está sendo arrastado (se estiver nela).
  const visible = collapsed ? items.filter((a) => a.id === activeId) : items;
  return (
    <SortableContext
      items={visible.map((i) => i.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-md p-1 transition",
          className,
          isOver && "bg-[var(--color-accent)] ring-1 ring-[var(--color-ring)]/50",
        )}
      >
        {visible.map((a) => (
          <ActivityCard key={a.id} activity={a} onClick={onCardClick} />
        ))}
        {collapsed && items.length > visible.length && (
          <span className="px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
            {items.length - visible.length} concluído
            {items.length - visible.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </SortableContext>
  );
}

// Raias: o ponteiro decide a célula (grade 2D); fora de tudo, o mais próximo.
const laneCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

export function BoardView({ activities, stages, lanes, onView }: Props) {
  const { mutate } = useActivitiesContext();
  const { team, member } = useTeam();
  const byPerson = lanes === "person";
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [showDone, setShowDone] = React.useState(false);
  // Pré-visualização efêmera da troca de célula durante o arraste.
  const [preview, setPreview] = React.useState<{
    id: string;
    stageId: string;
    assigneeId: string | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const effective = React.useMemo(() => {
    if (!preview) return activities;
    return activities.map((a) =>
      a.id === preview.id
        ? { ...a, stageId: preview.stageId, assigneeId: preview.assigneeId }
        : a,
    );
  }, [activities, preview]);

  const keyOf = React.useCallback(
    (stageId: string, assigneeId: string | null) =>
      byPerson ? `${assigneeId ?? NONE}:${stageId}` : stageId,
    [byPerson],
  );

  const cells = React.useMemo(() => {
    const map = new Map<string, ActivityView[]>();
    for (const a of effective) {
      const k = keyOf(a.stageId, a.assigneeId);
      const arr = map.get(k);
      if (arr) arr.push(a);
      else map.set(k, [a]);
    }
    return map;
  }, [effective, keyOf]);

  /** Onde o item cairia: sobre uma célula vazia/área livre ou sobre outro cartão. */
  const placeOf = (over: Over): Place | null => {
    const data = over.data.current as CellData | { type?: string } | undefined;
    if (data?.type === "cell") {
      const { stageId, assigneeId } = data as CellData;
      return { stageId, assigneeId };
    }
    const target = effective.find((a) => a.id === over.id);
    if (!target) return null;
    return byPerson
      ? { stageId: target.stageId, assigneeId: target.assigneeId }
      : { stageId: target.stageId };
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const current = effective.find((a) => a.id === active.id);
    const place = placeOf(over);
    if (!current || !place) return;
    const assigneeId =
      place.assigneeId === undefined ? current.assigneeId : place.assigneeId;
    if (current.stageId === place.stageId && current.assigneeId === assigneeId) {
      return;
    }
    setPreview({ id: current.id, stageId: place.stageId, assigneeId });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setPreview(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setPreview(null);
    if (!over) return;

    const id = active.id as string;
    const original = activities.find((a) => a.id === id);
    const place = placeOf(over);
    if (!original || !place) return;

    const toStageId = place.stageId;
    const toAssigneeId =
      place.assigneeId === undefined ? original.assigneeId : place.assigneeId;
    const sameCell =
      original.stageId === toStageId && original.assigneeId === toAssigneeId;

    // Ordem final da célula de destino, como a pré-visualização mostrou (o
    // item arrastado já está nela) — mesma lógica de `arrayMove` da Lista.
    const shown = cells.get(keyOf(toStageId, toAssigneeId)) ?? [];
    const oldIndex = shown.findIndex((a) => a.id === id);
    const overIsCell =
      (over.data.current as { type?: string } | undefined)?.type === "cell";
    const overIndex = overIsCell
      ? shown.length - 1
      : shown.findIndex((a) => a.id === over.id);
    let final: ActivityView[];
    if (oldIndex >= 0) {
      final = overIndex >= 0 ? arrayMove(shown, oldIndex, overIndex) : shown;
    } else {
      const at = overIsCell || overIndex < 0 ? shown.length : overIndex;
      final = [...shown.slice(0, at), original, ...shown.slice(at)];
    }
    const idx = final.findIndex((a) => a.id === id);
    if (sameCell && idx === oldIndex) return;
    const before = final[idx - 1] ?? null;
    const after = final[idx + 1] ?? null;

    const stage = stages.find((s) => s.id === toStageId);
    const action: Mutation = {
      type: "move",
      id,
      stageId: toStageId,
      stageName: stage?.name ?? null,
      stageColor: stage?.color ?? null,
    };
    if (before || after) {
      action.position = positionBetween(before, after).toString();
    }
    const reassign = toAssigneeId !== original.assigneeId;
    if (reassign) {
      const m = member(toAssigneeId);
      action.assigneeId = toAssigneeId;
      action.assigneeName = m?.name ?? null;
      action.assigneeInitials = m?.initials ?? null;
      action.assigneeColor = m?.color ?? null;
    }

    mutate(action, () =>
      moveActivity({
        id,
        toStageId,
        ...(reassign ? { toAssigneeId } : {}),
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      }),
    );
  };

  const activeActivity = activeId
    ? effective.find((a) => a.id === activeId)
    : null;

  const overlay = (
    <DragOverlay>
      {activeActivity ? (
        <div className="w-72">
          <ActivityCard activity={activeActivity} onClick={() => {}} dragging />
        </div>
      ) : null}
    </DragOverlay>
  );

  if (!byPerson) {
    return (
      <DndContext
        id="board-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="scrollbar-thin flex h-full gap-3 overflow-x-auto p-4">
          {stages.map((s) => {
            const items = cells.get(s.id) ?? [];
            return (
              <div
                key={s.id}
                className="flex w-72 shrink-0 flex-col rounded-lg bg-[var(--color-muted)] p-2"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                    {items.length}
                  </span>
                </div>
                <Cell
                  id={`stage:${s.id}`}
                  place={{ stageId: s.id }}
                  items={items}
                  activeId={activeId}
                  onCardClick={onView}
                  className="min-h-[100px]"
                />
              </div>
            );
          })}
        </div>
        {overlay}
      </DndContext>
    );
  }

  // --- Raias por pessoa: uma faixa por pessoa cruzando as etapas ---
  const hasUnassigned = activities.some((a) => !a.assigneeId);
  const laneList: { key: string; member: TeamMember | null }[] = [
    ...team.map((m) => ({ key: m.id, member: m })),
    ...(hasUnassigned ? [{ key: NONE, member: null }] : []),
  ];
  const grid = {
    gridTemplateColumns: `repeat(${stages.length}, minmax(15rem, 1fr))`,
  };
  // Largura mínima para as colunas caberem; abaixo disso, rola na horizontal.
  const minWidth = `calc(${stages.length} * 15rem + ${stages.length - 1} * 0.75rem + 2rem)`;
  const stageCount = (stageId: string) =>
    effective.filter((a) => a.stageId === stageId).length;

  return (
    <DndContext
      id="lanes-dnd"
      sensors={sensors}
      collisionDetection={laneCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="px-4 pb-4" style={{ minWidth }}>
        <div
          className="sticky top-0 z-10 grid gap-3 bg-[var(--color-card)] pb-1 pt-4"
          style={grid}
        >
          {stages.map((s) => {
            const isDoneCol = s.name === DONE_STAGE;
            return (
              <div
                key={s.id}
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold"
              >
                {isDoneCol ? (
                  <button
                    type="button"
                    onClick={() => setShowDone((v) => !v)}
                    aria-expanded={showDone}
                    className="-ml-1 flex items-center gap-1 rounded px-1 hover:bg-[var(--color-muted)]"
                  >
                    {showDone ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                    )}
                    {s.name}
                  </button>
                ) : (
                  s.name
                )}
                <span className="ml-auto text-xs font-normal text-[var(--color-muted-foreground)]">
                  {stageCount(s.id)}
                </span>
              </div>
            );
          })}
        </div>

        {laneList.map(({ key, member: m }) => {
          const open = effective.filter(
            (a) =>
              (a.assigneeId ?? NONE) === key && a.stageName !== DONE_STAGE,
          ).length;
          return (
            <section
              key={key}
              className="border-t border-[var(--color-border)] pt-2 first-of-type:border-t-0"
            >
              <div className="flex items-center gap-2 px-1 py-1.5 text-sm">
                {m ? (
                  <Avatar initials={m.initials} hue={m.hue} size={22} />
                ) : (
                  <Avatar size={22} />
                )}
                <span className="font-semibold">
                  {m?.name ?? "Sem responsável"}
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {open} {open === 1 ? "aberto" : "abertos"}
                </span>
              </div>
              <div className="grid gap-3 pb-3" style={grid}>
                {stages.map((s) => {
                  const assigneeId = m?.id ?? null;
                  return (
                    <Cell
                      key={s.id}
                      id={`cell:${key}:${s.id}`}
                      place={{ stageId: s.id, assigneeId }}
                      items={cells.get(keyOf(s.id, assigneeId)) ?? []}
                      collapsed={s.name === DONE_STAGE && !showDone}
                      activeId={activeId}
                      onCardClick={onView}
                      className="min-h-[64px] bg-[var(--color-muted)]"
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {overlay}
    </DndContext>
  );
}
