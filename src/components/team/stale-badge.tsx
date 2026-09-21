"use client";

import { useTeam } from "@/components/team/team-provider";
import { staleness } from "@/lib/team";
import { cn } from "@/lib/utils";
import type { ActivityView } from "@/lib/types";

/** "há Xd" sem atualização: âmbar a partir de 5 dias, vermelho a partir de 10. */
export function StaleBadge({ activity }: { activity: ActivityView }) {
  const { member } = useTeam();
  const s = staleness(activity, Date.now());
  if (!s) return null;
  const by = member(activity.updatedById)?.name;
  return (
    <span
      title={`Sem atualização há ${s.days} dias${by ? ` · última por ${by}` : ""}`}
      className={cn(
        "shrink-0 text-xs font-medium tabular-nums",
        s.level === "alert"
          ? "text-[var(--color-danger)]"
          : "text-[var(--color-warning)]",
      )}
    >
      há {s.days}d
    </span>
  );
}
