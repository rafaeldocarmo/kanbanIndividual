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

export function Avatar({
  initials,
  color,
  size = 24,
  title,
}: {
  initials: string;
  color?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: color ? `${color}33` : "var(--color-accent)",
        color: color ?? "var(--color-foreground)",
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
