"use server";

import { db } from "@/db/client";
import { omErrors } from "@/db/schema";
import { CACHE_TAGS } from "@/db/queries";
import { getCurrentUserId } from "@/lib/current-user";
import { omErrorInput, omErrorStatusInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const NO_IDENTITY = "Escolha quem você é no topo para escrever";

function revalidateOmErrors() {
  revalidateTag(CACHE_TAGS.omErrors);
  revalidatePath("/conhecimento/erros");
}

/** Hoje em "YYYY-MM-DD" no fuso de São Paulo. */
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const createSchema = z.object({
  id: z.string().uuid(),
  symptom: z.string().trim().min(1, "Descreva o erro").max(300),
});

/** Registro rápido: só o sintoma, o resto se completa depois. */
export async function createOmError(input: unknown): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  await db.insert(omErrors).values({
    id: parsed.data.id,
    symptom: parsed.data.symptom,
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
    .set({
      ...values,
      // A data só faz sentido quando o erro está corrigido.
      fixedAt: values.status === "corrigido" ? values.fixedAt : null,
      updatedAt: new Date(),
      updatedById: me,
    })
    .where(eq(omErrors.id, id));
  revalidateOmErrors();
  return { ok: true };
}

/** Trilha de status: um clique move o erro, sem abrir o formulário. */
export async function setOmErrorStatus(input: unknown): Promise<ActionResult> {
  const parsed = omErrorStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Status inválido" };
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: NO_IDENTITY };
  const corrigido = parsed.data.status === "corrigido";
  await db
    .update(omErrors)
    .set({
      status: parsed.data.status,
      // Corrigir carimba hoje, mas respeita uma data já informada; voltar
      // atrás limpa.
      fixedAt: corrigido
        ? sql`coalesce(${omErrors.fixedAt}, ${today()}::date)`
        : null,
      updatedAt: new Date(),
      updatedById: me,
    })
    .where(eq(omErrors.id, parsed.data.id));
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
