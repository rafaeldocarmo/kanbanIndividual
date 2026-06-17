"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createQuery } from "@/app/actions/queries";
import { useQueriesContext } from "@/components/queries/queries-shell";

export function QueryComposer() {
  const { mutate } = useQueriesContext();
  const [title, setTitle] = React.useState("");
  const [query, setQuery] = React.useState("");
  const titleRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = title.trim();
    const q = query.trim();
    if (!t) {
      toast.error("Informe um título");
      titleRef.current?.focus();
      return;
    }
    if (!q) {
      toast.error("Escreva a query");
      return;
    }
    const now = new Date();
    mutate(
      {
        op: "upsert",
        query: {
          id: `temp-${crypto.randomUUID()}`,
          title: t,
          query: q,
          // Posição negativa garante que a nova query apareça no topo (ordem asc).
          position: (-Date.now()).toString(),
          createdAt: now,
          updatedAt: now,
        },
      },
      () => createQuery({ title: t, query: q }),
    );
    setTitle("");
    setQuery("");
    titleRef.current?.focus();
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3">
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da query (ex.: Vendas por canal — últimos 30 dias)"
          className="font-medium"
        />
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="SELECT * FROM …  (Ctrl+Enter salva)"
          spellCheck={false}
          className="min-h-[140px] font-mono text-[13px] leading-relaxed"
        />
        <div className="flex justify-end">
          <Button onClick={submit}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
