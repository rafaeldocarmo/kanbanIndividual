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
import { DONE_STAGE, isRecentlyDone, reassignedIds } from "@/lib/team";
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
 * Destino de um drop. Sem raias, `lane` fica undefined (não reatribui); com
 * raias, é a faixa da pessoa (id) ou NONE ("Sem responsável").
 */
type Place = { stageId: string; lane?: string };
type CellData = { type: "cell" } & Place;

const NONE = "_none";

/**
 * Nas raias, um item com vários responsáveis aparece na faixa de cada um, e
 * o dnd-kit exige ids únicos: cada cópia arrasta como `faixa::atividade`.
 */
const SEP = "::";
const laneOfDragId = (dragId: string) =>
  dragId.includes(SEP) ? dragId.split(SEP)[0] : undefined;
const activityIdOf = (dragId: string) =>
  dragId.includes(SEP) ? dragId.split(SEP)[1] : dragId;
const laneToAssignee = (lane: string) => (lane === NONE ? null : lane);
/** Faixas em que o item aparece: uma por responsável (ou "Sem responsável"). */
const lanesOf = (a: ActivityView) =>
  a.assigneeIds.length > 0 ? a.assigneeIds : [NONE];

/** Nas raias, a coluna "Concluído" começa recolhida (como na Lista). */
function Cell({
  id,
  place,
  items,
  dragIdOf,
  collapsed,
  activeActivityId,
  onCardClick,
  className,
}: {
  id: string;
  place: Place;
  items: ActivityView[];
  dragIdOf: (a: ActivityView) => string;
  collapsed?: boolean;
  activeActivityId: string | null;
  onCardClick: (a: ActivityView) => void;
  className?: string;
}) {
  const data: CellData = { type: "cell", ...place };
  const { setNodeRef, isOver } = useDroppable({ id, data });
  // Recolhida, mostra só o concluído nas últimas 24h (e o cartão arrastado).
  const now = Date.now();
  const visible = collapsed
    ? items.filter((a) => a.id === activeActivityId || isRecentlyDone(a, now))
    : items;
  const hidden = items.length - visible.length;
  return (
    <SortableContext
      items={visible.map(dragIdOf)}
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
          <ActivityCard
            key={a.id}
            activity={a}
            dragId={dragIdOf(a)}
            onClick={onCardClick}
          />
        ))}
        {collapsed && hidden > 0 && (
          <span className="px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
            {visible.length > 0
              ? `+${hidden} anterior${hidden === 1 ? "" : "es"}`
              : `${hidden} concluído${hidden === 1 ? "" : "s"}`}
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
  const { team } = useTeam();
  const byPerson = lanes === "person";
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [showDone, setShowDone] = React.useState(false);
  // Pré-visualização efêmera da troca de célula durante o arraste.
  const [preview, setPreview] = React.useState<{
    activityId: string;
    stageId: string;
    assigneeIds: string[];
    lane?: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeActivityId = activeId ? activityIdOf(activeId) : null;
  const fromLane = activeId ? laneOfDragId(activeId) : undefined;

  const effective = React.useMemo(() => {
    if (!preview) return activities;
    return activities.map((a) =>
      a.id === preview.activityId
        ? { ...a, stageId: preview.stageId, assigneeIds: preview.assigneeIds }
        : a,
    );
  }, [activities, preview]);

  const keyOf = React.useCallback(
    (stageId: string, lane?: string) =>
      byPerson ? `${lane ?? NONE}:${stageId}` : stageId,
    [byPerson],
  );

  const cells = React.useMemo(() => {
    const map = new Map<string, ActivityView[]>();
    for (const a of effective) {
      for (const lane of byPerson ? lanesOf(a) : [undefined]) {
        const k = keyOf(a.stageId, lane);
        const arr = map.get(k);
        if (arr) arr.push(a);
        else map.set(k, [a]);
      }
    }
    return map;
  }, [effective, keyOf, byPerson]);

  /** Id de arraste da cópia do item nesta faixa. A cópia que está sendo
   *  arrastada mantém o id de origem ao mudar de faixa (senão o dnd-kit a perde). */
  const dragIdFor = (a: ActivityView, lane?: string) => {
    if (!byPerson) return a.id;
    const currentLane = preview?.lane ?? fromLane;
    if (activeId && a.id === activeActivityId && lane === currentLane) {
      return activeId;
    }
    return `${lane}${SEP}${a.id}`;
  };

  /** Responsáveis ao mover a cópia da faixa `from` para a faixa `to`. */
  const assigneesAfter = (a: ActivityView, from?: string, to?: string) =>
    byPerson && from !== undefined && to !== undefined && from !== to
      ? reassignedIds(a.assigneeIds, laneToAssignee(from), laneToAssignee(to))
      : a.assigneeIds;

  /** Onde o item cairia: sobre uma célula vazia/área livre ou sobre outro cartão. */
  const placeOf = (over: Over): Place | null => {
    const data = over.data.current as CellData | { type?: string } | undefined;
    if (data?.type === "cell") {
      const { stageId, lane } = data as CellData;
      return { stageId, lane };
    }
    const overId = String(over.id);
    const target = effective.find((a) => a.id === activityIdOf(overId));
    if (!target) return null;
    // A cópia arrastada guarda no id a faixa de ORIGEM; sobre ela mesma, a
    // faixa é onde a pré-visualização a colocou (senão oscila sem parar).
    const lane =
      overId === activeId ? (preview?.lane ?? fromLane) : laneOfDragId(overId);
    return byPerson
      ? { stageId: target.stageId, lane }
      : { stageId: target.stageId };
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    // Sobre o próprio espaço reservado não há o que pré-visualizar.
    if (!over || !activeActivityId || over.id === active.id) return;
    const original = activities.find((a) => a.id === activeActivityId);
    const current = effective.find((a) => a.id === activeActivityId);
    const place = placeOf(over);
    if (!original || !current || !place) return;
    const currentLane = preview?.lane ?? fromLane;
    const lane = place.lane ?? currentLane;
    if (current.stageId === place.stageId && lane === currentLane) return;
    setPreview({
      activityId: original.id,
      stageId: place.stageId,
      // Sempre a partir do original: a pré-visualização é substituída, não somada.
      assigneeIds: assigneesAfter(original, fromLane, lane),
      lane,
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setPreview(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setPreview(null);
    if (!over) return;

    const id = activityIdOf(active.id as string);
    const from = laneOfDragId(active.id as string);
    const original = activities.find((a) => a.id === id);
    const place = placeOf(over);
    if (!original || !place) return;

    const toStageId = place.stageId;
    const toLane = byPerson ? (place.lane ?? from) : undefined;
    const toAssigneeIds = assigneesAfter(original, from, toLane);
    const sameCell = original.stageId === toStageId && toLane === from;

    // Ordem final da célula de destino, como a pré-visualização mostrou (o
    // item arrastado já está nela) — mesma lógica de `arrayMove` da Lista.
    const shown = cells.get(keyOf(toStageId, toLane)) ?? [];
    const oldIndex = shown.findIndex((a) => a.id === id);
    const overIsCell =
      (over.data.current as { type?: string } | undefined)?.type === "cell";
    const overIndex = overIsCell
      ? shown.length - 1
      : shown.findIndex((a) => a.id === activityIdOf(String(over.id)));
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
    const reassign = toAssigneeIds.join() !== original.assigneeIds.join();
    if (reassign) action.assigneeIds = toAssigneeIds;

    mutate(action, () =>
      moveActivity({
        id,
        toStageId,
        ...(reassign ? { toAssigneeIds } : {}),
        beforeId: before?.id ?? null,
        afterId: after?.id ?? null,
      }),
    );
  };

  const activeActivity = activeActivityId
    ? effective.find((a) => a.id === activeActivityId)
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
                  dragIdOf={(a) => dragIdFor(a)}
                  activeActivityId={activeActivityId}
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
  const hasUnassigned = activities.some((a) => a.assigneeIds.length === 0);
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
            (a) => lanesOf(a).includes(key) && a.stageName !== DONE_STAGE,
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
                {stages.map((s) => (
                  <Cell
                    key={s.id}
                    id={`cell:${key}:${s.id}`}
                    place={{ stageId: s.id, lane: key }}
                    items={cells.get(keyOf(s.id, key)) ?? []}
                    dragIdOf={(a) => dragIdFor(a, key)}
                    collapsed={s.name === DONE_STAGE && !showDone}
                    activeActivityId={activeActivityId}
                    onCardClick={onView}
                    className="min-h-[64px] bg-[var(--color-muted)]"
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {overlay}
    </DndContext>
  );
}
