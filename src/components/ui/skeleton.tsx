import { cn } from "@/lib/utils";

/** Bloco de placeholder com shimmer. Usado nas telas de loading. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}
