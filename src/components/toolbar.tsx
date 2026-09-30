"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import type { GroupBy, Lanes, Scope, ViewMode } from "@/lib/types";
import type { Stage } from "@/db/schema";

type Props = {
  search: string;
  onSearchChange: (s: string) => void;
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  canFilterMine: boolean;
  stages: Stage[];
  /** Etapas escondidas (ficam fora da lista, do quadro e da busca). */
  hiddenStages: string[];
  onHiddenStagesChange: (ids: string[]) => void;
  group: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  lanes: Lanes;
  onLanesChange: (l: Lanes) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
};

function SegButton({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded px-3 py-1 text-sm transition disabled:opacity-50",
        active
          ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
          : "text-[var(--color-muted-foreground)] enabled:hover:text-[var(--color-foreground)]",
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  search,
  onSearchChange,
  scope,
  onScopeChange,
  canFilterMine,
  stages,
  hiddenStages,
  onHiddenStagesChange,
  group,
  onGroupChange,
  lanes,
  onLanesChange,
  view,
  onViewChange,
}: Props) {
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="relative min-w-[14rem] flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          ref={searchRef}
          placeholder="Buscar atividade…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex rounded-md bg-[var(--color-muted)] p-0.5">
        <SegButton
          active={scope === "mine"}
          onClick={() => onScopeChange("mine")}
          disabled={!canFilterMine}
          title={
            canFilterMine
              ? "Atribuídas a você ou esperando por você"
              : "Escolha quem você é no topo"
          }
        >
          Minhas
        </SegButton>
        <SegButton
          active={scope === "team"}
          onClick={() => onScopeChange("team")}
        >
          Da equipe
        </SegButton>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Mostrar só algumas etapas"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition hover:bg-[var(--color-muted)]",
              hiddenStages.length > 0
                ? "text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            Status
            {hiddenStages.length > 0 && (
              <span className="tabular-nums">
                {stages.length - hiddenStages.length}/{stages.length}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[12rem]">
          {stages.map((s) => (
            <DropdownMenuCheckboxItem
              key={s.id}
              checked={!hiddenStages.includes(s.id)}
              // Sem fechar: dá para ligar/desligar várias de uma vez.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) =>
                onHiddenStagesChange(
                  on
                    ? hiddenStages.filter((id) => id !== s.id)
                    : [...hiddenStages, s.id],
                )
              }
            >
              {s.name}
            </DropdownMenuCheckboxItem>
          ))}
          {hiddenStages.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onHiddenStagesChange([])}>
                Mostrar todas
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-4">
        {view === "board" ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span>Raias</span>
            <div className="flex rounded-md bg-[var(--color-muted)] p-0.5">
              <SegButton
                active={lanes === "none"}
                onClick={() => onLanesChange("none")}
              >
                Nenhuma
              </SegButton>
              <SegButton
                active={lanes === "person"}
                onClick={() => onLanesChange("person")}
              >
                Por pessoa
              </SegButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span>Agrupar</span>
            <div className="flex rounded-md bg-[var(--color-muted)] p-0.5">
              <SegButton
                active={group === "status"}
                onClick={() => onGroupChange("status")}
              >
                Status
              </SegButton>
              <SegButton
                active={group === "journey"}
                onClick={() => onGroupChange("journey")}
              >
                Jornada
              </SegButton>
              <SegButton
                active={group === "assignee"}
                onClick={() => onGroupChange("assignee")}
              >
                Responsável
              </SegButton>
            </div>
          </div>
        )}

        <div className="flex rounded-md bg-[var(--color-muted)] p-0.5">
          <SegButton active={view === "list"} onClick={() => onViewChange("list")}>
            Lista
          </SegButton>
          <SegButton
            active={view === "board"}
            onClick={() => onViewChange("board")}
          >
            Quadro
          </SegButton>
        </div>
      </div>
    </div>
  );
}
