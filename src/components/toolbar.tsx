"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Sun, Moon, StickyNote, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const { theme, setTheme } = useTheme();
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
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
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

        <Button variant="ghost" size="icon" asChild aria-label="Notas & Lembretes">
          <Link href="/notas" title="Notas & Lembretes">
            <StickyNote className="h-4 w-4" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="Queries">
          <Link href="/queries" title="Queries">
            <Database className="h-4 w-4" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
