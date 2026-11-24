"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OmBoard } from "@/components/om/om-board";
import { OmList } from "@/components/om/om-list";
import { OmDialog } from "@/components/om/om-dialog";
import type { OmMove } from "@/components/om/om-move";
import type { OmErrorValues } from "@/components/om/om-error-editor";
import { useTeam } from "@/components/team/team-provider";
import {
  createOmError,
  deleteOmError,
  moveOmError,
  updateOmError,
} from "@/app/actions/om-errors";
import type { OmErrorsBootstrap, ViewMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { OmError } from "@/db/schema";

const ALL = "all";
const SEM_JORNADA = "sem";
const VIEWS: ViewMode[] = ["list", "board"];

type Mutation = { op: "upsert"; item: OmError } | { op: "delete"; id: string };

function reducer(state: OmError[], action: Mutation): OmError[] {
  const next =
    action.op === "delete"
      ? state.filter((e) => e.id !== action.id)
      : state.some((e) => e.id === action.item.id)
        ? state.map((e) => (e.id === action.item.id ? action.item : e))
        : [...state, action.item];
  // A ordem do quadro é a posição dentro da coluna.
  return [...next].sort((a, b) => Number(a.position) - Number(b.position));
}

export function OmShell({
  data,
  initialView,
}: {
  data: OmErrorsBootstrap;
  initialView?: ViewMode;
}) {
  const { me } = useTeam();
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(VIEWS).withDefault(initialView ?? "board"),
  );
  const [items, applyOptimistic] = React.useOptimistic(data.items, reducer);
  const [search, setSearch] = React.useState("");
  const [journey, setJourney] = React.useState(ALL);
  const [openId, setOpenId] = React.useState<string | null>(null);
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
    React.startTransition(async () => {
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
    () => [...new Set(items.map((e) => e.handledBy).filter((h): h is string => !!h))],
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((e) => {
      if (journey !== ALL) {
        const key = e.journeyId ?? SEM_JORNADA;
        if (key !== journey) return false;
      }
      if (!q) return true;
      return [e.symptom, e.detail, e.handledBy, e.defectId].some((t) =>
        t?.toLowerCase().includes(q),
      );
    });
  }, [items, journey, search]);

  const open = openId ? (items.find((e) => e.id === openId) ?? null) : null;

  /** Registro rápido: só o sintoma, entra no fim do Backlog. */
  const quickAdd = () => {
    const symptom = draft.trim();
    if (!symptom) return;
    if (!me) {
      toast.error("Escolha quem você é no topo para escrever");
      return;
    }
    const now = new Date();
    const last = items
      .filter((e) => e.status === "backlog")
      .reduce((max, e) => Math.max(max, Number(e.position)), 0);
    const item: OmError = {
      id: crypto.randomUUID(),
      symptom,
      detail: null,
      journeyId: null,
      status: "backlog",
      handledBy: null,
      defectId: null,
      fixedAt: null,
      position: (last + 1000).toString(),
      createdAt: now,
      createdById: me.id,
      updatedAt: now,
      updatedById: me.id,
    };
    mutate({ op: "upsert", item }, () =>
      createOmError({ id: item.id, symptom }),
    );
    setDraft("");
    draftRef.current?.focus();
  };

  const move = (m: OmMove) => {
    const current = items.find((e) => e.id === m.id);
    if (!current) return;
    const item: OmError = {
      ...current,
      status: m.status,
      position: m.position,
      updatedAt: new Date(),
      updatedById: me?.id ?? null,
    };
    mutate({ op: "upsert", item }, () =>
      moveOmError({
        id: m.id,
        status: m.status,
        beforeId: m.beforeId,
        afterId: m.afterId,
      }),
    );
  };

  const save = (values: OmErrorValues) => {
    if (!open) return;
    const item: OmError = {
      ...open,
      ...values,
      updatedAt: new Date(),
      updatedById: me?.id ?? null,
    };
    mutate({ op: "upsert", item }, () =>
      updateOmError({ ...values, id: open.id }),
    );
  };

  const remove = () => {
    if (!open) return;
    if (!confirm(`Excluir "${open.symptom.slice(0, 60)}"?`)) return;
    const id = open.id;
    setOpenId(null);
    mutate({ op: "delete", id }, () => deleteOmError(id));
  };

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <div
        className={cn(
          "animate-fade-in mx-auto w-full",
          view === "list" ? "max-w-[1100px]" : "max-w-[1400px]",
        )}
      >
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Kanban OM</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Os erros do OM e em que pé está cada um.
          </p>
        </header>

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
            placeholder="Qual erro apareceu? (Enter põe no Backlog, o resto você completa depois)"
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
              placeholder="Buscar erro, defeito ou responsável…"
              className="pl-9"
            />
          </div>

          <div className="ml-auto flex rounded-md bg-[var(--color-muted)] p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "rounded px-3 py-1 text-sm transition",
                  view === v
                    ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                {v === "list" ? "Lista" : "Quadro"}
              </button>
            ))}
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
        </div>

        {view === "list" ? (
          <OmList
            items={filtered}
            journeys={data.journeys}
            onCardClick={(error) => setOpenId(error.id)}
            onMove={move}
          />
        ) : (
          <OmBoard
            items={filtered}
            journeys={data.journeys}
            onCardClick={(error) => setOpenId(error.id)}
            onMove={move}
          />
        )}

        <OmDialog
          open={!!open}
          onOpenChange={(v) => !v && setOpenId(null)}
          error={open}
          journeys={data.journeys}
          handlers={handlers}
          onSave={save}
          onDelete={remove}
        />
      </div>
    </div>
  );
}
