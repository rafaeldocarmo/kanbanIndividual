"use server";

import { db } from "@/db/client";
import {
  activities,
  activityAssignees,
  activityComments,
  activityStatusUpdates,
} from "@/db/schema";
import { CACHE_TAGS, getStages, nextPositionForStage } from "@/db/queries";
import { getCurrentUserId } from "@/lib/current-user";
import { DONE_STAGE } from "@/lib/team";
import {
  activityInput,
  assigneeIds,
  assignInput,
  blockedByInput,
  commentInput,
  statusUpdateInput,
} from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };
type Stmt = BatchItem<"pg">;

/** Executa os comandos numa única ida ao banco, de forma atômica. */
async function runAll(stmts: Stmt[]) {
  if (stmts.length > 0) await db.batch(stmts as [Stmt, ...Stmt[]]);
}

/** Substitui o conjunto de responsáveis da atividade. */
function setAssigneesStmts(activityId: string, ids: string[]): Stmt[] {
  const clear = db
    .delete(activityAssignees)
    .where(eq(activityAssignees.activityId, activityId));
  if (ids.length === 0) return [clear];
  return [
    clear,
    db
      .insert(activityAssignees)
      .values(ids.map((assigneeId) => ({ activityId, assigneeId }))),
  ];
}

async function assigneesOf(activityId: string) {
  const rows = await db
    .select({ id: activityAssignees.assigneeId })
    .from(activityAssignees)
    .where(eq(activityAssignees.activityId, activityId));
  return rows.map((r) => r.id);
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

async function isDoneStage(stageId: string) {
  const stages = await getStages();
  return stages.find((s) => s.name === DONE_STAGE)?.id === stageId;
}

/**
 * `completed_at` para um update que define a etapa: carimba ao entrar em
 * "Concluído", mantém se já estava lá e limpa ao sair.
 */
async function completedAtFor(toStageId: string) {
  if (!(await isDoneStage(toStageId))) return null;
  return sql`case when ${activities.stageId} is distinct from ${toStageId} then now() else ${activities.completedAt} end`;
}

/** Invalida o cache de atividades e atualiza a rota do Kanban. */
function revalidateActivities() {
  revalidateTag(CACHE_TAGS.activities);
  revalidatePath("/");
}

export async function createActivity(input: unknown): Promise<ActionResult> {
  const parsed = activityInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const [position, me, done] = await Promise.all([
    nextPositionForStage(parsed.data.stageId),
    getCurrentUserId(),
    isDoneStage(parsed.data.stageId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  // Id gerado aqui para gravar atividade, responsáveis e status num lote só.
  const id = crypto.randomUUID();
  const stmts: Stmt[] = [
    db.insert(activities).values({
      id,
      name: parsed.data.name,
      dueDate: today,
      stageId: parsed.data.stageId,
      journeyId: parsed.data.journeyId ?? null,
      priority: parsed.data.priority,
      position: position.toString(),
      updatedById: me,
      completedAt: done ? new Date() : null,
    }),
    ...setAssigneesStmts(id, parsed.data.assigneeIds).slice(1),
  ];
  if (parsed.data.initialStatus && parsed.data.initialStatus.trim()) {
    stmts.push(
      db.insert(activityStatusUpdates).values({
        activityId: id,
        content: parsed.data.initialStatus.trim(),
      }),
    );
  }
  await runAll(stmts);

  revalidateActivities();
  return { ok: true };
}

const updateSchema = activityInput.extend({ id: z.string().uuid() });

export async function updateActivity(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const [me, completedAt] = await Promise.all([
    getCurrentUserId(),
    completedAtFor(parsed.data.stageId),
  ]);
  await runAll([
    db
      .update(activities)
      .set({
        name: parsed.data.name,
        stageId: parsed.data.stageId,
        journeyId: parsed.data.journeyId ?? null,
        priority: parsed.data.priority,
        updatedAt: new Date(),
        updatedById: me,
        completedAt,
      })
      .where(eq(activities.id, parsed.data.id)),
    ...setAssigneesStmts(parsed.data.id, parsed.data.assigneeIds),
  ]);

  if (parsed.data.initialStatus && parsed.data.initialStatus.trim()) {
    await db.insert(activityStatusUpdates).values({
      activityId: parsed.data.id,
      content: parsed.data.initialStatus.trim(),
    });
  }

  revalidateActivities();
  return { ok: true };
}

export async function addStatusUpdate(input: unknown): Promise<ActionResult> {
  const parsed = statusUpdateInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  await db.insert(activityStatusUpdates).values({
    activityId: parsed.data.activityId,
    content: parsed.data.content,
  });
  await touchActivity(parsed.data.activityId);
  revalidateActivities();
  return { ok: true };
}

/** Marca o item como atualizado agora, por quem está usando o app. */
async function touchActivity(id: string) {
  await db
    .update(activities)
    .set({ updatedAt: new Date(), updatedById: await getCurrentUserId() })
    .where(eq(activities.id, id));
}

export async function deleteStatusUpdate(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(activityStatusUpdates).where(eq(activityStatusUpdates.id, id));
  revalidateActivities();
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(activities).where(eq(activities.id, id));
  revalidateActivities();
  return { ok: true };
}

export async function duplicateActivity(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  const [src] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);
  if (!src) return { ok: false, error: "Atividade não encontrada" };
  const [position, me, done, srcAssignees] = await Promise.all([
    nextPositionForStage(src.stageId),
    getCurrentUserId(),
    isDoneStage(src.stageId),
    assigneesOf(src.id),
  ]);
  const copyId = crypto.randomUUID();
  await runAll([
    db.insert(activities).values({
      id: copyId,
      name: `${src.name} (cópia)`,
      dueDate: src.dueDate,
      stageId: src.stageId,
      journeyId: src.journeyId,
      priority: src.priority,
      position: position.toString(),
      updatedById: me,
      completedAt: done ? new Date() : null,
    }),
    ...setAssigneesStmts(copyId, srcAssignees).slice(1),
  ]);

  revalidateActivities();
  return { ok: true };
}

const moveSchema = z.object({
  id: z.string().uuid(),
  toStageId: z.string().uuid().optional(),
  toJourneyId: z.string().uuid().nullable().optional(),
  toAssigneeIds: assigneeIds.optional(),
  beforeId: z.string().uuid().optional().nullable(),
  afterId: z.string().uuid().optional().nullable(),
});

export async function moveActivity(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Movimento inválido" };
  }
  const { id, toStageId, toJourneyId, toAssigneeIds, beforeId, afterId } =
    parsed.data;

  const [beforeRow, afterRow, currentRow] = await Promise.all([
    beforeId
      ? db
          .select({ position: activities.position })
          .from(activities)
          .where(eq(activities.id, beforeId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
    afterId
      ? db
          .select({ position: activities.position })
          .from(activities)
          .where(eq(activities.id, afterId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
    toStageId
      ? Promise.resolve([] as { stageId: string }[])
      : db
          .select({ stageId: activities.stageId })
          .from(activities)
          .where(eq(activities.id, id))
          .limit(1),
  ]);

  const beforePos = beforeRow[0]?.position ? Number(beforeRow[0].position) : null;
  const afterPos = afterRow[0]?.position ? Number(afterRow[0].position) : null;
  const stageForPos = toStageId ?? currentRow[0]?.stageId;

  let newPos: number;
  if (beforePos !== null && afterPos !== null) {
    newPos = (beforePos + afterPos) / 2;
  } else if (beforePos !== null) {
    newPos = beforePos + 1000;
  } else if (afterPos !== null) {
    newPos = afterPos - 1000;
  } else if (stageForPos) {
    newPos = await nextPositionForStage(stageForPos);
  } else {
    newPos = 1000;
  }

  const updates: Record<string, unknown> = { position: newPos.toString() };
  // Só reordenar dentro da mesma coluna não conta como atualização: o
  // "há X dias" mede item parado, e mudar a ordem não o faz andar.
  const changed: SQL[] = [];
  if (toStageId !== undefined) {
    updates.stageId = toStageId;
    updates.completedAt = await completedAtFor(toStageId);
    changed.push(sql`${activities.stageId} is distinct from ${toStageId}`);
  }
  if (toJourneyId !== undefined) {
    updates.journeyId = toJourneyId;
    changed.push(sql`${activities.journeyId} is distinct from ${toJourneyId}`);
  }
  // Responsáveis: arrastar entre raias/grupos de pessoa troca o conjunto.
  const assigneesChanged =
    toAssigneeIds !== undefined && !sameSet(await assigneesOf(id), toAssigneeIds);
  if (assigneesChanged || changed.length > 0) {
    const me = await getCurrentUserId();
    if (assigneesChanged) {
      updates.updatedAt = new Date();
      updates.updatedById = me;
    } else {
      const anyChange = sql.join(changed, sql` or `);
      updates.updatedAt = sql`case when ${anyChange} then now() else ${activities.updatedAt} end`;
      updates.updatedById = sql`case when ${anyChange} then ${me}::uuid else ${activities.updatedById} end`;
    }
  }

  await runAll([
    db.update(activities).set(updates).where(eq(activities.id, id)),
    ...(assigneesChanged && toAssigneeIds
      ? setAssigneesStmts(id, toAssigneeIds)
      : []),
  ]);

  revalidateActivities();
  return { ok: true };
}

/**
 * Define os responsáveis (handoff em 1 clique, adicionar ou remover alguém)
 * sem mexer na posição.
 */
export async function assignActivity(input: unknown): Promise<ActionResult> {
  const parsed = assignInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Responsável inválido" };
  await runAll([
    db
      .update(activities)
      .set({ updatedAt: new Date(), updatedById: await getCurrentUserId() })
      .where(eq(activities.id, parsed.data.id)),
    ...setAssigneesStmts(parsed.data.id, parsed.data.assigneeIds),
  ]);
  revalidateActivities();
  return { ok: true };
}

export async function setBlockedBy(input: unknown): Promise<ActionResult> {
  const parsed = blockedByInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bloqueio inválido" };
  await db
    .update(activities)
    .set({
      blockedBy: parsed.data.blockedBy,
      updatedAt: new Date(),
      updatedById: await getCurrentUserId(),
    })
    .where(eq(activities.id, parsed.data.id));
  revalidateActivities();
  return { ok: true };
}

const NO_IDENTITY = "Escolha quem você é no topo para comentar";

export async function addComment(input: unknown): Promise<ActionResult> {
  const parsed = commentInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db.insert(activityComments).values({
    activityId: parsed.data.activityId,
    authorId: me,
    content: parsed.data.content,
  });
  await touchActivity(parsed.data.activityId);
  revalidateActivities();
  return { ok: true };
}

/** Cada um apaga só o próprio comentário. */
export async function deleteComment(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db
    .delete(activityComments)
    .where(and(eq(activityComments.id, id), eq(activityComments.authorId, me)));
  revalidateActivities();
  return { ok: true };
}
