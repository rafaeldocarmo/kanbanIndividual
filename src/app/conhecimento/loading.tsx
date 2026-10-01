import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1200px]">
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="ml-auto h-9 w-24 rounded-md" />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-full max-w-md rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-[var(--color-border)] p-2 last:border-0">
                <Skeleton className="mb-1.5 h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
            <Skeleton className="mb-3 h-5 w-1/2 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-3.5 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
