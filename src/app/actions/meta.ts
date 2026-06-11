"use server";

import { db } from "@/db/client";
import { assignees, journeys, stages } from "@/db/schema";
import {
  assigneeInput,
  journeyInput,
  stageInput,
} from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createJourney(input: unknown): Promise<Result<string>> {
  const parsed = journeyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Inválido" };
  try {
    const [row] = await db
      .insert(journeys)
      .values({
        name: parsed.data.name,
        ...(parsed.data.color ? { color: parsed.data.color } : {}),
      })
      .returning({ id: journeys.id });
    revalidatePath("/");
    return { ok: true, data: row.id };
  } catch {
    return { ok: false, error: "Jornada já existe" };
  }
}

export async function createAssignee(input: unknown): Promise<Result<string>> {
  const parsed = assigneeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Inválido" };
  const [row] = await db
    .insert(assignees)
    .values({
      name: parsed.data.name,
      initials: parsed.data.initials.toUpperCase(),
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
    })
    .returning({ id: assignees.id });
  revalidatePath("/");
  return { ok: true, data: row.id };
}

export async function createStage(input: unknown): Promise<Result<string>> {
  const parsed = stageInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Inválido" };
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(position), 0)` })
    .from(stages);
  const [row] = await db
    .insert(stages)
    .values({
      name: parsed.data.name,
      position: Number(maxRow?.max ?? 0) + 1000,
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
    })
    .returning({ id: stages.id });
  revalidatePath("/");
  return { ok: true, data: row.id };
}
