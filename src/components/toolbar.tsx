"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GroupBy, ViewMode } from "@/lib/types";

type Props = {
  search: string;
  onSearchChange: (s: string) => void;
  group: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
};

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 text-sm transition",
        active
          ? "bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
      )}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  search,
  onSearchChange,
  group,
  onGroupChange,
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
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          ref={searchRef}
          placeholder="Buscar atividade…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
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
