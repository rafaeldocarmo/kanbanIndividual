"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Assignee, Journey, Stage } from "@/db/schema";
import type { ActivityView } from "@/lib/types";
import { activityInput } from "@/lib/validators";
import {
  addStatusUpdate,
  createActivity,
  deleteStatusUpdate,
  updateActivity,
} from "@/app/actions/activities";
import { useActivitiesContext } from "@/components/app-shell";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  journeys: Journey[];
  assignees: Assignee[];
  initial?: ActivityView | null;
  defaultStageId?: string;
};

const formSchema = activityInput;
type FormValues = z.infer<typeof formSchema>;

const NONE = "__none__";

export function ActivityDialog({
  open,
  onOpenChange,
  stages,
  journeys,
  assignees,
  initial,
  defaultStageId,
}: Props) {
  const isEdit = !!initial;
  const { mutate } = useActivitiesContext();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      stageId: defaultStageId ?? stages[0]?.id ?? "",
      journeyId: null,
      assigneeId: null,
      priority: "medium",
      initialStatus: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? "",
      stageId: initial?.stageId ?? defaultStageId ?? stages[0]?.id ?? "",
      journeyId: initial?.journeyId ?? null,
      assigneeId: initial?.assigneeId ?? null,
      priority: initial?.priority ?? "medium",
      initialStatus: "",
    });
  }, [open, initial, defaultStageId, stages, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      initialStatus: values.initialStatus?.trim()
        ? values.initialStatus
        : null,
    };

    const stage = stages.find((s) => s.id === values.stageId);
    const journey = values.journeyId
      ? journeys.find((j) => j.id === values.journeyId)
      : null;
    const assignee = values.assigneeId
      ? assignees.find((a) => a.id === values.assigneeId)
      : null;

    if (isEdit && initial) {
      const updated: ActivityView = {
        ...initial,
        name: values.name,
        priority: values.priority,
        stageId: values.stageId,
        journeyId: values.journeyId ?? null,
        assigneeId: values.assigneeId ?? null,
        stageName: stage?.name ?? null,
        stageColor: stage?.color ?? null,
        journeyName: journey?.name ?? null,
        journeyColor: journey?.color ?? null,
        assigneeName: assignee?.name ?? null,
        assigneeInitials: assignee?.initials ?? null,
        assigneeColor: assignee?.color ?? null,
        updatedAt: new Date(),
      };
      mutate({ type: "update", activity: updated }, () =>
        updateActivity({ ...payload, id: initial.id }),
      );
    } else {
      const now = new Date();
      const tempId = `temp-${crypto.randomUUID()}`;
      const statusHistory = payload.initialStatus
        ? [
            {
              id: `temp-status-${crypto.randomUUID()}`,
              content: payload.initialStatus,
              createdAt: now,
            },
          ]
        : [];
      const optimistic: ActivityView = {
        id: tempId,
        name: values.name,
        dueDate: now.toISOString().slice(0, 10),
        priority: values.priority,
        position: "9999999999",
        stageId: values.stageId,
        journeyId: values.journeyId ?? null,
        assigneeId: values.assigneeId ?? null,
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
        lastStatus: payload.initialStatus || null,
      };
      mutate({ type: "create", activity: optimistic }, () =>
        createActivity(payload),
      );
    }

    onOpenChange(false);
  };

  const stageId = watch("stageId");
  const journeyId = watch("journeyId");
  const assigneeId = watch("assigneeId");
  const priority = watch("priority");

  const [pendingStatus, setPendingStatus] = React.useState("");

  const handleAddStatus = () => {
    if (!initial || !pendingStatus.trim()) return;
    const trimmed = pendingStatus.trim();
    const tempStatus = {
      id: `temp-status-${crypto.randomUUID()}`,
      content: trimmed,
      createdAt: new Date(),
    };
    mutate(
      { type: "addStatus", activityId: initial.id, status: tempStatus },
      () => addStatusUpdate({ activityId: initial.id, content: trimmed }),
    );
    setPendingStatus("");
  };

  const handleDeleteStatus = (statusId: string) => {
    if (!initial) return;
    mutate(
      { type: "removeStatus", activityId: initial.id, statusId },
      () => deleteStatusUpdate(statusId),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? initial!.name : "Nova atividade"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Nome
            </label>
            <Input
              autoFocus={!isEdit}
              placeholder="Ex.: Revisar contrato"
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs text-[var(--color-danger)]">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Prioridade
            </label>
            <Select
              value={priority}
              onValueChange={(v) =>
                setValue("priority", v as FormValues["priority"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Status
              </label>
              <Select value={stageId} onValueChange={(v) => setValue("stageId", v)}>
                <SelectTrigger>
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
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Jornada
              </label>
              <Select
                value={journeyId ?? NONE}
                onValueChange={(v) =>
                  setValue("journeyId", v === NONE ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
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
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Responsável
              </label>
              <Select
                value={assigneeId ?? NONE}
                onValueChange={(v) =>
                  setValue("assigneeId", v === NONE ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
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

          {/* Status history (only for existing activities) */}
          {isEdit && (
            <div className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Histórico de status
              </label>
              <div className="flex gap-2">
                <Input
                  value={pendingStatus}
                  onChange={(e) => setPendingStatus(e.target.value)}
                  placeholder="Novo status…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStatus();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddStatus}
                  disabled={!pendingStatus.trim()}
                  size="sm"
                >
                  Adicionar
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {initial!.statusUpdates.length === 0 && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Sem status registrados ainda.
                  </p>
                )}
                <ul className="grid gap-1.5">
                  {initial!.statusUpdates.map((s, idx) => (
                    <li
                      key={s.id}
                      className="group flex items-start gap-2 rounded bg-[var(--color-card)] px-2 py-1.5 text-sm"
                    >
                      <span className="mt-0.5 shrink-0 text-[10px] uppercase tabular-nums text-[var(--color-muted-foreground)]">
                        {format(new Date(s.createdAt), "dd MMM HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      <span className="flex-1">{s.content}</span>
                      {idx === 0 && (
                        <Badge color="#10b981">atual</Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteStatus(s.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Primeiro status (opcional)
              </label>
              <Textarea
                placeholder="Ex.: Aguardando aprovação"
                {...register("initialStatus")}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
