import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="mb-2 h-8 w-40 rounded-md" />
      <Skeleton className="mb-4 h-4 w-80 rounded" />
      <Skeleton className="mb-3 h-11 w-full rounded-md" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-[var(--color-border)] p-2 last:border-0"
            >
              <Skeleton className="mb-1.5 h-4 w-4/5 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
          <Skeleton className="mb-3 h-5 w-2/3 rounded" />
          <Skeleton className="mb-4 h-7 w-56 rounded-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-3.5 w-full rounded" />
          ))}
        </div>
      </div>
    </>
  );
}
