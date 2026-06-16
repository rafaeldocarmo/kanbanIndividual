"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SavedQuery } from "@/db/schema";
import { deleteQuery, updateQuery } from "@/app/actions/queries";
import { useQueriesContext } from "@/components/queries/queries-shell";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SavedQuery | null;
};

export function QueryDialog({ open, onOpenChange, item }: Props) {
  const { mutate } = useQueriesContext();
  const [title, setTitle] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    if (open && item) {
      setTitle(item.title);
      setQuery(item.query);
      setCopied(false);
    }
  }, [open, item]);

  React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar a query");
    }
  };

  const save = () => {
    if (!item) return;
    const t = title.trim();
    const q = query.trim();
    if (!t || !q) {
      toast.error(!t ? "Informe um título" : "Escreva a query");
      return;
    }
    mutate(
      {
        op: "upsert",
        query: { ...item, title: t, query: q, updatedAt: new Date() },
      },
      () => updateQuery({ id: item.id, title: t, query: q }),
    );
    onOpenChange(false);
  };

  const remove = () => {
    if (!item) return;
    if (!confirm(`Excluir a query "${item.title}"?`)) return;
    mutate({ op: "delete", id: item.id }, () => deleteQuery(item.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar query</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Título
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da query"
              className="font-medium"
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Query
              </label>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  save();
                }
              }}
              spellCheck={false}
              className="min-h-[280px] font-mono text-[13px] leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="justify-between">
          <Button type="button" variant="danger" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
