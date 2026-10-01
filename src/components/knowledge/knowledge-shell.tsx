"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KnowledgeList,
  groupByJourney,
} from "@/components/knowledge/knowledge-list";
import { KnowledgePanel } from "@/components/knowledge/knowledge-panel";
import { KnowledgeEditor } from "@/components/knowledge/knowledge-editor";
import { useTeam } from "@/components/team/team-provider";
import {
  createKnowledge,
  deleteKnowledge,
  updateKnowledge,
} from "@/app/actions/knowledge";
import { KNOWLEDGE_KINDS, type KnowledgeBootstrap } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Knowledge } from "@/db/schema";

const ALL = "all";
const GERAL = "geral";

type Mutation =
  | { op: "upsert"; item: Knowledge }
  | { op: "delete"; id: string };

function reducer(state: Knowledge[], action: Mutation): Knowledge[] {
  const next =
    action.op === "delete"
      ? state.filter((k) => k.id !== action.id)
      : state.some((k) => k.id === action.item.id)
        ? state.map((k) => (k.id === action.item.id ? action.item : k))
        : [action.item, ...state];
  // Mais recém-atualizado primeiro, como vem do servidor.
  return [...next].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function KnowledgeShell({
  data,
  initialJourney,
  initialKind,
  initialItem,
}: {
  data: KnowledgeBootstrap;
  initialJourney?: string;
  initialKind?: string;
  initialItem?: string;
}) {
  const { me } = useTeam();
  const [items, applyOptimistic] = React.useOptimistic(data.items, reducer);
  const [search, setSearch] = React.useState("");
  const [journey, setJourney] = useQueryState(
    "j",
    parseAsString.withDefault(initialJourney ?? ALL),
  );
  const [kind, setKind] = useQueryState(
    "t",
    parseAsString.withDefault(initialKind ?? ALL),
  );
  // A seleção fica em estado local e é espelhada na URL (link compartilhável).
  // Mexer na URL enquanto uma gravação está em curso faz o Next descartar a
  // resposta com os dados novos — por isso o efeito espera o salvamento acabar.
  const [selectedId, setSelectedId] = React.useState(initialItem ?? "");
  const [isSaving, startTransition] = React.useTransition();
  React.useEffect(() => {
    if (isSaving) return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("item", selectedId);
    else url.searchParams.delete("item");
    window.history.replaceState(null, "", url);
  }, [selectedId, isSaving]);
  const [editing, setEditing] = React.useState<"new" | "current" | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const mutate = (action: Mutation, server: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      applyOptimistic(action);
      try {
        const r = await server();
        if (!r.ok) toast.error(r.error ?? "Falha ao salvar");
      } catch {
        toast.error("Falha de sincronização");
      }
    });
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((k) => {
      if (journey !== ALL) {
        const key = k.journeyId ?? GERAL;
        if (key !== journey) return false;
      }
      if (kind !== ALL && k.kind !== kind) return false;
      if (!q) return true;
      return (
        k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q)
      );
    });
  }, [items, journey, kind, search]);

  const groups = React.useMemo(
    () => groupByJourney(filtered, data.journeys),
    [filtered, data.journeys],
  );

  const selected = selectedId ? items.find((k) => k.id === selectedId) : null;

  const startNew = () => {
    if (!me) {
      toast.error("Escolha quem você é no topo para escrever");
      return;
    }
    setEditing("new");
  };

  const save = (values: {
    title: string;
    content: string;
    journeyId: string | null;
    kind: Knowledge["kind"];
  }) => {
    const now = new Date();
    if (editing === "current" && selected) {
      const updated: Knowledge = {
        ...selected,
        ...values,
        updatedAt: now,
        updatedById: me?.id ?? null,
      };
      mutate({ op: "upsert", item: updated }, () =>
        updateKnowledge({ ...values, id: selected.id }),
      );
    } else {
      const id = crypto.randomUUID();
      const created: Knowledge = {
        id,
        ...values,
        createdAt: now,
        createdById: me?.id ?? null,
        updatedAt: now,
        updatedById: me?.id ?? null,
      };
      mutate({ op: "upsert", item: created }, () =>
        createKnowledge({ ...values, id }),
      );
      setSelectedId(id);
    }
    setEditing(null);
  };

  const remove = () => {
    if (!selected) return;
    if (!confirm(`Excluir "${selected.title}"?`)) return;
    const id = selected.id;
    setSelectedId("");
    mutate({ op: "delete", id }, () => deleteKnowledge(id));
  };

  const hasPanel = editing !== null || !!selected;

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1200px]">
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Banco de Conhecimento
          </h1>
          <Button onClick={startNew} className="ml-auto">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no conhecimento…"
              className="pl-9"
            />
          </div>

          <Select value={journey} onValueChange={setJourney}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Jornada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as jornadas</SelectItem>
              {data.journeys.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.name}
                </SelectItem>
              ))}
              <SelectItem value={GERAL}>Geral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {KNOWLEDGE_KINDS.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* O estado vazio dá lugar ao editor assim que alguém clica em "Novo". */}
        {items.length === 0 && !editing ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Comece anotando o que você explicaria para alguém que entrou hoje.
            </p>
            <Button onClick={startNew} className="mt-4">
              <Plus className="h-4 w-4" />
              Novo conhecimento
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
            <div className={cn(hasPanel && "hidden lg:block")}>
              {groups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                  {items.length === 0
                    ? "Nada por aqui ainda."
                    : "Nada encontrado com esse recorte."}
                </p>
              ) : (
                <KnowledgeList
                  groups={groups}
                  selectedId={selected?.id ?? null}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setEditing(null);
                  }}
                />
              )}
            </div>

            <div className={cn(!hasPanel && "hidden lg:block")}>
              {editing ? (
                <KnowledgeEditor
                  item={editing === "current" ? (selected ?? null) : null}
                  journeys={data.journeys}
                  defaultJourneyId={
                    journey === ALL || journey === GERAL ? null : journey
                  }
                  onCancel={() => setEditing(null)}
                  onSave={save}
                />
              ) : selected ? (
                <KnowledgePanel
                  item={selected}
                  journeys={data.journeys}
                  onEdit={() => (me ? setEditing("current") : startNew())}
                  onDelete={remove}
                  onBack={() => setSelectedId("")}
                />
              ) : (
                <p className="hidden rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)] lg:block">
                  Escolha um item à esquerda para ler.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
