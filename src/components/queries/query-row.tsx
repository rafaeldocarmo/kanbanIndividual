"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Check, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SavedQuery } from "@/db/schema";

type Props = {
  item: SavedQuery;
  onOpen: (item: SavedQuery) => void;
  draggable?: boolean;
};

export function QueryRow({ item, onOpen, draggable = true }: Props) {
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.query);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar a query");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-[var(--color-muted)]"
    >
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar"
          className="cursor-grab touch-none rounded p-1 opacity-0 transition group-hover:opacity-60 hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpen(item)}
        title="Abrir para editar"
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-[var(--color-foreground)] group-hover:underline"
      >
        {item.title}
      </button>

      <button
        type="button"
        onClick={copy}
        aria-label="Copiar query"
        title="Copiar query"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
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
  );
}
