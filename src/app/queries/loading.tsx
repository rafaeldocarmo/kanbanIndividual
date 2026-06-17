import { Skeleton } from "@/components/ui/skeleton";

/** Loading instantâneo da página de Queries. */
export default function Loading() {
  return (
    <div className="min-h-full bg-[var(--color-canvas)] px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1200px]">
        <Skeleton className="mb-6 h-8 w-48 rounded-md" />

        {/* Composer */}
        <Skeleton className="h-28 w-full rounded-xl" />

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-9 w-full max-w-[16rem] rounded-md" />
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="mb-1.5 h-12 w-full rounded-lg last:mb-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
