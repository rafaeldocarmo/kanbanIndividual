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
