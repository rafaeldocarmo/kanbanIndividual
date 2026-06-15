"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, X, Check } from "lucide-react";
import type { LinkItem } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { linkDomain, normalizeUrl } from "@/lib/utils";
import { deleteLink, updateLink } from "@/app/actions/notes";
import { useNotesContext } from "@/components/notes/notes-shell";

export function LinkRow({ link }: { link: LinkItem }) {
  const { mutate } = useNotesContext();
  const [editing, setEditing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(normalizeUrl(link.url));
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const [title, setTitle] = React.useState(link.title);
  const [url, setUrl] = React.useState(link.url);
  const [category, setCategory] = React.useState(link.category ?? "");

  const startEdit = () => {
    setTitle(link.title);
    setUrl(link.url);
    setCategory(link.category ?? "");
    setEditing(true);
  };

  const save = () => {
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) {
      setEditing(false);
      return;
    }
    const cat = category.trim() || null;
    setEditing(false);
    mutate(
      {
        kind: "link",
        op: "upsert",
        link: { ...link, title: t, url: u, category: cat, updatedAt: new Date() },
      },
      () => updateLink({ id: link.id, title: t, url: u, category: cat }),
    );
  };

  const remove = () => {
    mutate({ kind: "link", op: "delete", id: link.id }, () =>
      deleteLink(link.id),
    );
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg px-2 py-2">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="h-8 text-sm"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="URL"
          className="h-8 text-sm"
        />
        <div className="flex items-center gap-2">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoria (opcional)"
            className="h-8 flex-1 text-sm"
          />
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={!title.trim() || !url.trim()}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--color-muted)]">
      <button
        type="button"
        onClick={copy}
        title="Clique para copiar o link"
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-medium text-[var(--color-foreground)] group-hover:underline">
          {link.title}
        </span>
        <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
          {copied ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-foreground)]">
              <Check className="h-3 w-3" />
              Copiado
            </span>
          ) : (
            <>
              {link.category ? `${link.category} · ` : ""}
              {linkDomain(link.url)}
            </>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={startEdit}
          aria-label="Editar link"
          className="rounded p-1 text-[var(--color-muted-foreground)] transition hover:text-[var(--color-foreground)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label="Excluir link"
          className="rounded p-1 text-[var(--color-muted-foreground)] transition hover:text-[var(--color-danger)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
