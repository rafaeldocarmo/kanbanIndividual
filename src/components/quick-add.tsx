"use client";

import * as React from "react";
import { Layers, Route, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignee, Journey, Stage } from "@/db/schema";
import type { ActivityView } from "@/lib/types";
import { createActivity } from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";
import { cn, priorityColor } from "@/lib/utils";

type Props = {
  stages: Stage[];
  journeys: Journey[];
  assignees: Assignee[];
};

const NONE = "__none__";

export function QuickAdd({ stages, journeys, assignees }: Props) {
  const { mutate } = useActivitiesContext();
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [stageId, setStageId] = React.useState(stages[0]?.id ?? "");
  const [journeyId, setJourneyId] = React.useState<string | null>(null);
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">(
    "medium",
  );
  const [expanded, setExpanded] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          nameRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const reset = () => {
    setName("");
    setStatus("");
    setJourneyId(null);
    setAssigneeId(null);
    setPriority("medium");
    setStageId(stages[0]?.id ?? "");
  };

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Informe um nome");
      nameRef.current?.focus();
      return;
    }
    if (!stageId) {
      toast.error("Status obrigatório");
      return;
    }

    const stage = stages.find((s) => s.id === stageId);
    const journey = journeyId ? journeys.find((j) => j.id === journeyId) : null;
    const assignee = assigneeId
      ? assignees.find((a) => a.id === assigneeId)
      : null;
    const initialStatusTrim = status.trim();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tempId = `temp-${crypto.randomUUID()}`;
    const statusHistory = initialStatusTrim
      ? [
          {
            id: `temp-status-${crypto.randomUUID()}`,
            content: initialStatusTrim,
            createdAt: now,
          },
        ]
      : [];

    const optimistic: ActivityView = {
      id: tempId,
      name: trimmedName,
      dueDate: today,
      priority,
      position: "9999999999",
      stageId,
      journeyId,
      assigneeId,
      createdAt: now,
      updatedAt: now,
      stageName: stage?.name ?? null,
      stageColor: stage?.color ?? null,
      journeyName: journey?.name ?? null,
      journeyColor: journey?.color ?? null,
      assigneeName: assignee?.name ?? null,
      assigneeInitials: assignee?.initials ?? null,
      assigneeColor: assignee?.color ?? null,
      statusUpdates: statusHistory,
      lastStatus: initialStatusTrim || null,
    };

    mutate({ type: "create", activity: optimistic }, () =>
      createActivity({
        name: trimmedName,
        stageId,
        journeyId,
        assigneeId,
        priority,
        initialStatus: initialStatusTrim || null,
      }),
    );

    reset();
    nameRef.current?.focus();
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
        {/* Primary row: chevron toggle + name input */}
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Recolher opções" : "Mais opções"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onEnter}
            placeholder="Nome da atividade (Enter para criar)"
            className="h-10 flex-1 border-transparent bg-[var(--color-muted)] text-sm font-medium placeholder:font-normal focus-visible:bg-[var(--color-card)]"
          />
        </div>

        {/* Accordion: only visible when expanded */}
        {expanded && (
          <div className="grid gap-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-3">
            <Input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Status (opcional)"
              className="h-9 border-transparent bg-[var(--color-card)] text-sm"
            />

            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <div className="flex items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-0.5">
                {(["low", "medium", "high"] as const).map((p) => {
                  const active = priority === p;
                  const color = priorityColor(p);
                  const label =
                    p === "low" ? "Baixa" : p === "medium" ? "Média" : "Alta";
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      title={`Prioridade ${label}`}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition",
                        active
                          ? "bg-[var(--color-muted)] text-[var(--color-foreground)] shadow-sm"
                          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                      )}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="hidden h-6 w-px bg-[var(--color-border)] sm:block" />

              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger className="h-9 w-[160px] gap-1.5 border-transparent bg-[var(--color-card)] hover:bg-[var(--color-card)]/70">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={journeyId ?? NONE}
                onValueChange={(v) => setJourneyId(v === NONE ? null : v)}
              >
                <SelectTrigger className="h-9 w-[150px] gap-1.5 border-transparent bg-[var(--color-card)] hover:bg-[var(--color-card)]/70">
                  <Route className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <SelectValue placeholder="Jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem jornada</SelectItem>
                  {journeys.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={assigneeId ?? NONE}
                onValueChange={(v) => setAssigneeId(v === NONE ? null : v)}
              >
                <SelectTrigger className="h-9 w-[160px] gap-1.5 border-transparent bg-[var(--color-card)] hover:bg-[var(--color-card)]/70">
                  <User className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguém</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
