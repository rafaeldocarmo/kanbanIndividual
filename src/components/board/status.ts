import type { BoardStatus } from "@/db/schema";

export const BOARD_STATUS: Record<
  BoardStatus,
  { label: string; color: string }
> = {
  risco: { label: "Risco", color: "#ef4444" },
  atencao: { label: "Atenção", color: "#f59e0b" },
  em_dia: { label: "Em dia", color: "#10b981" },
};

export const STATUS_ORDER: BoardStatus[] = ["risco", "atencao", "em_dia"];
