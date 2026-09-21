"use client";

import { Check, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useTeam } from "@/components/team/team-provider";
import { cn } from "@/lib/utils";

/** "Você é": quem está usando o app. Define "Minhas" e assina as alterações. */
export function IdentityPicker() {
  const { team, me, setMe } = useTeam();
  if (team.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            !me && "ring-1 ring-[var(--color-border)]",
          )}
        >
          {me ? (
            <>
              <span className="hidden lg:inline">Você é</span>
              <Avatar initials={me.initials} hue={me.hue} size={22} />
              <span className="hidden font-medium text-[var(--color-foreground)] sm:inline">
                {me.name}
              </span>
            </>
          ) : (
            <>
              <Avatar initials="?" size={22} />
              <span className="hidden font-medium text-[var(--color-foreground)] lg:inline">
                Quem é você?
              </span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel>Você é</DropdownMenuLabel>
        {team.map((m) => (
          <DropdownMenuItem key={m.id} onSelect={() => setMe(m.id)}>
            <Avatar initials={m.initials} hue={m.hue} size={20} />
            <span className="flex-1">{m.name}</span>
            {m.id === me?.id && (
              <Check className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
