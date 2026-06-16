import { z } from "zod";

export const activityInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  stageId: z.string().uuid(),
  journeyId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  initialStatus: z.string().trim().max(500).optional().nullable(),
});

export type ActivityInput = z.infer<typeof activityInput>;

export const statusUpdateInput = z.object({
  activityId: z.string().uuid(),
  content: z.string().trim().min(1, "Status vazio").max(500),
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

// --- Notas & Lembretes ---

export const noteInput = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().min(1, "Escreva algo").max(5000),
});
export type NoteInput = z.infer<typeof noteInput>;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .optional()
  .nullable();

export const reminderInput = z.object({
  content: z.string().trim().min(1, "Escreva um lembrete").max(300),
  dueDate: dateString,
  done: z.boolean().optional(),
});
export type ReminderInput = z.infer<typeof reminderInput>;

export const linkInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  url: z.string().trim().min(1, "URL obrigatória").max(2048),
  category: z.string().trim().max(80).optional().nullable(),
});
export type LinkInput = z.infer<typeof linkInput>;

export const savedQueryInput = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  query: z.string().trim().min(1, "Escreva a query").max(20000),
});
export type SavedQueryInput = z.infer<typeof savedQueryInput>;
