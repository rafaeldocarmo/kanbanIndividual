"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  color,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  const bg = color ? `${color}22` : "var(--color-accent)";
  const fg = color ?? "var(--color-foreground)";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={color ? { backgroundColor: bg, color: fg } : undefined}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Avatar da pessoa. A cor (matiz) é o único lugar onde a identidade de cada
 * um aparece — não espalhar pelo resto da interface. Sem `hue` = ninguém.
 */
export function Avatar({
  initials,
  hue,
  size = 24,
  title,
  className,
  style,
}: {
  initials?: string;
  hue?: number;
  size?: number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const empty = hue === undefined;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        empty &&
          "border border-dashed border-[var(--color-muted-foreground)]/50 text-[var(--color-muted-foreground)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.4)),
        ...(empty
          ? null
          : {
              backgroundColor: `oklch(var(--avatar-l) var(--avatar-c) ${hue})`,
              color: `oklch(var(--avatar-fg-l) var(--avatar-fg-c) ${hue})`,
            }),
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

export function PriorityBubble({
  color,
  size = 10,
  title,
}: {
  color: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      aria-hidden
      title={title}
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}
