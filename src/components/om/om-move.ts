import { arrayMove } from "@dnd-kit/sortable";
import { OM_ERROR_STATUSES } from "@/lib/types";
import { positionBetween } from "@/lib/utils";
import type { OmError, OmErrorStatus } from "@/db/schema";

/**
 * Conta do arraste, compartilhada pelo quadro e pela lista: as duas visões
 * movem o mesmo cartão entre as mesmas colunas.
 */

export type OmMove = {
  id: string;
  status: OmErrorStatus;
  position: string;
  beforeId: string | null;
  afterId: string | null;
};

/** O que está embaixo do cursor: uma coluna/grupo ou outro cartão. */
export type OverInfo = { id: string; type?: string; status?: string };

export function groupByStatus(items: OmError[]) {
  const map = new Map<OmErrorStatus, OmError[]>();
  for (const s of OM_ERROR_STATUSES) map.set(s.id, []);
  for (const e of items) map.get(e.status)?.push(e);
  return map;
}

export function statusOfOver(
  items: OmError[],
  over: OverInfo,
): OmErrorStatus | undefined {
  if (over.type === "column") return over.status as OmErrorStatus;
  return items.find((e) => e.id === over.id)?.status;
}

/**
 * Onde o cartão cai. `effective` já inclui a pré-visualização do arraste;
 * `original` é o estado real. Devolve null quando nada muda.
 */
export function resolveMove(
  effective: OmError[],
  original: OmError,
  over: OverInfo,
): OmMove | null {
  const status = statusOfOver(effective, over);
  if (!status) return null;

  const shown = groupByStatus(effective).get(status) ?? [];
  const oldIndex = shown.findIndex((e) => e.id === original.id);
  const overIndex =
    over.type === "column"
      ? shown.length - 1
      : shown.findIndex((e) => e.id === over.id);

  let final: OmError[];
  if (oldIndex >= 0) {
    final = overIndex >= 0 ? arrayMove(shown, oldIndex, overIndex) : shown;
  } else {
    const at =
      over.type === "column" || overIndex < 0 ? shown.length : overIndex;
    final = [...shown.slice(0, at), original, ...shown.slice(at)];
  }

  const idx = final.findIndex((e) => e.id === original.id);
  if (original.status === status && idx === oldIndex) return null;

  const before = final[idx - 1] ?? null;
  const after = final[idx + 1] ?? null;
  return {
    id: original.id,
    status,
    position: positionBetween(before, after).toString(),
    beforeId: before?.id ?? null,
    afterId: after?.id ?? null,
  };
}
