"use client";

import { Check } from "lucide-react";
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
import { PersonAvatar } from "@/components/team/assignee-picker";

/** Responsável do erro: uma pessoa da equipe, trocada em um clique. */
export function OmAssigneePicker({
  assigneeId,
  onChange,
  size = 24,
}: {
  assigneeId: string | null;
  onChange: (id: string | null) => void;
  size?: number;
}) {
  const { team, me, member } = useTeam();
  const atual = member(assigneeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Responsável: ${atual?.name ?? "ninguém"}. Trocar`}
          className="flex shrink-0 items-center gap-1.5 rounded-full transition hover:ring-2 hover:ring-[var(--color-ring)]/40 data-[state=open]:ring-2 data-[state=open]:ring-[var(--color-ring)]/60"
        >
          <PersonAvatar id={assigneeId} size={size} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        <DropdownMenuLabel>Responsável</DropdownMenuLabel>
        {team.map((m) => (
          <DropdownMenuItem key={m.id} onSelect={() => onChange(m.id)}>
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
            {m.id === assigneeId && (
              <Check className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            )}
          </DropdownMenuItem>
        ))}
        {assigneeId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange(null)}>
              Sem responsável
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
