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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bug, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { PersonAvatar } from "@/components/team/assignee-picker";
import {
  groupByStatus,
  resolveMove,
  statusOfOver,
  type OmMove,
} from "@/components/om/om-move";
import { OM_ERROR_STATUSES } from "@/lib/types";
import { stalenessFrom } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { Journey, OmError, OmErrorStatus } from "@/db/schema";

function Row({
  error,
  journeys,
  onClick,
}: {
  error: OmError;
  journeys: Journey[];
  onClick: (error: OmError) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: error.id, data: { type: "card", status: error.status } });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const journey = journeys.find((j) => j.id === error.journeyId);
  const stale =
    error.status === "defeito"
      ? null
      : stalenessFrom(error.updatedAt, Date.now());

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 border-b border-[var(--color-border)] px-3 py-2.5 last:border-b-0 hover:bg-[var(--color-muted)]"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
        className="mt-0.5 cursor-grab touch-none rounded p-1 opacity-0 transition group-hover:opacity-60 hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      </button>

      <span className="mt-0.5">
        <PersonAvatar id={error.assigneeId} size={20} />
      </span>

      <button
        onClick={() => onClick(error)}
        className="min-w-0 flex-1 text-left text-sm leading-snug"
      >
        {error.symptom}
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-3 pl-2 text-[11px] text-[var(--color-muted-foreground)]">
        {error.defectId && (
          <span className="flex items-center gap-1 text-[var(--color-foreground)]">
            <Bug className="h-3 w-3" />
            {error.defectId}
          </span>
        )}
        {error.handledBy && <span className="truncate">{error.handledBy}</span>}
        {journey && (
          <span className="rounded-full border border-[var(--color-border)] px-1.5 py-0.5">
            {journey.name}
          </span>
        )}
        {stale && (
          <span
            className={cn(
              "font-medium tabular-nums",
              stale.level === "alert"
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-warning)]",
            )}
          >
            há {stale.days} d
          </span>
        )}
      </div>
    </div>
  );
}

function Group({
  status,
  label,
  items,
  journeys,
  collapsed,
  onToggle,
  onCardClick,
}: {
  status: OmErrorStatus;
  label: string;
  items: OmError[];
  journeys: Journey[];
  collapsed: boolean;
  onToggle: () => void;
  onCardClick: (error: OmError) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${status}`,
    data: { type: "column", status },
  });

  return (
    <section className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-muted)]"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        )}
        <span className="text-sm font-semibold">{label}</span>
        <span className="ml-1 rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
          {items.length}
        </span>
      </button>
      {!collapsed && (
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={cn(
              "min-h-[8px]",
              isOver && items.length === 0 && "bg-[var(--color-accent)]",
            )}
          >
            {items.map((error) => (
              <Row
                key={error.id}
                error={error}
                journeys={journeys}
                onClick={onCardClick}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </section>
  );
}

export function OmList({
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
  const [preview, setPreview] = React.useState<{
    id: string;
    status: OmErrorStatus;
  } | null>(null);
  // "Defeito criado" é histórico: começa recolhido, como o Concluído do Kanban.
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
    defeito: true,
  });

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
    // Ao arrastar para um grupo recolhido, abre para a pessoa ver onde caiu.
    setCollapsed((c) => (c[target] ? { ...c, [target]: false } : c));
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
      id="om-list"
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
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        {OM_ERROR_STATUSES.map((s) => (
          <Group
            key={s.id}
            status={s.id}
            label={s.label}
            items={byStatus.get(s.id) ?? []}
            journeys={journeys}
            collapsed={!!collapsed[s.id]}
            onToggle={() =>
              setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))
            }
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeError ? (
          <div className="max-w-xl truncate rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm shadow-lg">
            {activeError.symptom}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
