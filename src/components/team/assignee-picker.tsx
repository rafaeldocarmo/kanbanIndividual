"use client";

import * as React from "react";
import { Check } from "lucide-react";
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

/** Handoff em 1 clique: o avatar da linha/cartão abre o menu da equipe. */
export function AssigneePicker({
  activity,
  size = 24,
}: {
  activity: ActivityView;
  size?: number;
}) {
  const { team, me, member } = useTeam();
  const { mutate } = useActivitiesContext();
  const current = member(activity.assigneeId);

  const assign = (id: string) => {
    if (id === activity.assigneeId) return;
    const m = member(id);
    mutate(
      {
        type: "patch",
        id: activity.id,
        patch: {
          assigneeId: id,
          assigneeName: m?.name ?? null,
          assigneeInitials: m?.initials ?? null,
          assigneeColor: m?.color ?? null,
        },
      },
      () => assignActivity({ id: activity.id, assigneeId: id }),
    );
  };

  return (
    <Isolate>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Responsável: ${current?.name ?? "ninguém"}. Trocar`}
            className="shrink-0 rounded-full transition hover:ring-2 hover:ring-[var(--color-ring)]/40 data-[state=open]:ring-2 data-[state=open]:ring-[var(--color-ring)]/60"
          >
            <PersonAvatar id={activity.assigneeId} size={size} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[11rem]">
          <DropdownMenuLabel>Responsável</DropdownMenuLabel>
          {team.map((m) => (
            <DropdownMenuItem key={m.id} onSelect={() => assign(m.id)}>
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
              {m.id === activity.assigneeId && (
                <Check className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Isolate>
  );
}
