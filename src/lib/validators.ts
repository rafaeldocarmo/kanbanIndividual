import { z } from "zod";

/** Responsáveis de uma atividade: um ou mais (vazio = sem responsável). */
export const assigneeIds = z
  .array(z.string().uuid())
  .max(20)
  .transform((ids) => [...new Set(ids)]);

export const activityInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  stageId: z.string().uuid(),
  journeyId: z.string().uuid().optional().nullable(),
  assigneeIds: assigneeIds.default([]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  initialStatus: z.string().trim().max(500).optional().nullable(),
});

export type ActivityInput = z.infer<typeof activityInput>;

export const statusUpdateInput = z.object({
  activityId: z.string().uuid(),
  content: z.string().trim().min(1, "Status vazio").max(500),
});

export const assignInput = z.object({
  id: z.string().uuid(),
  assigneeIds,
});

export const blockedByInput = z.object({
  id: z.string().uuid(),
  // Vazio = desbloquear.
  blockedBy: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .transform((v) => v || null),
});

export const commentInput = z.object({
  activityId: z.string().uuid(),
  content: z.string().trim().min(1, "Comentário vazio").max(2000),
});

export const journeyInput = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const assigneeInput = z.object({
  name: z.string().trim().min(1).max(80),
  initials: z.string().trim().min(1).max(3),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const stageInput = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// --- Banco de Conhecimento ---

export const knowledgeInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  content: z.string().trim().min(1, "Escreva o conteúdo").max(20000),
  journeyId: z.string().uuid().nullable(),
  kind: z.enum(["procedimento", "erro", "regra", "contato"]),
});
export type KnowledgeInput = z.infer<typeof knowledgeInput>;

export const savedQueryInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  query: z.string().trim().min(1, "Escreva a query").max(20000),
});
export type SavedQueryInput = z.infer<typeof savedQueryInput>;
