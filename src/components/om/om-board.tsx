"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OmCard } from "@/components/om/om-card";
import {
  groupByStatus,
  resolveMove,
  statusOfOver,
  type OmMove,
} from "@/components/om/om-move";
import { OM_ERROR_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Journey, OmError, OmErrorStatus } from "@/db/schema";

function Column({
  status,
  label,
  items,
  journeys,
  onCardClick,
}: {
  status: OmErrorStatus;
  label: string;
  items: OmError[];
  journeys: Journey[];
  onCardClick: (error: OmError) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${status}`,
    data: { type: "column", status },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-[var(--color-muted)] p-2">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="text-sm font-semibold">{label}</span>
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
          className={cn(
            "flex min-h-[120px] flex-col gap-2 rounded-md p-1 transition",
            isOver && "bg-[var(--color-accent)]",
          )}
        >
          {items.map((error) => (
            <OmCard
              key={error.id}
              error={error}
              journeys={journeys}
              onClick={onCardClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function OmBoard({
  items,
  journeys,
  onCardClick,
  onMove,
}: {
  items: OmError[];
  journeys: Journey[];
  onCardClick: (error: OmError) => void;
  onMove: (move: OmMove) => void;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Pré-visualização enquanto arrasta entre colunas.
  const [preview, setPreview] = React.useState<{
    id: string;
    status: OmErrorStatus;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const effective = React.useMemo(
    () =>
      preview
        ? items.map((e) =>
            e.id === preview.id ? { ...e, status: preview.status } : e,
          )
        : items,
    [items, preview],
  );

  const byStatus = React.useMemo(() => groupByStatus(effective), [effective]);

  const overInfo = (over: { id: string | number; data: { current?: unknown } }) => ({
    id: String(over.id),
    ...(over.data.current as { type?: string; status?: string } | undefined),
  });

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || over.id === active.id) return;
    const current = effective.find((e) => e.id === active.id);
    const target = statusOfOver(effective, overInfo(over));
    if (!current || !target || current.status === target) return;
    setPreview({ id: current.id, status: target });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setPreview(null);
    if (!over) return;
    const original = items.find((e) => e.id === active.id);
    if (!original) return;
    const move = resolveMove(effective, original, overInfo(over));
    if (move) onMove(move);
  };

  const activeError = activeId
    ? effective.find((e) => e.id === activeId)
    : null;

  return (
    <DndContext
      id="om-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setActiveId(null);
        setPreview(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
        {OM_ERROR_STATUSES.map((s) => (
          <Column
            key={s.id}
            status={s.id}
            label={s.label}
            items={byStatus.get(s.id) ?? []}
            journeys={journeys}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeError ? (
          <div className="w-72">
            <OmCard
              error={activeError}
              journeys={journeys}
              onClick={() => {}}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
