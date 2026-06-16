"use server";

import { db } from "@/db/client";
import { savedQueries } from "@/db/schema";
import { savedQueryInput } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/queries";
const uuidSchema = z.string().uuid();

function invalid(error?: string): ActionResult {
  return { ok: false, error: error ?? "Inválido" };
}

export async function createQuery(input: unknown): Promise<ActionResult> {
  const parsed = savedQueryInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db.insert(savedQueries).values({
    title: parsed.data.title,
    query: parsed.data.query,
  });
  revalidatePath(PATH);
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
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteQuery(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(savedQueries).where(eq(savedQueries.id, id));
  revalidatePath(PATH);
  return { ok: true };
}
