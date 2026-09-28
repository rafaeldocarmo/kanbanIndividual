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

const RECENT_DONE_MS = DAY_MS;

/** Concluído nas últimas 24h (janela móvel, não "hoje"). */
export function isRecentlyDone(
  a: Pick<ActivityView, "stageName" | "completedAt">,
  now: number,
) {
  return (
    a.stageName === DONE_STAGE &&
    !!a.completedAt &&
    now - new Date(a.completedAt).getTime() < RECENT_DONE_MS
  );
}

/** Tempo curto desde a conclusão: "agora", "há 25 min", "há 3 h". */
export function completedAgo(completedAt: Date, now: number) {
  const min = Math.floor((now - new Date(completedAt).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

/**
 * `completedAt` depois de uma troca de etapa: carimba ao entrar em
 * "Concluído", limpa ao sair e mantém se a etapa não mudou.
 */
export function completionAfter(
  prev: Pick<ActivityView, "stageId" | "completedAt">,
  next: Pick<ActivityView, "stageId" | "stageName">,
): Date | null {
  if (next.stageId === prev.stageId) return prev.completedAt;
  return next.stageName === DONE_STAGE ? new Date() : null;
}

/** "Minhas": sou um dos responsáveis ou o item está travado esperando por mim. */
export function isMine(
  a: Pick<ActivityView, "assigneeIds" | "blockedBy">,
  me: { id: string; name: string },
) {
  return a.assigneeIds.includes(me.id) || a.blockedBy === me.name;
}

/**
 * Responsáveis depois de mover o item da raia/grupo de `from` para `to`
 * (null = "Sem responsável"): sai quem estava na origem, entra o destino.
 * Soltar em "Sem responsável" tira todo mundo.
 */
export function reassignedIds(
  ids: string[],
  from: string | null,
  to: string | null,
): string[] {
  if (to === null) return [];
  const rest = from === null ? [] : ids.filter((id) => id !== from);
  return rest.includes(to) ? rest : [...rest, to];
}
