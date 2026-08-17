"use server";

import { db } from "@/db/client";
import { boardCheckins, boardItems } from "@/db/schema";
import { CACHE_TAGS } from "@/db/queries";
import { boardItemInput, checkinInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/foco";
const uuidSchema = z.string().uuid();

function revalidateBoard() {
  revalidateTag(CACHE_TAGS.board);
  revalidatePath(PATH);
}

function invalid(error?: string): ActionResult {
  return { ok: false, error: error ?? "Inválido" };
}

export async function createBoardItem(input: unknown): Promise<ActionResult> {
  const parsed = boardItemInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db.insert(boardItems).values({
    title: parsed.data.title,
    detail: parsed.data.detail?.trim() || null,
    status: parsed.data.status,
  });
  revalidateBoard();
  return { ok: true };
}

const updateItemSchema = boardItemInput.extend({ id: uuidSchema });

export async function updateBoardItem(input: unknown): Promise<ActionResult> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db
    .update(boardItems)
    .set({
      title: parsed.data.title,
      detail: parsed.data.detail?.trim() || null,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(boardItems.id, parsed.data.id));
  revalidateBoard();
  return { ok: true };
}

export async function deleteBoardItem(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(boardItems).where(eq(boardItems.id, id));
  revalidateBoard();
  return { ok: true };
}

export async function toggleCheckin(input: unknown): Promise<ActionResult> {
  const parsed = checkinInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { itemId, day, checked } = parsed.data;

  if (checked) {
    await db
      .insert(boardCheckins)
      .values({ itemId, day })
      .onConflictDoNothing();
  } else {
    await db
      .delete(boardCheckins)
      .where(and(eq(boardCheckins.itemId, itemId), eq(boardCheckins.day, day)));
  }
  revalidateBoard();
  return { ok: true };
}
