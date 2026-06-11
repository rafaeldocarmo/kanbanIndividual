"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90",
  outline:
    "border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)]",
  ghost: "hover:bg-[var(--color-accent)]",
  subtle: "bg-[var(--color-muted)] hover:bg-[var(--color-accent)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  icon: "h-8 w-8 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
