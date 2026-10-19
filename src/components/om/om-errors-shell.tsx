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
import { OmErrorList, groupByStatus } from "@/components/om/om-error-list";
import { OmErrorPanel } from "@/components/om/om-error-panel";
import {
  OmErrorEditor,
  type OmErrorValues,
} from "@/components/om/om-error-editor";
import { useTeam } from "@/components/team/team-provider";
import {
  createOmError,
  deleteOmError,
  setOmErrorStatus,
  updateOmError,
} from "@/app/actions/om-errors";
import type { OmErrorsBootstrap } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { OmError, OmErrorStatus } from "@/db/schema";

const ALL = "all";
const SEM_JORNADA = "sem";

type Mutation = { op: "upsert"; item: OmError } | { op: "delete"; id: string };

function reducer(state: OmError[], action: Mutation): OmError[] {
  const next =
    action.op === "delete"
      ? state.filter((e) => e.id !== action.id)
      : state.some((e) => e.id === action.item.id)
        ? state.map((e) => (e.id === action.item.id ? action.item : e))
        : [action.item, ...state];
  return [...next].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function OmErrorsShell({
  data,
  initialJourney,
  initialItem,
}: {
  data: OmErrorsBootstrap;
  initialJourney?: string;
  initialItem?: string;
}) {
  const { me } = useTeam();
  const [items, applyOptimistic] = React.useOptimistic(data.items, reducer);
  const [search, setSearch] = React.useState("");
  const [journey, setJourney] = useQueryState(
    "j",
    parseAsString.withDefault(initialJourney ?? ALL),
  );
  const [handler, setHandler] = React.useState(ALL);
  // Como no Conhecimento: a URL só é tocada quando nada está salvando.
  const [selectedId, setSelectedId] = React.useState(initialItem ?? "");
  const [isSaving, startTransition] = React.useTransition();
  React.useEffect(() => {
    if (isSaving) return;
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set("item", selectedId);
    else url.searchParams.delete("item");
    window.history.replaceState(null, "", url);
  }, [selectedId, isSaving]);
  const [editing, setEditing] = React.useState(false);
  // "Corrigido" começa recolhido: sai do caminho, mas continua na busca.
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({
    corrigido: true,
  });
  const [draft, setDraft] = React.useState("");
  const draftRef = React.useRef<HTMLInputElement>(null);
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

  const mutate = (
    action: Mutation,
    server: () => Promise<{ ok: boolean; error?: string }>,
  ) => {
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

  const handlers = React.useMemo(
    () => [...new Set(items.map((e) => e.handledBy).filter((h) => !!h))],
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      if (journey !== ALL) {
        const key = e.journeyId ?? SEM_JORNADA;
        if (key !== journey) return false;
      }
      if (handler !== ALL && e.handledBy !== handler) return false;
      if (!q) return true;
      return [e.symptom, e.detail, e.handledBy].some((t) =>
        t?.toLowerCase().includes(q),
      );
    });
  }, [items, journey, handler, search]);

  const groups = React.useMemo(() => groupByStatus(filtered), [filtered]);
  const selected = selectedId ? items.find((e) => e.id === selectedId) : null;

  /** Registro rápido: só o sintoma, entra em "Em análise". */
  const quickAdd = () => {
    const symptom = draft.trim();
    if (!symptom) return;
    if (!me) {
      toast.error("Escolha quem você é no topo para escrever");
      return;
    }
    const id = crypto.randomUUID();
    const now = new Date();
    const item: OmError = {
      id,
      symptom,
      detail: null,
      journeyId: null,
      status: "analise",
      handledBy: null,
      fixedAt: null,
      createdAt: now,
      createdById: me.id,
      updatedAt: now,
      updatedById: me.id,
    };
    mutate({ op: "upsert", item }, () => createOmError({ id, symptom }));
    setDraft("");
    setSelectedId(id);
    setCollapsed((c) => ({ ...c, analise: false }));
    draftRef.current?.focus();
  };

  const save = (values: OmErrorValues) => {
    if (!selected) return;
    const item: OmError = {
      ...selected,
      ...values,
      updatedAt: new Date(),
      updatedById: me?.id ?? null,
    };
    mutate({ op: "upsert", item }, () =>
      updateOmError({ ...values, id: selected.id }),
    );
    setEditing(false);
  };

  const changeStatus = (status: OmErrorStatus) => {
    if (!selected || selected.status === status) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const item: OmError = {
      ...selected,
      status,
      fixedAt: status === "corrigido" ? (selected.fixedAt ?? hoje) : null,
      updatedAt: new Date(),
      updatedById: me?.id ?? null,
    };
    mutate({ op: "upsert", item }, () =>
      setOmErrorStatus({ id: selected.id, status }),
    );
  };

  const remove = () => {
    if (!selected) return;
    if (!confirm(`Excluir "${selected.symptom}"?`)) return;
    const id = selected.id;
    setSelectedId("");
    mutate({ op: "delete", id }, () => deleteOmError(id));
  };

  const hasPanel = editing || !!selected;

  return (
    <>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Erros OM</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          O que já deu errado, o que fazer enquanto não corrige e em que pé está.
        </p>
      </header>

      {/* Registro rápido: sempre à mão, no meio do atendimento. */}
      <div className="relative mb-3">
        <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          ref={draftRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              quickAdd();
            }
          }}
          placeholder="Qual erro apareceu? (Enter registra, o resto você completa depois)"
          className="h-11 pl-9"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pelo sintoma…"
            className="pl-9"
          />
        </div>

        <Select value={journey} onValueChange={setJourney}>
          <SelectTrigger className="w-[175px]">
            <SelectValue placeholder="Jornada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as jornadas</SelectItem>
            {data.journeys.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.name}
              </SelectItem>
            ))}
            <SelectItem value={SEM_JORNADA}>Sem jornada</SelectItem>
          </SelectContent>
        </Select>

        {handlers.length > 0 && (
          <Select value={handler} onValueChange={setHandler}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Quem trata" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Qualquer um</SelectItem>
              {handlers.map((h) => (
                <SelectItem key={h} value={h!}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Nenhum erro registrado. Comece pelo último que te atrapalhou — a
            linha de cima registra em segundos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
          <div className={cn(hasPanel && "hidden lg:block")}>
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                Nada encontrado com esse recorte.
              </p>
            ) : (
              <OmErrorList
                groups={groups}
                journeys={data.journeys}
                selectedId={selected?.id ?? null}
                collapsed={collapsed}
                onToggleGroup={(id) =>
                  setCollapsed((c) => ({ ...c, [id]: !c[id] }))
                }
                onSelect={(id) => {
                  setSelectedId(id);
                  setEditing(false);
                }}
              />
            )}
          </div>

          <div className={cn(!hasPanel && "hidden lg:block")}>
            {selected && editing ? (
              <OmErrorEditor
                error={selected}
                journeys={data.journeys}
                handlers={handlers as string[]}
                onCancel={() => setEditing(false)}
                onSave={save}
              />
            ) : selected ? (
              <OmErrorPanel
                error={selected}
                journeys={data.journeys}
                onStatus={changeStatus}
                onEdit={() => setEditing(true)}
                onDelete={remove}
                onBack={() => setSelectedId("")}
              />
            ) : (
              <p className="hidden rounded-xl border border-dashed border-[var(--color-border)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)] lg:block">
                Escolha um erro à esquerda para ver os detalhes.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
