"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useTeam } from "@/components/team/team-provider";
import { Isolate } from "@/components/team/assignee-picker";
import { useActivitiesContext } from "@/components/app-shell";
import { setBlockedBy } from "@/app/actions/activities";
import type { ActivityView } from "@/lib/types";

/**
 * Itens do menu "Bloqueado por": a equipe (menos o próprio responsável),
 * externos já usados e um campo para um externo novo. Serve tanto no menu do
 * selo quanto no submenu "…" da linha. `onDone` fecha o menu após o campo.
 */
export function BlockedByItems({
  activity,
  onDone,
}: {
  activity: ActivityView;
  onDone: () => void;
}) {
  const { team } = useTeam();
  const { activities, mutate } = useActivitiesContext();
  const [external, setExternal] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const set = (value: string | null) => {
    if (value === activity.blockedBy) return;
    mutate(
      { type: "patch", id: activity.id, patch: { blockedBy: value } },
      () => setBlockedBy({ id: activity.id, blockedBy: value }),
    );
  };

  // Externos recentes (quem não é da equipe), mais usados primeiro.
  const externals = React.useMemo(() => {
    const names = new Set(team.map((m) => m.name));
    const freq = new Map<string, number>();
    for (const a of activities) {
      if (a.blockedBy && !names.has(a.blockedBy)) {
        freq.set(a.blockedBy, (freq.get(a.blockedBy) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
  }, [activities, team]);

  const check = (name: string) =>
    activity.blockedBy === name && (
      <Check className="ml-auto h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
    );

  return (
    <>
      {activity.blockedBy && (
        <>
          <DropdownMenuItem onSelect={() => set(null)}>
            Desbloquear
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuLabel>Bloqueado por</DropdownMenuLabel>
      {team
        .filter((m) => !activity.assigneeIds.includes(m.id))
        .map((m) => (
          <DropdownMenuItem key={m.id} onSelect={() => set(m.name)}>
            <Avatar initials={m.initials} hue={m.hue} size={20} />
            {m.name}
            {check(m.name)}
          </DropdownMenuItem>
        ))}
      {externals.map((name) => (
        <DropdownMenuItem key={name} onSelect={() => set(name)}>
          <span className="w-5" />
          {name}
          {check(name)}
        </DropdownMenuItem>
      ))}
      {/* Item de menu (alcançável pelas setas) que só entrega o foco ao campo.
          Sem os preventDefault, o Radix tiraria o foco do campo ao mover o mouse. */}
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onPointerMove={(e) => e.preventDefault()}
        onPointerLeave={(e) => e.preventDefault()}
        className="px-1 pb-1 pt-1.5 focus:bg-transparent"
      >
        <input
          ref={inputRef}
          value={external}
          onChange={(e) => setExternal(e.target.value)}
          onKeyDown={(e) => {
            // Esc fecha o menu; o resto não pode chegar ao item/menu
            // (typeahead, setas e Espaço/Enter como "selecionar").
            if (e.key === "Escape") return;
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              const v = external.trim();
              if (!v) return;
              set(v);
              setExternal("");
              onDone();
            }
          }}
          maxLength={80}
          placeholder="Externo… (Enter)"
          aria-label="Bloqueado por alguém de fora da equipe"
          className="h-8 w-full rounded-md border border-[var(--color-input)] bg-transparent px-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        />
      </DropdownMenuItem>
    </>
  );
}

/**
 * Selo discreto "bloq. <nome>" — clicar abre o menu para trocar ou
 * desbloquear. Com `placeholder`, mostra "Bloqueio" quando não há bloqueio
 * (usado no detalhe do item).
 */
export function BlockedByControl({
  activity,
  placeholder = false,
}: {
  activity: ActivityView;
  placeholder?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  if (!activity.blockedBy && !placeholder) return null;

  return (
    <Isolate>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {activity.blockedBy ? (
            <button
              type="button"
              title={`Bloqueado por ${activity.blockedBy}`}
              className="inline-flex min-w-0 max-w-[11rem] shrink items-center rounded px-1.5 py-0.5 text-xs font-medium text-[var(--color-danger)] transition bg-[color-mix(in_srgb,var(--color-danger)_9%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)]"
            >
              <span className="truncate">bloq. {activity.blockedBy}</span>
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
            >
              <Plus className="h-3 w-3" />
              Bloqueio
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <BlockedByItems activity={activity} onDone={() => setOpen(false)} />
        </DropdownMenuContent>
      </DropdownMenu>
    </Isolate>
  );
}
