"use client";

import { Avatar } from "@/components/ui/badge";
import { useTeam } from "@/components/team/team-provider";
import { cn } from "@/lib/utils";

/**
 * Escolha de um ou mais responsáveis: um botão por pessoa, que liga/desliga.
 * Compacto (só avatares) no QuickAdd; com nomes no formulário de edição.
 */
export function PeopleToggle({
  value,
  onChange,
  showNames = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  showNames?: boolean;
}) {
  const { team } = useTeam();
  const toggle = (id: string) => {
    const next = value.includes(id)
      ? value.filter((x) => x !== id)
      : [...value, id];
    onChange(team.filter((m) => next.includes(m.id)).map((m) => m.id));
  };

  return (
    <div role="group" aria-label="Responsáveis" className="flex flex-wrap gap-1">
      {team.map((m) => {
        const on = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            aria-pressed={on}
            title={m.name}
            className={cn(
              "flex items-center gap-1.5 rounded-full p-0.5 text-sm transition",
              showNames && "pr-2.5",
              on
                ? "bg-[var(--color-card)] ring-1 ring-[var(--color-ring)]"
                : "opacity-45 hover:opacity-80",
            )}
          >
            <Avatar initials={m.initials} hue={m.hue} size={22} />
            {showNames && <span>{m.name}</span>}
          </button>
        );
      })}
    </div>
  );
}
