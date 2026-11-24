import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1400px]">
        <Skeleton className="mb-2 h-8 w-48 rounded-md" />
        <Skeleton className="mb-4 h-4 w-72 rounded" />
        <Skeleton className="mb-3 h-11 w-full rounded-md" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-72 shrink-0 rounded-lg bg-[var(--color-muted)] p-2"
            >
              <Skeleton className="mb-2 h-5 w-32 rounded" />
              {Array.from({ length: i === 0 ? 2 : 1 }).map((_, j) => (
                <Skeleton key={j} className="mb-2 h-20 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
