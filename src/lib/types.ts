import type {
  Assignee,
  Journey,
  Knowledge,
  KnowledgeKind,
  OmError,
  OmErrorStatus,
  Stage,
} from "@/db/schema";

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

/** Rótulos dos tipos de conhecimento, na ordem em que aparecem nos filtros. */
export const KNOWLEDGE_KINDS: { id: KnowledgeKind; label: string }[] = [
  { id: "procedimento", label: "Procedimento" },
  { id: "erro", label: "Erro conhecido" },
  { id: "regra", label: "Regra/Combinado" },
  { id: "contato", label: "Contato" },
];

export const kindLabel = (kind: KnowledgeKind) =>
  KNOWLEDGE_KINDS.find((k) => k.id === kind)?.label ?? kind;

export type KnowledgeBootstrap = {
  journeys: Journey[];
  items: Knowledge[];
};

/** Status dos Erros OM, na ordem do fluxo. */
export const OM_ERROR_STATUSES: { id: OmErrorStatus; label: string }[] = [
  { id: "analise", label: "Em análise" },
  { id: "enderecado", label: "Endereçado" },
  { id: "corrigido", label: "Corrigido" },
];

export const omStatusLabel = (status: OmErrorStatus) =>
  OM_ERROR_STATUSES.find((s) => s.id === status)?.label ?? status;

export type OmErrorsBootstrap = {
  journeys: Journey[];
  items: OmError[];
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
