"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useTeam } from "@/components/team/team-provider";
import { useActivitiesContext } from "@/components/app-shell";
import { assignActivity } from "@/app/actions/activities";
import type { ActivityView } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Isola cliques e teclas de um menu embutido: não abrem o detalhe do item nem
 * iniciam o arraste do cartão (o Radix renderiza em portal, mas os eventos
 * sintéticos ainda sobem pela árvore React).
 */
export function Isolate({ children }: { children: React.ReactNode }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <span
      className="contents"
      onPointerDown={stop}
      onClick={stop}
      onKeyDown={stop}
    >
      {children}
    </span>
  );
}

export function PersonAvatar({
  id,
  size = 24,
  className,
}: {
  id: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const { member } = useTeam();
  const m = member(id);
  return m ? (
    <Avatar
      initials={m.initials}
      hue={m.hue}
      size={size}
      title={m.name}
      className={className}
    />
  ) : (
    <Avatar size={size} title="Sem responsável" className={className} />
  );
}

/**
 * Avatares sobrepostos dos responsáveis, cada um com a sua cor. `reserve`
 * reserva largura para N avatares, alinhando os títulos entre linhas.
 */
export function AvatarStack({
  ids,
  size = 24,
  reserve = 1,
  max = 3,
}: {
  ids: string[];
  size?: number;
  reserve?: number;
  max?: number;
}) {
  const { member } = useTeam();
  const people = ids.map((id) => member(id)).filter((m) => m !== null);
  // Sobreposição leve: as iniciais continuam legíveis (Rafael/Ricardo são "R…").
  const step = Math.round(size * 0.8);
  const minWidth = size + (reserve - 1) * step;
  if (people.length === 0) {
    return (
      <span className="inline-flex" style={{ minWidth }}>
        <Avatar size={size} title="Sem responsável" />
      </span>
    );
  }
  const shown = people.length > max ? people.slice(0, max - 1) : people;
  const extra = people.length - shown.length;
  return (
    <span
      className="inline-flex items-center"
      style={{ minWidth }}
      title={people.map((m) => m.name).join(", ")}
    >
      {shown.map((m, i) => (
        <Avatar
          key={m.id}
          initials={m.initials}
          hue={m.hue}
          size={size}
          // Anel na cor do fundo separa os avatares sobrepostos.
          className="ring-2 ring-[var(--color-card)]"
          style={i > 0 ? { marginLeft: step - size } : undefined}
        />
      ))}
      {extra > 0 && (
        <Avatar
          initials={`+${extra}`}
          size={size}
          className="border-none bg-[var(--color-muted)] ring-2 ring-[var(--color-card)]"
          style={{ marginLeft: step - size }}
        />
      )}
    </span>
  );
}

/**
 * Responsáveis direto na linha/cartão. Clicar no nome = handoff em 1 clique
 * (fica só essa pessoa); o botão ao lado adiciona ou remove sem trocar.
 */
export function AssigneePicker({
  activity,
  size = 24,
  reserve = 1,
}: {
  activity: ActivityView;
  size?: number;
  reserve?: number;
}) {
  const { team, me } = useTeam();
  const { mutate } = useActivitiesContext();
  const ids = activity.assigneeIds;
  const names = team.filter((m) => ids.includes(m.id)).map((m) => m.name);

  const setIds = (next: string[]) => {
    // Sempre na ordem da equipe.
    const ordered = team.filter((m) => next.includes(m.id)).map((m) => m.id);
    if (ordered.join() === ids.join()) return;
    mutate(
      { type: "patch", id: activity.id, patch: { assigneeIds: ordered } },
      () => assignActivity({ id: activity.id, assigneeIds: ordered }),
    );
  };

  return (
    <Isolate>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Responsáveis: ${names.join(", ") || "ninguém"}. Alterar`}
            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-[var(--color-ring)]/40 data-[state=open]:ring-2 data-[state=open]:ring-[var(--color-ring)]/60"
          >
            <AvatarStack ids={ids} size={size} reserve={reserve} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[13rem]">
          <DropdownMenuLabel>Responsáveis</DropdownMenuLabel>
          {team.map((m) => {
            const assigned = ids.includes(m.id);
            return (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => setIds([m.id])}
                className="pr-1"
              >
                <Avatar initials={m.initials} hue={m.hue} size={20} />
                <span className="flex-1">
                  {m.name}
                  {m.id === me?.id && (
                    <span className="text-[var(--color-muted-foreground)]">
                      {" "}
                      (você)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  // Só o clique para aqui: o pointerdown precisa chegar ao item,
                  // senão o Radix trata o pointerup como seleção (troca).
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIds(
                      assigned
                        ? ids.filter((id) => id !== m.id)
                        : [...ids, m.id],
                    );
                  }}
                  aria-label={
                    assigned ? `Remover ${m.name}` : `Adicionar ${m.name}`
                  }
                  title={assigned ? `Remover ${m.name}` : `Adicionar ${m.name}`}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded transition hover:bg-[var(--color-muted)]",
                    assigned
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {assigned ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              </DropdownMenuItem>
            );
          })}
          <p className="px-2 pb-1 pt-1.5 text-[11px] leading-snug text-[var(--color-muted-foreground)]">
            Clique no nome para trocar · + para somar
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
    </Isolate>
  );
}
