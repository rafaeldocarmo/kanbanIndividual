"use server";

import { db } from "@/db/client";
import { links, notes, reminders } from "@/db/schema";
import { CACHE_TAGS } from "@/db/queries";
import { linkInput, noteInput, reminderInput } from "@/lib/validators";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/notas";
const uuidSchema = z.string().uuid();

/**
 * A página /notas carrega notas, lembretes e links juntos, então uma mutação
 * invalida os três (mesmo conjunto de queries que a página já faz) + a rota.
 */
function revalidateNotas() {
  revalidateTag(CACHE_TAGS.notes);
  revalidateTag(CACHE_TAGS.reminders);
  revalidateTag(CACHE_TAGS.links);
  revalidatePath(PATH);
}

function invalid(error?: string): ActionResult {
  return { ok: false, error: error ?? "Inválido" };
}

// --- Notas ---

export async function createNote(input: unknown): Promise<ActionResult> {
  const parsed = noteInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db.insert(notes).values({
    title: parsed.data.title?.trim() || null,
    content: parsed.data.content,
  });
  revalidateNotas();
  return { ok: true };
}

const updateNoteSchema = noteInput.extend({ id: uuidSchema });

export async function updateNote(input: unknown): Promise<ActionResult> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db
    .update(notes)
    .set({
      title: parsed.data.title?.trim() || null,
      content: parsed.data.content,
      updatedAt: new Date(),
    })
    .where(eq(notes.id, parsed.data.id));
  revalidateNotas();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(notes).where(eq(notes.id, id));
  revalidateNotas();
  return { ok: true };
}

// --- Lembretes ---

export async function createReminder(input: unknown): Promise<ActionResult> {
  const parsed = reminderInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db.insert(reminders).values({
    content: parsed.data.content,
    dueDate: parsed.data.dueDate ?? null,
    done: parsed.data.done ?? false,
  });
  revalidateNotas();
  return { ok: true };
}

const updateReminderSchema = reminderInput.extend({ id: uuidSchema });

export async function updateReminder(input: unknown): Promise<ActionResult> {
  const parsed = updateReminderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db
    .update(reminders)
    .set({
      content: parsed.data.content,
      dueDate: parsed.data.dueDate ?? null,
      done: parsed.data.done ?? false,
      updatedAt: new Date(),
    })
    .where(eq(reminders.id, parsed.data.id));
  revalidateNotas();
  return { ok: true };
}

export async function toggleReminder(
  id: string,
  done: boolean,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db
    .update(reminders)
    .set({ done, updatedAt: new Date() })
    .where(eq(reminders.id, id));
  revalidateNotas();
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(reminders).where(eq(reminders.id, id));
  revalidateNotas();
  return { ok: true };
}

// --- Links ---

export async function createLink(input: unknown): Promise<ActionResult> {
  const parsed = linkInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db.insert(links).values({
    title: parsed.data.title,
    url: parsed.data.url,
    category: parsed.data.category?.trim() || null,
  });
  revalidateNotas();
  return { ok: true };
}

const updateLinkSchema = linkInput.extend({ id: uuidSchema });

export async function updateLink(input: unknown): Promise<ActionResult> {
  const parsed = updateLinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  await db
    .update(links)
    .set({
      title: parsed.data.title,
      url: parsed.data.url,
      category: parsed.data.category?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(links.id, parsed.data.id));
  revalidateNotas();
  return { ok: true };
}

export async function deleteLink(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return invalid("ID inválido");
  await db.delete(links).where(eq(links.id, id));
  revalidateNotas();
  return { ok: true };
}
