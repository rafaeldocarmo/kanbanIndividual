"use server";

import { db } from "@/db/client";
import { omErrors } from "@/db/schema";
import { CACHE_TAGS, nextPositionForOmStatus } from "@/db/queries";
import { getCurrentUserId } from "@/lib/current-user";
import { omAssignInput, omErrorInput, omMoveInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const NO_IDENTITY = "Escolha quem você é no topo para escrever";

function revalidateOmErrors() {
  revalidateTag(CACHE_TAGS.omErrors);
  revalidatePath("/om");
}

const createSchema = z.object({
  id: z.string().uuid(),
  symptom: z.string().trim().min(1, "Descreva o erro").max(300),
});

/** Registro rápido: só o sintoma, entra no fim do Backlog. */
export async function createOmError(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const [me, position] = await Promise.all([
    getCurrentUserId(),
    nextPositionForOmStatus("backlog"),
  ]);
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db.insert(omErrors).values({
    id: parsed.data.id,
    symptom: parsed.data.symptom,
    position: position.toString(),
    // Quem registra acompanha, até passar para outra pessoa.
    assigneeId: me,
    createdById: me,
    updatedById: me,
  });
  revalidateOmErrors();
  return { ok: true };
}

const updateSchema = omErrorInput.extend({ id: z.string().uuid() });

export async function updateOmError(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  const { id, ...values } = parsed.data;
  await db
    .update(omErrors)
    .set({ ...values, updatedAt: new Date(), updatedById: me })
    .where(eq(omErrors.id, id));
  revalidateOmErrors();
  return { ok: true };
}

/** Trocar o responsável sem abrir o formulário. */
export async function assignOmError(input: unknown): Promise<ActionResult> {
  const parsed = omAssignInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Responsável inválido" };
  await db
    .update(omErrors)
    .set({
      assigneeId: parsed.data.assigneeId,
      updatedAt: new Date(),
      updatedById: await getCurrentUserId(),
    })
    .where(eq(omErrors.id, parsed.data.id));
  revalidateOmErrors();
  return { ok: true };
}

/**
 * Arrastar no quadro: muda a coluna e a ordem. A posição sai do meio entre os
 * vizinhos (fractional indexing), como nas atividades.
 */
export async function moveOmError(input: unknown): Promise<ActionResult> {
  const parsed = omMoveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Movimento inválido" };
  const { id, status, beforeId, afterId } = parsed.data;

  const [me, beforeRow, afterRow] = await Promise.all([
    getCurrentUserId(),
    beforeId
      ? db
          .select({ position: omErrors.position })
          .from(omErrors)
          .where(eq(omErrors.id, beforeId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
    afterId
      ? db
          .select({ position: omErrors.position })
          .from(omErrors)
          .where(eq(omErrors.id, afterId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
  ]);
  // Arrastar não exige identidade, como no Kanban principal: quem passou pelo
  // quadro sem escolher o nome ainda consegue organizar as colunas.

  const before = beforeRow[0]?.position ? Number(beforeRow[0].position) : null;
  const after = afterRow[0]?.position ? Number(afterRow[0].position) : null;

  let position: number;
  if (before !== null && after !== null) position = (before + after) / 2;
  else if (before !== null) position = before + 1000;
  else if (after !== null) position = after - 1000;
  else position = await nextPositionForOmStatus(status);

  await db
    .update(omErrors)
    .set({
      status,
      position: position.toString(),
      updatedAt: new Date(),
      updatedById: me,
    })
    .where(eq(omErrors.id, id));
  revalidateOmErrors();
  return { ok: true };
}

export async function deleteOmError(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(omErrors).where(eq(omErrors.id, id));
  revalidateOmErrors();
  return { ok: true };
}
