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
