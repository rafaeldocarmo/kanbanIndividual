"use server";

import { db } from "@/db/client";
import { savedQueries } from "@/db/schema";
import { CACHE_TAGS, topPositionForQuery } from "@/db/queries";
import { savedQueryInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/queries";
const uuidSchema = z.string().uuid();

function revalidateQueries() {
  revalidateTag(CACHE_TAGS.queries);
  revalidatePath(PATH);
}

function invalid(error?: string): ActionResult {
  return { ok: false, error: error ?? "Inválido" };
}

export async function createQuery(input: unknown): Promise<ActionResult> {
  const parsed = savedQueryInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const position = await topPositionForQuery();
  await db.insert(savedQueries).values({
    title: parsed.data.title,
    query: parsed.data.query,
    position: position.toString(),
  });
  revalidateQueries();
  return { ok: true };
}

const updateQuerySchema = savedQueryInput.extend({ id: uuidSchema });

export async function updateQuery(input: unknown): Promise<ActionResult> {
  const parsed = updateQuerySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db
    .update(savedQueries)
    .set({
      title: parsed.data.title,
      query: parsed.data.query,
      updatedAt: new Date(),
    })
    .where(eq(savedQueries.id, parsed.data.id));
  revalidateQueries();
  return { ok: true };
}

export async function deleteQuery(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(savedQueries).where(eq(savedQueries.id, id));
  revalidateQueries();
  return { ok: true };
}

const moveSchema = z.object({
  id: uuidSchema,
  beforeId: uuidSchema.optional().nullable(),
  afterId: uuidSchema.optional().nullable(),
});

export async function moveQuery(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return invalid("Movimento inválido");
  const { id, beforeId, afterId } = parsed.data;

  const [beforeRow, afterRow] = await Promise.all([
    beforeId
      ? db
          .select({ position: savedQueries.position })
          .from(savedQueries)
          .where(eq(savedQueries.id, beforeId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
    afterId
      ? db
          .select({ position: savedQueries.position })
          .from(savedQueries)
          .where(eq(savedQueries.id, afterId))
          .limit(1)
      : Promise.resolve([] as { position: string }[]),
  ]);

  const beforePos = beforeRow[0]?.position ? Number(beforeRow[0].position) : null;
  const afterPos = afterRow[0]?.position ? Number(afterRow[0].position) : null;

  let newPos: number;
  if (beforePos !== null && afterPos !== null) {
    newPos = (beforePos + afterPos) / 2;
  } else if (beforePos !== null) {
    newPos = beforePos + 1000;
  } else if (afterPos !== null) {
    newPos = afterPos - 1000;
  } else {
    newPos = 1000;
  }

  await db
    .update(savedQueries)
    .set({ position: newPos.toString(), updatedAt: new Date() })
    .where(eq(savedQueries.id, id));

  revalidateQueries();
  return { ok: true };
}
