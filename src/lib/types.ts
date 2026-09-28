import type { Assignee, Journey, Stage } from "@/db/schema";

export type StatusEntry = { id: string; content: string; createdAt: Date };

export type CommentEntry = {
  id: string;
  authorId: string | null;
  content: string;
  createdAt: Date;
};

export type ActivityView = {
  id: string;
  name: string;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  position: string;
  stageId: string;
  journeyId: string | null;
  /** Um ou mais responsáveis (vazio = sem responsável), na ordem da equipe. */
  assigneeIds: string[];
  blockedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
  stageName: string | null;
  stageColor: string | null;
  journeyName: string | null;
  journeyColor: string | null;
  statusUpdates: StatusEntry[];
  lastStatus: string | null;
  /** Mais antigo → mais recente (ordem de conversa). */
  comments: CommentEntry[];
};

export type GroupBy = "status" | "journey" | "assignee";
export type ViewMode = "list" | "board";
export type Scope = "team" | "mine";
export type Lanes = "none" | "person";

export type BootstrapData = {
  stages: Stage[];
  journeys: Journey[];
  assignees: Assignee[];
  activities: ActivityView[];
};
