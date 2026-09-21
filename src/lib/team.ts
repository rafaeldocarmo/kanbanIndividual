import type { ActivityView } from "@/lib/types";

/** Cookie com o id do responsável que está usando o app ("Você é"). */
export const ME_COOKIE = "kb_me";

export const BACKLOG_STAGE = "Backlog";
export const IN_PROGRESS_STAGE = "Em Andamento";
export const DONE_STAGE = "Concluído";

/** Acima disso, a pessoa aparece em âmbar na faixa de carga. */
export const WIP_LIMIT = 3;

const STALE_WARN_DAYS = 5;
const STALE_ALERT_DAYS = 10;
const DAY_MS = 86_400_000;

/**
 * Matizes dos avatares (OKLCH). Mesma luminosidade e croma para todos — só o
 * matiz varia. Evita a faixa vermelho→âmbar, reservada para alertas.
 */
const AVATAR_HUES = [255, 150, 310, 205, 280, 175];

export function avatarHue(teamIndex: number) {
  return AVATAR_HUES[teamIndex % AVATAR_HUES.length];
}

export type Staleness = { days: number; level: "warn" | "alert" };

/**
 * "Sem atualização há X dias": só a partir de 5 dias (âmbar) e 10 (vermelho).
 * Backlog e Concluído ficam de fora — parados por definição.
 */
export function staleness(
  a: Pick<ActivityView, "stageName" | "updatedAt">,
  now: number,
): Staleness | null {
  if (a.stageName === BACKLOG_STAGE || a.stageName === DONE_STAGE) return null;
  const days = Math.floor((now - new Date(a.updatedAt).getTime()) / DAY_MS);
  if (days < STALE_WARN_DAYS) return null;
  return { days, level: days >= STALE_ALERT_DAYS ? "alert" : "warn" };
}

/** "Minhas": atribuídas a mim ou travadas esperando por mim. */
export function isMine(
  a: Pick<ActivityView, "assigneeId" | "blockedBy">,
  me: { id: string; name: string },
) {
  return a.assigneeId === me.id || a.blockedBy === me.name;
}
