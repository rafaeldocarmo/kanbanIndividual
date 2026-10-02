import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Exceção deliberada à regra de "cor só por exceção": as três prioridades têm
// cor própria (vermelho/amarelo/azul). Tons fixos, legíveis nos dois temas.
const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#3b82f6",
};

export function priorityColor(priority: string | null | undefined) {
  return PRIORITY_COLORS[priority ?? "medium"] ?? PRIORITY_COLORS.medium;
}

/** Fractional indexing: posição entre dois vizinhos (qualquer um pode faltar). */
export function positionBetween(
  before: { position: string } | null,
  after: { position: string } | null,
): number {
  const beforePos = before ? Number(before.position) : null;
  const afterPos = after ? Number(after.position) : null;
  if (beforePos !== null && afterPos !== null) return (beforePos + afterPos) / 2;
  if (beforePos !== null) return beforePos + 1000;
  if (afterPos !== null) return afterPos - 1000;
  return 1000;
}
