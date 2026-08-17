"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BoardStatus } from "@/db/schema";
import type { BoardItemData } from "@/components/board/board-shell";
import { useBoardContext } from "@/components/board/board-shell";
import { BOARD_STATUS, STATUS_ORDER } from "@/components/board/status";
import { cn } from "@/lib/utils";
import {
  createBoardItem,
  deleteBoardItem,
  updateBoardItem,
} from "@/app/actions/board";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BoardItemData | null;
};

export function BoardDialog({ open, onOpenChange, item }: Props) {
  const { mutate } = useBoardContext();
  const isEdit = !!item;
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [status, setStatus] = React.useState<BoardStatus>("em_dia");

  React.useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setDetail(item?.detail ?? "");
    setStatus(item?.status ?? "em_dia");
  }, [open, item]);

  const save = () => {
    const t = title.trim();
    if (!t) {
      toast.error("Informe um título");
      return;
    }
    const d = detail.trim() || null;
    const now = new Date();

    if (isEdit && item) {
      mutate(
        {
          op: "upsert",
          item: { ...item, title: t, detail: d, status, updatedAt: now },
        },
        () => updateBoardItem({ id: item.id, title: t, detail: d, status }),
      );
    } else {
      mutate(
        {
          op: "upsert",
          item: {
            id: `temp-${crypto.randomUUID()}`,
            title: t,
            detail: d,
            status,
            createdAt: now,
            updatedAt: now,
            checkins: [],
          },
        },
        () => createBoardItem({ title: t, detail: d, status }),
      );
    }
    onOpenChange(false);
  };

  const remove = () => {
    if (!item) return;
    if (!confirm(`Remover "${item.title}" do mural?`)) return;
    mutate({ op: "delete", id: item.id }, () => deleteBoardItem(item.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar atividade" : "Nova atividade"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Título
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Ex.: Backlog de OM"
              className="font-medium"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Detalhe (opcional)
            </label>
            <Input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Ex.: 14 abertos · 3 priorizados"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Situação
            </label>
            <div className="flex gap-1.5">
              {STATUS_ORDER.map((s) => {
                const meta = BOARD_STATUS[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition",
                      active
                        ? "border-transparent text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
                    )}
                    style={active ? { backgroundColor: `${meta.color}1f` } : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className={isEdit ? "justify-between" : undefined}>
          {isEdit && (
            <Button type="button" variant="danger" onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save}>
              {isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
