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

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#3b82f6",
};

export function priorityColor(priority: string | null | undefined) {
  return PRIORITY_COLORS[priority ?? "medium"] ?? PRIORITY_COLORS.medium;
}

const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** Data curta no formato "11 jun" (pt-BR), aceita Date, ISO ou "YYYY-MM-DD". */
export function formatShortDate(value: Date | string | null | undefined) {
  if (!value) return "";
  let d: Date;
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    // Datas "YYYY-MM-DD" são interpretadas como locais (evita shift de fuso).
    d = m
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      : new Date(value);
  } else {
    d = value;
  }
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

// --- Mural "Foco do dia": dias e sequência ---

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** "YYYY-MM-DD" no fuso informado (padrão America/Sao_Paulo). */
export function isoDay(date: Date = new Date(), tz = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DayCell = { iso: string; label: string; isToday: boolean };

/** Os últimos `n` dias terminando em `todayIso` (mais antigo → hoje). */
export function buildDayStrip(todayIso: string, n = 7): DayCell[] {
  const today = parseIso(todayIso);
  const cells: DayCell[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toIsoLocal(d);
    cells.push({
      iso,
      label: WEEKDAY_INITIALS[d.getDay()],
      isToday: iso === todayIso,
    });
  }
  return cells;
}

/**
 * Sequência de dias consecutivos conferidos terminando hoje. Se hoje ainda não
 * foi conferido, conta a partir de ontem (período de tolerância do dia atual).
 */
export function computeStreak(days: Set<string>, todayIso: string): number {
  const cursor = parseIso(todayIso);
  if (!days.has(todayIso)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toIsoLocal(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Garante um protocolo para abrir o link em nova aba com segurança. */
export function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Domínio/host exibido como subtítulo do link. */
export function linkDomain(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^[a-z]+:\/\//i, "").split("/")[0] ?? url;
  }
}
