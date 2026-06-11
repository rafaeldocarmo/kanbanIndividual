"use server";

import { db } from "@/db/client";
import { activities, activityStatusUpdates } from "@/db/schema";
import { nextPositionForStage } from "@/db/queries";
import { activityInput, statusUpdateInput } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createActivity(input: unknown): Promise<ActionResult> {
  const parsed = activityInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const position = await nextPositionForStage(parsed.data.stageId);
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .insert(activities)
    .values({
      name: parsed.data.name,
      dueDate: today,
      stageId: parsed.data.stageId,
      journeyId: parsed.data.journeyId ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      priority: parsed.data.priority,
      position: position.toString(),
    })
    .returning({ id: activities.id });

  if (parsed.data.initialStatus && parsed.data.initialStatus.trim()) {
    await db.insert(activityStatusUpdates).values({
      activityId: row.id,
      content: parsed.data.initialStatus.trim(),
    });
  }

  revalidatePath("/");
  return { ok: true };
}

const updateSchema = activityInput.extend({ id: z.string().uuid() });

export async function updateActivity(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  await db
    .update(activities)
    .set({
      name: parsed.data.name,
      stageId: parsed.data.stageId,
      journeyId: parsed.data.journeyId ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      priority: parsed.data.priority,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, parsed.data.id));

  if (parsed.data.initialStatus && parsed.data.initialStatus.trim()) {
    await db.insert(activityStatusUpdates).values({
      activityId: parsed.data.id,
      content: parsed.data.initialStatus.trim(),
    });
  }

  revalidatePath("/");
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
  await db
    .update(activities)
    .set({ updatedAt: new Date() })
    .where(eq(activities.id, parsed.data.activityId));
  revalidatePath("/");
  return { ok: true };
}

export async function deleteStatusUpdate(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(activityStatusUpdates).where(eq(activityStatusUpdates.id, id));
  revalidatePath("/");
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(activities).where(eq(activities.id, id));
  revalidatePath("/");
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
  const position = await nextPositionForStage(src.stageId);
  await db.insert(activities).values({
    name: `${src.name} (cópia)`,
    dueDate: src.dueDate,
    stageId: src.stageId,
    journeyId: src.journeyId,
    assigneeId: src.assigneeId,
    priority: src.priority,
    position: position.toString(),
  });

  revalidatePath("/");
  return { ok: true };
}

const moveSchema = z.object({
  id: z.string().uuid(),
  toStageId: z.string().uuid().optional(),
  toJourneyId: z.string().uuid().nullable().optional(),
  toAssigneeId: z.string().uuid().nullable().optional(),
  beforeId: z.string().uuid().optional().nullable(),
  afterId: z.string().uuid().optional().nullable(),
});

export async function moveActivity(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Movimento inválido" };
  }
  const { id, toStageId, toJourneyId, toAssigneeId, beforeId, afterId } =
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

  const updates: Record<string, unknown> = {
    position: newPos.toString(),
    updatedAt: new Date(),
  };
  if (toStageId !== undefined) updates.stageId = toStageId;
  if (toJourneyId !== undefined) updates.journeyId = toJourneyId;
  if (toAssigneeId !== undefined) updates.assigneeId = toAssigneeId;

  await db.update(activities).set(updates).where(eq(activities.id, id));

  revalidatePath("/");
  return { ok: true };
}
