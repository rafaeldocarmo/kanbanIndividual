"use server";

import { db } from "@/db/client";
import { knowledge } from "@/db/schema";
import { CACHE_TAGS } from "@/db/queries";
import { getCurrentUserId } from "@/lib/current-user";
import { knowledgeInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const NO_IDENTITY = "Escolha quem você é no topo para escrever";

function revalidateKnowledge() {
  revalidateTag(CACHE_TAGS.knowledge);
  revalidatePath("/conhecimento");
}

const createSchema = knowledgeInput.extend({ id: z.string().uuid() });

/** O id vem do cliente para a UI otimista já abrir o item recém-criado. */
export async function createKnowledge(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db.insert(knowledge).values({
    id: parsed.data.id,
    title: parsed.data.title,
    content: parsed.data.content,
    journeyId: parsed.data.journeyId,
    kind: parsed.data.kind,
    createdById: me,
    updatedById: me,
  });
  revalidateKnowledge();
  return { ok: true };
}

const updateSchema = knowledgeInput.extend({ id: z.string().uuid() });

export async function updateKnowledge(input: unknown): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db
    .update(knowledge)
    .set({
      title: parsed.data.title,
      content: parsed.data.content,
      journeyId: parsed.data.journeyId,
      kind: parsed.data.kind,
      updatedAt: new Date(),
      updatedById: me,
    })
    .where(eq(knowledge.id, parsed.data.id));
  revalidateKnowledge();
  return { ok: true };
}

export async function deleteKnowledge(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "ID inválido" };
  }
  await db.delete(knowledge).where(eq(knowledge.id, id));
  revalidateKnowledge();
  return { ok: true };
}
